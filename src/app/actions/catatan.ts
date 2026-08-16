"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const catatanSchema = z.object({
  judul: z.string().min(1, "Judul wajib diisi"),
  isi: z.string().min(1, "Isi wajib diisi"),
  warna: z.enum(["yellow", "green", "blue", "pink", "orange"]).default("yellow"),
})

export type CatatanFormData = z.infer<typeof catatanSchema>

export interface CatatanEntry {
  id: string
  user_id: string
  judul: string
  isi: string
  warna: "yellow" | "green" | "blue" | "pink" | "orange"
  created_at: string
  updated_at: string
}

export async function createCatatan(formData: CatatanFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = catatanSchema.parse(formData)
  const { data, error } = await supabase
    .from("catatan")
    .insert({
      user_id: user.id,
      judul: validated.judul,
      isi: validated.isi,
      warna: validated.warna,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/catatan")
  return { data, error: null }
}

export async function updateCatatan(id: string, formData: { judul?: string; isi?: string; warna?: "yellow" | "green" | "blue" | "pink" | "orange" }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const updateData: Record<string, string> = {}
  if (formData.judul !== undefined) updateData.judul = formData.judul
  if (formData.isi !== undefined) updateData.isi = formData.isi
  if (formData.warna !== undefined) updateData.warna = formData.warna

  const { data, error } = await supabase
    .from("catatan")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/catatan")
  return { data, error: null }
}

export async function deleteCatatan(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("catatan").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/catatan")
  return { error: null }
}

export async function getCatatanAll() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("catatan")
    .select("id, user_id, judul, isi, warna, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
