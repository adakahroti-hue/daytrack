"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const sedekahLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  status: z.enum(["sudah", "belum"]),
  alasan_tidak: z.enum(["lupa", "sibuk", "tidak_terpikir", "malas", "tidak_fokus", "lainnya"]).optional(),
})

export type SedekahLogFormData = z.infer<typeof sedekahLogSchema>

export interface SedekahLogEntry {
  id: string
  user_id: string
  tanggal: string
  status: 'sudah' | 'belum'
  alasan_tidak: string | null
  created_at: string
  updated_at: string
}

const ALASAN_LABELS: Record<string, string> = {
  lupa: "Lupa",
  sibuk: "Sibuk",
  tidak_terpikir: "Tidak Terpikir",
  malas: "Malas",
  tidak_fokus: "Tidak Fokus",
  lainnya: "Lainnya",
}

export async function upsertSedekahLog(formData: SedekahLogFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = sedekahLogSchema.parse(formData)

  // Check if record exists for this user, date
  const { data: existing } = await supabase
    .from("sedekah")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    status: validated.status,
    alasan_tidak: validated.alasan_tidak || null,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("sedekah")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("sedekah")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/sedekah")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")

  return { data, error: null }
}

export async function deleteSedekahLog(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("sedekah")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/sedekah")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")

  return { error: null }
}

export async function getSedekahLog(tanggal: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("sedekah")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getSedekahLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("sedekah")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getSedekahDailySummary(tanggal: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("sedekah")
    .select("status")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)

  if (error) throw new Error(error.message)

  const sudahCount = data?.filter(d => d.status === 'sudah').length || 0
  const totalCount = data?.length || 0

  return { sudahCount, totalCount, persentase: totalCount > 0 ? Math.round((sudahCount / totalCount) * 100) : 0 }
}
