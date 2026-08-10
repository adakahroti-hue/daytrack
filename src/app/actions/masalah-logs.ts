"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
const masalahLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  masalah: z.string().min(1, "Masalah wajib diisi"),
  status: z.enum(['belum', 'proses', 'selesai']).default('belum'),
})

export type MasalahLogFormData = z.infer<typeof masalahLogSchema>

export interface MasalahLogEntry {
  id: string
  user_id: string
  tanggal: string
  masalah: string
  status: 'belum' | 'proses' | 'selesai'
  created_at: string
  updated_at: string
}

export async function upsertMasalahLog(formData: MasalahLogFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = masalahLogSchema.parse(formData)

  const { data: existing } = await supabase
    .from("refleksi")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .eq("masalah", validated.masalah)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    masalah: validated.masalah,
    status: validated.status,
  }

  let data, error
  if (existing) {
    const result = await supabase.from("refleksi").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("refleksi").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/masalah"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}

export async function updateMasalahLog(id: string, formData: { masalah?: string; status?: 'belum' | 'proses' | 'selesai'; tanggal?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const updateData: Record<string, string> = {}
  if (formData.masalah !== undefined) updateData.masalah = formData.masalah
  if (formData.status !== undefined) updateData.status = formData.status
  if (formData.tanggal !== undefined) updateData.tanggal = formData.tanggal

  const { data, error } = await supabase
    .from("refleksi")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/masalah"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}

export async function deleteMasalahLog(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("refleksi").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/masalah"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { error: null }
}

export async function getMasalahLog(tanggal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("refleksi").select("id, user_id, tanggal, masalah, status, created_at, updated_at").eq("user_id", user.id).eq("tanggal", tanggal).order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getMasalahLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("refleksi").select("id, user_id, tanggal, masalah, status, created_at, updated_at").eq("user_id", user.id).gte("tanggal", startDate).lte("tanggal", endDate).order("tanggal", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
