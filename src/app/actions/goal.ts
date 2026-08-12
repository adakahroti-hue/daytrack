"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const goalSchema = z.object({
  tanggal_set: z.string().min(1, "Tanggal set wajib diisi"),
  tanggal_deadline: z.string().optional(),
  nama_goal: z.string().min(1, "Nama goal wajib diisi"),
  proyeksi_harga: z.number().int().nonnegative(),
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
  action_harian: string | null
  langkah_aksi: string | null
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

export async function getGoalRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("goal")
    .select("id, user_id, tanggal_set, tanggal_deadline, nama_goal, proyeksi_harga, action_harian, langkah_aksi, created_at, updated_at")
    .eq("user_id", user.id)
    .gte("tanggal_set", startDate)
    .lte("tanggal_set", endDate)
    .order("tanggal_set", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}
