"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const masalahSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  hari: z.string().min(1, "Hari wajib diisi"),
  masalah: z.string().min(1, "Masalah wajib diisi"),
  solusi: z.string().optional(),
  status: z.enum(["belum", "sudah"]).default("belum"),
})

export type MasalahFormData = z.infer<typeof masalahSchema>

export async function upsertMasalah(formData: MasalahFormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = masalahSchema.parse(formData)
  
  const { data: existing } = await supabase
    .from("masalah")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    hari: validated.hari,
    masalah: validated.masalah,
    solusi: validated.solusi || null,
    status: validated.status,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("masalah")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("masalah")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/masalah")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function updateMasalahStatus(id: string, status: "belum" | "sudah") {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("masalah")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/masalah")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function deleteMasalah(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("masalah")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/masalah")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { error: null }
}

export async function getMasalah(tanggal: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("masalah")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getMasalahRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("masalah")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}