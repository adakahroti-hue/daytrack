"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const pmoSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  hari_ke: z.number().int().min(1).max(7),
  nama_hari: z.string().min(1, "Nama hari wajib diisi"),
  status: z.enum(["berhasil", "relapse"]).default("berhasil"),
  keterangan: z.string().optional(),
})

export type PMOFormData = z.infer<typeof pmoSchema>

export async function upsertPMO(formData: PMOFormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = pmoSchema.parse(formData)
  
  const { data: existing } = await supabase
    .from("pmo")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    hari_ke: validated.hari_ke,
    nama_hari: validated.nama_hari,
    status: validated.status,
    keterangan: validated.keterangan || null,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("pmo")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("pmo")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/pmo")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function getPMO(tanggal: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("pmo")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getPMORange(startDate: string, endDate: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("pmo")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getPMOStats(startDate: string, endDate: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("pmo")
    .select("status, tanggal")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)

  if (error) throw new Error(error.message)
  
  const berhasil = data?.filter(d => d.status === "berhasil").length || 0
  const relapse = data?.filter(d => d.status === "relapse").length || 0
  const total = data?.length || 0
  const streak = calculateStreak(data || [])

  return { berhasil, relapse, total, streak }
}

function calculateStreak(data: { status: string; tanggal: string }[]) {
  const sorted = [...data].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
  let streak = 0
  for (const item of sorted) {
    if (item.status === "berhasil") streak++
    else break
  }
  return streak
}