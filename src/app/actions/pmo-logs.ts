"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const pmoLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  hari_ke: z.number().int().min(1).max(10000),
  status: z.enum(['berhasil', 'relapse']),
  trigger: z.enum(['stres', 'kebosanan', 'media', 'perasaan', 'lingkungan', 'lainnya']).optional(),
  strategi: z.string().optional(),
  catatan: z.string().optional(),
})

export type PmoLogFormData = z.infer<typeof pmoLogSchema>

export interface PmoLogEntry {
  id: string
  user_id: string
  tanggal: string
  hari_ke: number
  status: 'berhasil' | 'relapse'
  trigger: string | null
  strategi: string | null
  catatan: string | null
  created_at: string
  updated_at: string
}

export async function upsertPmoLog(formData: PmoLogFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = pmoLogSchema.parse(formData)

  const { data: existing } = await supabase
    .from("pmo_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    hari_ke: validated.hari_ke,
    status: validated.status,
    trigger: validated.trigger || null,
    strategi: validated.strategi || null,
    catatan: validated.catatan || null,
  }

  let data, error
  if (existing) {
    const result = await supabase.from("pmo_logs").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("pmo_logs").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/pmo"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}

export async function deletePmoLog(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("pmo_logs").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/pmo"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { error: null }
}

export async function getPmoLog(tanggal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("pmo_logs").select("*").eq("user_id", user.id).eq("tanggal", tanggal).single()
  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getPmoLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("pmo_logs").select("*").eq("user_id", user.id).gte("tanggal", startDate).lte("tanggal", endDate).order("tanggal", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getPmoStats(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("pmo_logs").select("status, hari_ke, trigger").eq("user_id", user.id).gte("tanggal", startDate).lte("tanggal", endDate).order("tanggal", { ascending: true })
  if (error) throw new Error(error.message)
  
  const logs = data || []
  const berhasil = logs.filter(l => l.status === 'berhasil').length
  const relapse = logs.filter(l => l.status === 'relapse').length
  const maxStreak = Math.max(...logs.filter(l => l.status === 'berhasil').map(l => l.hari_ke), 0)
  
  // Calculate current streak
  let currentStreak = 0
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].status === 'berhasil') currentStreak++
    else break
  }
  
  return { berhasil, relapse, currentStreak, maxStreak, total: logs.length }
}