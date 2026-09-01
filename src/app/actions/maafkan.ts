"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const maafkanSchema = z.object({
  kejadian: z.string().min(1, "Kejadian wajib diisi"),
  status: z.string().optional(),
})

export type MaafkanFormData = z.infer<typeof maafkanSchema>

export interface MaafkanEntry {
  id: string
  user_id: string
  kejadian: string
  status: string
  created_at: string
  updated_at: string
}

export async function upsertMaafkan(formData: MaafkanFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = maafkanSchema.parse(formData)

  const { data: existing } = await supabase
    .from("maafkan")
    .select("id")
    .eq("user_id", user.id)
    .eq("kejadian", validated.kejadian)
    .single()

  const insertData = {
    user_id: user.id,
    kejadian: validated.kejadian,
    status: validated.status ?? "belum",
  }

  let data, error
  if (existing) {
    const result = await supabase.from("maafkan").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("maafkan").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/maafkan")
  return { data, error: null }
}

export async function updateMaafkan(id: string, formData: { kejadian?: string; status?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const updateData: Record<string, string> = {}
  if (formData.kejadian !== undefined) updateData.kejadian = formData.kejadian
  if (formData.status !== undefined) updateData.status = formData.status

  const { data, error } = await supabase
    .from("maafkan")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/maafkan")
  return { data, error: null }
}

export async function deleteMaafkan(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("maafkan").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/maafkan")
  return { error: null }
}

export async function getMaafkanAll() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("maafkan")
    .select("id, user_id, kejadian, status, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
