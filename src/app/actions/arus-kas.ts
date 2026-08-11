"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const arusKasSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  kategori: z.enum(["uang_masuk", "uang_keluar"]),
  nominal: z.number().int().nonnegative(),
  alasan: z.string().optional(),
})

export type ArusKasFormData = z.infer<typeof arusKasSchema>

export interface ArusKasEntry {
  id: string
  user_id: string
  tanggal: string
  kategori: "uang_masuk" | "uang_keluar"
  nominal: number
  alasan: string | null
  created_at: string
  updated_at: string
}

export async function upsertArusKas(formData: ArusKasFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = arusKasSchema.parse(formData)
  const { data: existing } = await supabase
    .from("arus_kas")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .eq("kategori", validated.kategori)
    .eq("nominal", validated.nominal)
    .eq("alasan", validated.alasan ?? null)
    .maybeSingle()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    kategori: validated.kategori,
    nominal: validated.nominal,
    alasan: validated.alasan ?? null,
  }

  let data, error
  if (existing) {
    const result = await supabase.from("arus_kas").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("arus_kas").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/arus-kas")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  return { data, error: null }
}

export async function createArusKas(formData: ArusKasFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = arusKasSchema.parse(formData)
  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    kategori: validated.kategori,
    nominal: validated.nominal,
    alasan: validated.alasan ?? null,
  }
  const { data, error } = await supabase.from("arus_kas").insert(insertData).select().single()
  if (error) throw new Error(error.message)
  revalidatePath("/arus-kas")
  return { data, error: null }
}

export async function deleteArusKas(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("arus_kas").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/arus-kas")
  return { error: null }
}

export async function getArusKasRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("arus_kas")
    .select("id, user_id, tanggal, kategori, nominal, alasan, created_at")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}
