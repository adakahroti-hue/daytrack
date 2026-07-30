"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const tidurLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  status: z.enum(["tepat", "begadang"]).default("tepat"),
  jam_tidur: z.string().optional(),
  jam_bangun: z.string().optional(),
  kualitas: z.number().int().min(1).max(5).optional(),
  catatan: z.string().optional(),
  alasan_tidak: z.enum(["sibuk", "insomnia", "malam_minggu", "lainnya"]).optional(),
})

export type TidurLogFormData = z.infer<typeof tidurLogSchema>

export interface TidurLogEntry {
  id: string
  user_id: string
  tanggal: string
  status: 'tepat' | 'begadang'
  jam_tidur: string | null
  jam_bangun: string | null
  durasi_jam: number | null
  kualitas: number | null
  catatan: string | null
  alasan_tidak: string | null
  created_at: string
  updated_at: string
}

function calculateDuration(jamTidur: string | null, jamBangun: string | null): number | null {
  if (!jamTidur || !jamBangun) return null
  const [tidurH, tidurM] = jamTidur.split(':').map(Number)
  const [bangunH, bangunM] = jamBangun.split(':').map(Number)
  let tidurMinutes = tidurH * 60 + tidurM
  let bangunMinutes = bangunH * 60 + bangunM
  if (bangunMinutes <= tidurMinutes) bangunMinutes += 24 * 60
  return Math.round((bangunMinutes - tidurMinutes) / 60 * 10) / 10
}

export async function upsertTidurLog(formData: TidurLogFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = tidurLogSchema.parse(formData)
  const durasi = calculateDuration(validated.jam_tidur || null, validated.jam_bangun || null)

  const { data: existing } = await supabase
    .from("tidur_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    status: validated.status,
    jam_tidur: validated.jam_tidur || null,
    jam_bangun: validated.jam_bangun || null,
    durasi_jam: durasi,
    kualitas: validated.kualitas || null,
    catatan: validated.catatan || null,
    alasan_tidak: validated.alasan_tidak || null,
  }

  let data, error
  if (existing) {
    const result = await supabase.from("tidur_logs").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("tidur_logs").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/tidur"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}

export async function deleteTidurLog(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("tidur_logs").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/tidur"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { error: null }
}

export async function getTidurLog(tanggal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("tidur_logs").select("*").eq("user_id", user.id).eq("tanggal", tanggal).single()
  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getTidurLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("tidur_logs").select("*").eq("user_id", user.id).gte("tanggal", startDate).lte("tanggal", endDate).order("tanggal", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getTidurStats(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("tidur_logs").select("tanggal, status, durasi_jam, kualitas").eq("user_id", user.id).gte("tanggal", startDate).lte("tanggal", endDate)
  if (error) throw new Error(error.message)
  
  const logs = data || []
  const tepat = logs.filter(l => l.status === 'tepat').length
  const begadang = logs.filter(l => l.status === 'begadang').length
  const avgDurasi = logs.filter(l => l.durasi_jam).reduce((sum, l) => sum + (l.durasi_jam || 0), 0) / logs.filter(l => l.durasi_jam).length || 0
  const avgKualitas = logs.filter(l => l.kualitas).reduce((sum, l) => sum + (l.kualitas || 0), 0) / logs.filter(l => l.kualitas).length || 0
  
  // Calculate streak
  let streak = 0
  const sortedDates = [...new Set(logs.map(l => l.tanggal).filter(Boolean))].sort((a, b) => b.localeCompare(a))
  for (const date of sortedDates) {
    const dayLog = logs.find(l => l.tanggal === date)
    if (dayLog?.status === 'tepat') streak++
    else break
  }
  
  return { tepat, begadang, total: logs.length, avgDurasi: Math.round(avgDurasi * 10) / 10, avgKualitas: Math.round(avgKualitas * 10) / 10, streak }
}