"use server"

// Server action KHUSUS tab Prioritas — memakai tabel TERPISAH
// `public.tugas_prioritas` (bukan `tugas`). Tab Semua / Hari Ini / Overview
// tidak pernah menyentuh tabel ini (terpisah total, sesuai permintaan).

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const prioritasSchema = z.object({
  nama: z.string().min(1, "Nama tugas wajib diisi"),
  tanggal: z.string().optional(),
  estimasi_menit: z.number().int().min(0).default(0),
  prioritas: z.enum(["p1", "p2", "p3", "p4"]).default("p3"),
  status: z.enum(["proses", "belum", "selesai"]).default("belum"),
  jenjang: z.enum(["primer", "sekunder"]).default("primer"),
  group_id: z.string().uuid().nullable().optional(),
  group_order: z.number().int().nullable().optional(),
})

export type TugasPrioritasFormData = z.infer<typeof prioritasSchema>

const REVALIDATE = () => {
  revalidatePath("/tugas/prioritas")
}

export async function createTugasPrioritas(formData: TugasPrioritasFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Unauthorized" as string }

  const validated = prioritasSchema.parse(formData)

  const { data, error } = await supabase
    .from("tugas_prioritas")
    .insert({ ...validated, user_id: user.id })
    .select()
    .single()

  if (error) {
    // Tabel belum dibuat (migrasi belum dijalankan) → pesan jelas
    const msg = error.code === "42P01"
      ? "Tabel tugas_prioritas belum ada — jalankan migrasi SQL 20261018000002 di Supabase"
      : error.message
    return { data: null, error: msg as string }
  }

  REVALIDATE()
  return { data, error: null }
}

export async function updateTugasPrioritas(id: string, formData: Partial<TugasPrioritasFormData>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = prioritasSchema.partial().parse(formData)

  const { data, error } = await supabase
    .from("tugas_prioritas")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message as string }

  REVALIDATE()
  return { data, error: null }
}

export async function deleteTugasPrioritas(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("tugas_prioritas")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  REVALIDATE()
  return { error: null }
}

export async function bulkDeleteTugasPrioritas(ids: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  if (!ids || ids.length === 0) return { error: null }

  const { error } = await supabase
    .from("tugas_prioritas")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  REVALIDATE()
  return { error: null }
}

/** Catatan yang sama dengan toggleTaskStatus di tabel tugas. */
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

export async function toggleTugasPrioritasStatus(id: string, status: "proses" | "belum" | "selesai") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const now = new Date().toISOString()
  const updateData: {
    status: string
    started_at?: string | null
    completed_at?: string | null
    accumulated_seconds?: number
    is_paused?: boolean
    last_resumed_at?: string | null
  } = { status }

  if (status === "proses") {
    updateData.started_at = now
    updateData.completed_at = null
    updateData.accumulated_seconds = 0
    updateData.is_paused = false
    updateData.last_resumed_at = now
  } else if (status === "selesai") {
    updateData.completed_at = now
    updateData.is_paused = false
    updateData.last_resumed_at = null
    const { data: existing } = await supabase
      .from("tugas_prioritas")
      .select("accumulated_seconds, is_paused, last_resumed_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
    updateData.accumulated_seconds = computeActiveSeconds(existing || {})
  } else {
    updateData.started_at = null
    updateData.completed_at = null
    updateData.accumulated_seconds = 0
    updateData.is_paused = false
    updateData.last_resumed_at = null
  }

  const { data, error } = await supabase
    .from("tugas_prioritas")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  REVALIDATE()
  return { data, error: null }
}