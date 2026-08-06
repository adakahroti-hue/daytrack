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
})

export type TaskFormData = z.infer<typeof taskSchema>

export async function createTask(formData: TaskFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = taskSchema.parse(formData)

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...validated,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

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
    .from("tasks")
    .update(validated)
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

export async function deleteTask(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("tasks")
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
    .from("tasks")
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
    .from("tasks")
    .update({ status: 'belum', started_at: null, completed_at: null })
    .in("id", ids)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/tugas/selesai")
  revalidatePath("/overview")

  return { error: null }
}

export async function toggleTaskStatus(id: string, status: "proses" | "belum" | "selesai") {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const now = new Date().toISOString()

  let updateData: { status: string; started_at?: string | null; completed_at?: string | null } = { status }

  if (status === 'proses') {
    // Capture start time when task is picked up
    updateData.started_at = now
  } else if (status === 'selesai') {
    // Capture completion time when task is marked done
    updateData.completed_at = now
  } else if (status === 'belum') {
    // Reset times when going back to belum
    updateData.started_at = null
    updateData.completed_at = null
  }

  const { data, error } = await supabase
    .from("tasks")
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

// Jadwalkan ulang otomatis tugas yang terlewat (tanggal < hari ini, belum selesai)
// ke hari ini, dengan catatan tanggal aslinya di kolom terlewat_tanggal.
export async function rescheduleMissedTasks(today: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: missed, error } = await supabase
    .from("tasks")
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
        .from("tasks")
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

  // Only select fields the client actually needs — reduces payload size
  const selectFields = "id, user_id, nama, tanggal, estimasi_menit, prioritas, status, created_at, updated_at, started_at, completed_at"

  let query = supabase
    .from("tasks")
    .select(selectFields)
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
    .from("tasks")
    .select("id, user_id, nama, tanggal, estimasi_menit, prioritas, status, created_at, updated_at, started_at, completed_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error) throw new Error(error.message)
  return data
}