"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const waterLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  waktu_baca: z.enum(['setelah_bangun', 'setelah_dzuhur', 'setelah_ashar', 'setelah_maghrib', 'sebelum_tidur']),
  jumlah_ml: z.number().int().min(0).max(1000).default(250),
  catatan: z.string().optional(),
  status: z.enum(['sudah', 'lupa']).optional().nullable(),
})

export type WaterLogFormData = z.infer<typeof waterLogSchema>

export interface WaterLogEntry {
  id: string
  user_id: string
  tanggal: string
  waktu_baca: string
  jumlah_ml: number
  catatan: string | null
  status: string | null
  created_at: string
  updated_at: string
}

const WATER_TIMES = ['setelah_bangun', 'setelah_dzuhur', 'setelah_ashar', 'setelah_maghrib', 'sebelum_tidur'] as const
const TARGET_ML = 2000 // 8 glasses x 250ml

export async function upsertWaterLog(formData: WaterLogFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = waterLogSchema.parse(formData)

  const { data: existing } = await supabase
    .from("minum_air_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .eq("waktu_baca", validated.waktu_baca)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    waktu_baca: validated.waktu_baca,
    jumlah_ml: validated.jumlah_ml,
    catatan: validated.catatan || null,
    status: validated.status || null,
  }

  let data, error
  if (existing) {
    const result = await supabase.from("minum_air_logs").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("minum_air_logs").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/minum-air"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}

export async function deleteWaterLog(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("minum_air_logs").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/minum-air"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { error: null }
}

export async function getWaterLog(tanggal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("minum_air_logs").select("*").eq("user_id", user.id).eq("tanggal", tanggal).order("waktu_baca")
  if (error) throw new Error(error.message)
  return data || []
}

export async function getWaterLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("minum_air_logs").select("*").eq("user_id", user.id).gte("tanggal", startDate).lte("tanggal", endDate).order("tanggal", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getWaterDailySummary(tanggal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("minum_air_logs").select("jumlah_ml").eq("user_id", user.id).eq("tanggal", tanggal)
  if (error) throw new Error(error.message)
  
  const totalMl = data?.reduce((sum, log) => sum + (log.jumlah_ml || 0), 0) || 0
  const gelas = Math.round(totalMl / 250)
  const targetTercapai = totalMl >= TARGET_ML
  
  return { totalMl, gelas, targetTercapai, persentase: Math.min(Math.round((totalMl / TARGET_ML) * 100), 100) }
}

export async function getWaterStats(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("minum_air_logs").select("tanggal, jumlah_ml").eq("user_id", user.id).gte("tanggal", startDate).lte("tanggal", endDate)
  if (error) throw new Error(error.message)
  
  const logs = data || []
  const byDate = new Map<string, number>()
  logs.forEach(l => byDate.set(l.tanggal, (byDate.get(l.tanggal) || 0) + l.jumlah_ml))
  
  const days = Array.from(byDate.values())
  const avgMl = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0
  const targetDays = days.filter(d => d >= TARGET_ML).length
  
  return { avgMl, targetDays, totalDays: days.length, rataGelas: Math.round(avgMl / 250) }
}