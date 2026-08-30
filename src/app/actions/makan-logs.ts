"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const makanLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  makan_pagi: z.string().optional(),
  makan_siang: z.string().optional(),
  makan_malam: z.string().optional(),
  makan_pagi_isi: z.string().optional(),
  makan_siang_isi: z.string().optional(),
  makan_malam_isi: z.string().optional(),
})

export type MakanLogFormData = z.infer<typeof makanLogSchema>

export interface MakanLogEntry {
  id: string
  user_id: string
  tanggal: string
  makan_pagi: string | null
  makan_siang: string | null
  makan_malam: string | null
  makan_pagi_isi: string | null
  makan_siang_isi: string | null
  makan_malam_isi: string | null
  created_at: string
  updated_at: string
}

export async function upsertMakanLog(formData: MakanLogFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = makanLogSchema.parse(formData)
  const { data: existing } = await supabase
    .from("makan")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .maybeSingle()

  const insertData: Record<string, any> = {
    user_id: user.id,
    tanggal: validated.tanggal,
  }
  if (validated.makan_pagi !== undefined) insertData.makan_pagi = validated.makan_pagi || null
  if (validated.makan_siang !== undefined) insertData.makan_siang = validated.makan_siang || null
  if (validated.makan_malam !== undefined) insertData.makan_malam = validated.makan_malam || null
  if (validated.makan_pagi_isi !== undefined) insertData.makan_pagi_isi = validated.makan_pagi_isi || null
  if (validated.makan_siang_isi !== undefined) insertData.makan_siang_isi = validated.makan_siang_isi || null
  if (validated.makan_malam_isi !== undefined) insertData.makan_malam_isi = validated.makan_malam_isi || null

  let data, error
  if (existing) {
    const result = await supabase.from("makan").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("makan").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/makan")
  return { data, error: null }
}

export async function deleteMakanLog(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("makan").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/makan")
  return { error: null }
}

export async function getMakanLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("makan")
    .select("id, tanggal, makan_pagi, makan_siang, makan_malam, makan_pagi_isi, makan_siang_isi, makan_malam_isi")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
