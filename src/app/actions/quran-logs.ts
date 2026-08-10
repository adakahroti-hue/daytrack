"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const quranLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  waktu_baca: z.enum(["setelah_subuh", "setelah_dzuhur", "setelah_ashar", "setelah_maghrib", "setelah_isya"]),
  surat: z.string().optional(),
  juz: z.number().int().min(1).max(30).optional(),
  halaman_mulai: z.number().int().min(1).max(604).optional(),
  halaman_selesai: z.number().int().min(1).max(604).optional(),
  jumlah_halaman: z.number().int().min(0).max(604).optional(),
  catatan: z.string().optional(),
  kualitas: z.number().int().min(1).max(5).optional(),
})

export type QuranLogFormData = z.infer<typeof quranLogSchema>

export interface QuranLogEntry {
  id: string
  user_id: string
  tanggal: string
  waktu_baca: string
  surat: string | null
  juz: number | null
  halaman_mulai: number | null
  halaman_selesai: number | null
  jumlah_halaman: number | null
  catatan: string | null
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

  // Hitung jumlah_halaman: pakai nilai eksplisit bila ada, else dari rentang halaman
  const jumlahHalaman =
    validated.jumlah_halaman ??
    (validated.halaman_mulai && validated.halaman_selesai && validated.halaman_selesai >= validated.halaman_mulai
      ? validated.halaman_selesai - validated.halaman_mulai + 1
      : null)

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    waktu_baca: validated.waktu_baca,
    surat: validated.surat || null,
    juz: validated.juz || null,
    halaman_mulai: validated.halaman_mulai || null,
    halaman_selesai: validated.halaman_selesai || null,
    jumlah_halaman: jumlahHalaman,
    catatan: validated.catatan || null,
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
    .select("*")
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
    .select("id, tanggal, waktu_baca, surat, juz, halaman_mulai, halaman_selesai, jumlah_halaman, catatan, created_at, updated_at")
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
    .select("jumlah_halaman")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)

  if (error) throw new Error(error.message)

  const totalHalaman = data?.reduce((sum, log) => sum + (log.jumlah_halaman || 0), 0) || 0
  const totalBacaan = data?.length || 0

  return { totalHalaman, totalBacaan }
}