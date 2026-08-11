"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const taskSchema = z.object({
  nama: z.string().min(1, "Nama tugas wajib diisi"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  estimasi_menit: z.number().int().min(0).default(0),
  prioritas: z.enum(["p1", "p2", "p3", "p4"]).default("p3"),
  status: z.enum(["proses", "belum", "selesai"]).default("belum"),
  // Revisi batch 12: penanda paket tugas (parent/child/single)
  group_id: z.string().uuid().nullable().optional(),
  group_order: z.number().int().nullable().optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>

const TASK_SELECT = "id, user_id, nama, tanggal, estimasi_menit, prioritas, status, created_at, updated_at, started_at, completed_at, accumulated_seconds, is_paused, last_resumed_at, group_id, group_order"

export async function createTask(formData: TaskFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Unauthorized" as string }

  const validated = taskSchema.parse(formData)

  const { data, error } = await supabase
    .from("tugas")
    .insert({
      ...validated,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message as string }

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/overview")

  return { data, error: null }
}

export async function updateTask(id: string, formData: Partial<TaskFormData>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = taskSchema.partial().parse(formData)

  const { data, error } = await supabase
    .from("tugas")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message as string }

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/overview")

  return { data, error: null }
}

export async function deleteTask(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("tugas")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/overview")

  return { error: null }
}

export async function bulkDeleteTasks(ids: string[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("tugas")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/tugas/selesai")
  revalidatePath("/overview")

  return { error: null }
}

export async function bulkResetTasks(ids: string[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("tugas")
    .update({ status: 'belum', started_at: null, completed_at: null, accumulated_seconds: 0, is_paused: false, last_resumed_at: null })
    .in("id", ids)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/tugas/selesai")
  revalidatePath("/overview")

  return { error: null }
}

export async function bulkUpdateTaskDate(ids: string[], tanggal: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  if (!tanggal) throw new Error("Tanggal wajib diisi")
  if (!ids || ids.length === 0) return { error: null }

  const { error } = await supabase
    .from("tugas")
    .update({ tanggal })
    .in("id", ids)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/tugas/selesai")
  revalidatePath("/overview")

  return { error: null }
}

/**
 * Hitung detik aktif yang sudah berjalan untuk tugas yang sedang proses.
 * accumulated_seconds = total detik aktif sebelum pause terakhir,
 * ditambah selisih last_resumed_at -> sekarang bila sedang tidak paused.
 */
function computeActiveSeconds(task: {
  accumulated_seconds?: number | null
  is_paused?: boolean | null
  last_resumed_at?: string | null
}): number {
  const base = task.accumulated_seconds || 0
  if (task.is_paused || !task.last_resumed_at) return base
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(task.last_resumed_at).getTime()) / 1000))
  return base + elapsed
}

export async function toggleTaskStatus(id: string, status: "proses" | "belum" | "selesai") {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const now = new Date().toISOString()

  let updateData: {
    status: string
    started_at?: string | null
    completed_at?: string | null
    accumulated_seconds?: number
    is_paused?: boolean
    last_resumed_at?: string | null
  } = { status }

  if (status === 'proses') {
    // Mulai mengerjakan: reset timer aktif, catat waktu mulai
    updateData.started_at = now
    updateData.completed_at = null
    updateData.accumulated_seconds = 0
    updateData.is_paused = false
    updateData.last_resumed_at = now
  } else if (status === 'selesai') {
    // Selesaikan: simpan total detik aktif (tanpa waktu pause)
    updateData.completed_at = now
    updateData.is_paused = false
    updateData.last_resumed_at = null
    // Ambil data lama dulu agar accumulated_seconds akurat
    const { data: existing } = await supabase
      .from("tugas")
      .select("accumulated_seconds, is_paused, last_resumed_at, group_id, group_order")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
    updateData.accumulated_seconds = computeActiveSeconds(existing || {})
  } else if (status === 'belum') {
    // Reset waktu bila kembali ke belum
    updateData.started_at = null
    updateData.completed_at = null
    updateData.accumulated_seconds = 0
    updateData.is_paused = false
    updateData.last_resumed_at = null
  }

  const { data, error } = await supabase
    .from("tugas")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/overview")

  return { data, error: null }
}

/**
 * Pause tugas yang sedang dikerjakan.
 * Menyimpan akumulasi detik aktif hingga titik pause.
 */
export async function pauseTask(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: existing, error: fetchError } = await supabase
    .from("tugas")
    .select("status, accumulated_seconds, is_paused, last_resumed_at, group_id, group_order")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError) throw new Error(fetchError.message)
  if (existing.status !== 'proses' || existing.is_paused) {
    return { data: existing, error: null }
  }

  const accumulated = computeActiveSeconds(existing)

  const { data, error } = await supabase
    .from("tugas")
    .update({ is_paused: true, accumulated_seconds: accumulated, last_resumed_at: null })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/overview")

  return { data, error: null }
}

/**
 * Resume tugas yang sedang paused. Timer aktif dihitung dari saat ini.
 */
export async function resumeTask(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: existing, error: fetchError } = await supabase
    .from("tugas")
    .select("status, is_paused")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError) throw new Error(fetchError.message)
  if (existing.status !== 'proses' || !existing.is_paused) {
    return { data: existing, error: null }
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("tugas")
    .update({ is_paused: false, last_resumed_at: now })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/overview")

  return { data, error: null }
}

// Jadwalkan ulang otomatis tugas yang terlewat (tanggal < hari ini, belum selesai)
// ke hari ini, dengan catatan tanggal aslinya di kolom terlewat_tanggal.
export async function rescheduleMissedTasks(today: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: missed, error } = await supabase
    .from("tugas")
    .select("id, tanggal")
    .eq("user_id", user.id)
    .neq("status", "selesai")
    .lt("tanggal", today)
    .is("terlewat_tanggal", null)

  if (error) throw new Error(error.message)
  if (!missed || missed.length === 0) return { rescheduled: 0 }

  const results = await Promise.all(
    missed.map((t) =>
      supabase
        .from("tugas")
        .update({ tanggal: today, terlewat_tanggal: t.tanggal })
        .eq("id", t.id)
        .eq("user_id", user.id)
    )
  )
  const failed = results.filter((r) => r.error)
  if (failed.length > 0) throw new Error(failed[0].error?.message || "Gagal menjadwal ulang")

  return { rescheduled: missed.length }
}

export async function getTasks(date?: string, status?: string, limit?: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  let query = supabase
    .from("tugas")
    .select(TASK_SELECT)
    .eq("user_id", user.id)

  if (date) {
    // Filter by date only (tanggal is DATE type)
    query = query.eq("tanggal", date)
    // When filtering by specific date, order by created_at (more meaningful than tanggal which is same)
    query = query.order("created_at", { ascending: true })
  } else {
    // No date filter: fetch most recent tasks first, apply limit
    query = query.order("created_at", { ascending: false })
    // Default limit: 50 for Semua page (was unlimited before)
    query = query.limit(limit ?? 50)
  }

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data || []
}

export async function getTaskById(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("tugas")
    .select(TASK_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error) throw new Error(error.message)
  return data
}
