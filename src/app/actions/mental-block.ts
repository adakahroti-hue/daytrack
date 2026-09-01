"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
const mentalBlockSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  masalah: z.string().min(1, "Mental block wajib diisi"),
})

export type MentalBlockFormData = z.infer<typeof mentalBlockSchema>

export interface MentalBlockEntry {
  id: string
  user_id: string
  tanggal: string
  masalah: string
  created_at: string
  updated_at: string
}

export async function upsertMentalBlock(formData: MentalBlockFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = mentalBlockSchema.parse(formData)

  const { data: existing } = await supabase
    .from("mental_block")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .eq("masalah", validated.masalah)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    masalah: validated.masalah,
  }

  let data, error
  if (existing) {
    const result = await supabase.from("mental_block").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("mental_block").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/mental-block"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}

export async function updateMentalBlock(id: string, formData: { masalah?: string; tanggal?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const updateData: Record<string, string> = {}
  if (formData.masalah !== undefined) updateData.masalah = formData.masalah
  if (formData.tanggal !== undefined) updateData.tanggal = formData.tanggal

  const { data, error } = await supabase
    .from("mental_block")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/mental-block"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}

export async function deleteMentalBlock(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("mental_block").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/mental-block"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { error: null }
}

export async function getMentalBlockAll() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("mental_block")
    .select("id, user_id, tanggal, masalah, created_at, updated_at")
    .eq("user_id", user.id)
    .order("tanggal", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getMentalBlockRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("mental_block")
    .select("id, user_id, tanggal, masalah, created_at, updated_at")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
