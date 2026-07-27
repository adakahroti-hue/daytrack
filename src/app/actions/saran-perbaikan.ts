"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const saranPerbaikanSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  hari: z.string().min(1, "Hari wajib diisi"),
  saran: z.string().min(1, "Saran wajib diisi"),
  keterangan: z.string().optional(),
  status: z.enum(["belum", "proses", "selesai"]).default("belum"),
})

export type SaranPerbaikanFormData = z.infer<typeof saranPerbaikanSchema>

export async function upsertSaranPerbaikan(formData: SaranPerbaikanFormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = saranPerbaikanSchema.parse(formData)
  
  const { data: existing } = await supabase
    .from("saran_perbaikan")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    hari: validated.hari,
    saran: validated.saran,
    keterangan: validated.keterangan || null,
    status: validated.status,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("saran_perbaikan")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("saran_perbaikan")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/saran-perbaikan")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function updateSaranPerbaikanStatus(id: string, status: "belum" | "proses" | "selesai") {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("saran_perbaikan")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/saran-perbaikan")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function deleteSaranPerbaikan(id: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("saran_perbaikan")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/saran-perbaikan")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { error: null }
}

export async function getSaranPerbaikan(tanggal: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("saran_perbaikan")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getSaranPerbaikanRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("saran_perbaikan")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}