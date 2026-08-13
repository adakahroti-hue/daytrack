"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const goalSchema = z.object({
  tanggal_set: z.string().min(1, "Tanggal set wajib diisi"),
  tanggal_deadline: z.string().optional(),
  nama_goal: z.string().optional().default(""),
  proyeksi_harga: z.number().int().nonnegative(),
  tempo: z.string().optional().default(""),
  action_harian: z.string().optional().default(""),
  langkah_aksi: z.string().optional().default(""),
})

export type GoalFormData = z.infer<typeof goalSchema>

export interface GoalEntry {
  id: string
  user_id: string
  tanggal_set: string
  tanggal_deadline: string
  nama_goal: string
  proyeksi_harga: number
  tempo: string | null
  action_harian: string | null
  langkah_aksi: string | null
  is_utama: boolean
  created_at: string
  updated_at: string
}

export async function createGoal(formData: GoalFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = goalSchema.parse(formData)
  const insertData = {
    user_id: user.id,
    tanggal_set: validated.tanggal_set,
    tanggal_deadline: validated.tanggal_deadline || new Date().toISOString().slice(0, 10),
    nama_goal: validated.nama_goal,
    proyeksi_harga: validated.proyeksi_harga,
    tempo: validated.tempo ?? "",
    action_harian: validated.action_harian ?? "",
    langkah_aksi: validated.langkah_aksi ?? "",
  }

  const { data, error } = await supabase.from("goal").insert(insertData).select().single()
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { data, error: null }
}

export async function updateGoal(
  id: string,
  formData: {
    tanggal_set?: string
    tanggal_deadline?: string
    nama_goal?: string
    proyeksi_harga?: number
    tempo?: string
    action_harian?: string
    langkah_aksi?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const updateData: Record<string, any> = {}
  if (formData.tanggal_set !== undefined) updateData.tanggal_set = formData.tanggal_set
  if (formData.tanggal_deadline !== undefined) updateData.tanggal_deadline = formData.tanggal_deadline
  if (formData.nama_goal !== undefined) updateData.nama_goal = formData.nama_goal
  if (formData.proyeksi_harga !== undefined) updateData.proyeksi_harga = formData.proyeksi_harga
  if (formData.tempo !== undefined) updateData.tempo = formData.tempo
  if (formData.action_harian !== undefined) updateData.action_harian = formData.action_harian
  if (formData.langkah_aksi !== undefined) updateData.langkah_aksi = formData.langkah_aksi

  const { data, error } = await supabase
    .from("goal")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { data, error: null }
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("goal").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { error: null }
}

// ── GOAL UTAMA (tabel terpisah) ──
export async function getGoalRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("goal")
    .select("id, user_id, tanggal_set, tanggal_deadline, nama_goal, proyeksi_harga, tempo, action_harian, langkah_aksi, is_utama, created_at, updated_at")
    .eq("user_id", user.id)
    .gte("tanggal_set", startDate)
    .lte("tanggal_set", endDate)
    .order("tanggal_set", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

// ── GOAL UTAMA (tabel terpisah) ──
export interface GoalUtamaEntry {
  id: string
  user_id: string
  tanggal_set: string
  tanggal_deadline: string
  nama_goal: string
  tempo: string | null
  action_harian: string | null
  langkah_aksi: string | null
  group_id: string | null
  created_at: string
  updated_at: string
}

const GOAL_UTAMA_SELECT = "id, user_id, tanggal_set, tanggal_deadline, nama_goal, tempo, action_harian, langkah_aksi, group_id, created_at, updated_at"

export async function getGoalUtama(): Promise<GoalUtamaEntry | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("goal_utama")
    .select(GOAL_UTAMA_SELECT)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as GoalUtamaEntry) || null
}

// Promote: pindahkan 1 goal dari tabel `goal` ke `goal_utama` (hanya 1 baris utama per user)
export async function promoteGoal(
  id: string,
  formData: {
    tempo?: string
    action_harian?: string
    langkah_aksi?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // 1. Ambil goal asli (lengkap)
  const { data: src, error: srcErr } = await supabase
    .from("goal")
    .select("user_id, tanggal_set, tanggal_deadline, nama_goal, tempo, action_harian, langkah_aksi")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()
  if (srcErr) throw new Error(srcErr.message)
  if (!src) throw new Error("Goal tidak ditemukan")

  // 2. Hapus goal_utama lama milik user (user cuma punya 1)
  const { error: delErr } = await supabase
    .from("goal_utama")
    .delete()
    .eq("user_id", user.id)
  if (delErr) throw new Error(delErr.message)

  // 3. Insert ke goal_utama (dengan field pelengkap dari formData)
  const { data: inserted, error: insErr } = await supabase
    .from("goal_utama")
    .insert({
      user_id: user.id,
      tanggal_set: src.tanggal_set,
      tanggal_deadline: src.tanggal_deadline,
      nama_goal: src.nama_goal,
      tempo: formData.tempo ?? src.tempo ?? "",
      action_harian: formData.action_harian ?? src.action_harian ?? "",
      langkah_aksi: formData.langkah_aksi ?? src.langkah_aksi ?? "",
      group_id: null,
    })
    .select(GOAL_UTAMA_SELECT)
    .single()
  if (insErr) throw new Error(insErr.message)

  // 4. Hapus goal asli dari tabel goal biasa (sudah dipindah)
  const { error: rmErr } = await supabase
    .from("goal")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (rmErr) throw new Error(rmErr.message)

  revalidatePath("/goal")
  revalidatePath("/overview")
  return { data: inserted, error: null }
}

// Update goal utama (edit dari card atas)
export async function updateGoalUtama(
  id: string,
  formData: {
    tanggal_set?: string
    tanggal_deadline?: string
    nama_goal?: string
    tempo?: string
    action_harian?: string
    langkah_aksi?: string
    group_id?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const updateData: Record<string, any> = {}
  if (formData.tanggal_set !== undefined) updateData.tanggal_set = formData.tanggal_set
  if (formData.tanggal_deadline !== undefined) updateData.tanggal_deadline = formData.tanggal_deadline
  if (formData.nama_goal !== undefined) updateData.nama_goal = formData.nama_goal
  if (formData.tempo !== undefined) updateData.tempo = formData.tempo
  if (formData.action_harian !== undefined) updateData.action_harian = formData.action_harian
  if (formData.langkah_aksi !== undefined) updateData.langkah_aksi = formData.langkah_aksi
  if (formData.group_id !== undefined) updateData.group_id = formData.group_id

  const { data, error } = await supabase
    .from("goal_utama")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(GOAL_UTAMA_SELECT)
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  revalidatePath("/overview")
  return { data, error: null }
}

// Hapus goal utama (kembali ke "belum ada goal utama")
export async function deleteGoalUtama(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("goal_utama")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  revalidatePath("/overview")
  return { error: null }
}

