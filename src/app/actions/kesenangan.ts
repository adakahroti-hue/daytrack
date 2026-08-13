"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const kesenanganSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  hari: z.string().min(1, "Hari wajib diisi"),
  kesenangan: z.string().optional(),
  status: z.enum(["belum", "sudah"]).optional(),
})

export type KesenanganFormData = z.infer<typeof kesenanganSchema>

export async function upsertKesenangan(formData: KesenanganFormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = kesenanganSchema.parse(formData)
  
  const { data: existing } = await supabase
    .from("playlist")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    hari: validated.hari,
    kesenangan: validated.kesenangan ?? "",
    status: validated.status ?? "belum",
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("playlist")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("playlist")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  // Fallback: kolom status belum ada (migrasi 20260807000005 belum dijalankan) — simpan tanpa status
  if (error && /status/i.test(error.message)) {
    const { status: _ignored, ...withoutStatus } = insertData as Record<string, unknown>
    if (existing) {
      const result = await supabase.from("playlist").update(withoutStatus).eq("id", existing.id).eq("user_id", user.id).select().single()
      data = result.data; error = result.error
    } else {
      const result = await supabase.from("playlist").insert(withoutStatus).select().single()
      data = result.data; error = result.error
    }
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
    .from("playlist")
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
    .from("playlist")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function deleteKesenangan(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("playlist").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/kesenangan")
  return { error: null }
}

// Revisi 1 (batch 7): model entri — insert baru (bukan upsert per tanggal)
export async function createKesenangan(formData: KesenanganFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = kesenanganSchema.parse(formData)
  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    hari: validated.hari,
    kesenangan: validated.kesenangan ?? "",
    status: validated.status ?? "belum",
  }
  const { data, error } = await supabase.from("playlist").insert(insertData).select().single()
  if (error) throw new Error(error.message)
  revalidatePath("/kesenangan")
  return { data, error: null }
}

export async function updateKesenangan(id: string, formData: { tanggal?: string; hari?: string; kesenangan?: string; status?: "belum" | "sudah" }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const updateData: Record<string, string> = {}
  if (formData.tanggal !== undefined) updateData.tanggal = formData.tanggal
  if (formData.hari !== undefined) updateData.hari = formData.hari
  if (formData.kesenangan !== undefined) updateData.kesenangan = formData.kesenangan
  if (formData.status !== undefined) updateData.status = formData.status
  const { data, error } = await supabase.from("playlist").update(updateData).eq("id", id).eq("user_id", user.id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath("/kesenangan")
  return { data, error: null }
}
