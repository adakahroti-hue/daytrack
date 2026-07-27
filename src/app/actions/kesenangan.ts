"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const kesenanganSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  hari: z.string().min(1, "Hari wajib diisi"),
  kesenangan: z.string().min(1, "Kesenangan wajib diisi"),
})

export type KesenanganFormData = z.infer<typeof kesenanganSchema>

export async function upsertKesenangan(formData: KesenanganFormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = kesenanganSchema.parse(formData)
  
  const { data: existing } = await supabase
    .from("kesenangan")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    hari: validated.hari,
    kesenangan: validated.kesenangan,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("kesenangan")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("kesenangan")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/kesenangan")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function getKesenangan(tanggal: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("kesenangan")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getKesenanganRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("kesenangan")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}