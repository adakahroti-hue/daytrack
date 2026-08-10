"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const quranLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  waktu_baca: z.enum(["setelah_subuh", "setelah_dzuhur", "setelah_ashar", "setelah_maghrib", "setelah_isya"]),
  status: z.string().optional(),
  kualitas: z.number().int().min(1).max(5).optional(),
})

export type QuranLogFormData = z.infer<typeof quranLogSchema>

export interface QuranLogEntry {
  id: string
  user_id: string
  tanggal: string
  waktu_baca: string
  status: string | null
  kualitas: number | null
  created_at: string
  updated_at: string
}

export async function upsertQuranLog(formData: QuranLogFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = quranLogSchema.parse(formData)

  const { data: existing } = await supabase
    .from("quran")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .eq("waktu_baca", validated.waktu_baca)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    waktu_baca: validated.waktu_baca,
    status: validated.status || null,
    kualitas: validated.kualitas || null,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("quran")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("quran")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/quran")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")

  return { data, error: null }
}

export async function deleteQuranLog(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("quran")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/quran")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")

  return { error: null }
}

export async function getQuranLog(tanggal: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("quran")
    .select("id, user_id, tanggal, waktu_baca, status, kualitas, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .order("waktu_baca", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getQuranLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("quran")
    .select("id, user_id, tanggal, waktu_baca, status, kualitas, created_at, updated_at")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getQuranDailySummary(tanggal: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("quran")
    .select("status")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)

  if (error) throw new Error(error.message)

  const sudahCount = data?.filter(d => d.status === 'sudah').length || 0
  const totalCount = data?.length || 0

  return { sudahCount, totalCount, persentase: totalCount > 0 ? Math.round((sudahCount / totalCount) * 100) : 0 }
}
