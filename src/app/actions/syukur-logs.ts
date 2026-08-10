"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const syukurLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  status: z.enum(["sudah", "belum"]),
  isi_syukur: z.string().optional(),
  kategori: z.enum(["kesehatan", "keluarga", "rezeki", "pekerjaan", "ilmu", "hal_kecil", "lainnya"]).optional(),
  catatan: z.string().optional(),
  alasan_tidak: z.enum(["lupa", "sibuk", "tidak_terpikir", "malas", "tidak_fokus", "lainnya"]).optional(),
})

export type SyukurLogFormData = z.infer<typeof syukurLogSchema>

export interface SyukurLogEntry {
  id: string
  user_id: string
  tanggal: string
  status: 'sudah' | 'belum'
  isi_syukur: string | null
  kategori: string | null
  catatan: string | null
  alasan_tidak: string | null
  created_at: string
  updated_at: string
}

const KATEGORI_LABELS: Record<string, string> = {
  kesehatan: "Kesehatan",
  keluarga: "Keluarga",
  rezeki: "Rezeki",
  pekerjaan: "Pekerjaan",
  ilmu: "Ilmu",
  hal_kecil: "Hal Kecil",
  lainnya: "Lainnya",
}

const ALASAN_LABELS: Record<string, string> = {
  lupa: "Lupa",
  sibuk: "Sibuk",
  tidak_terpikir: "Tidak Terpikir",
  lainnya: "Lainnya",
}

export async function upsertSyukurLog(formData: SyukurLogFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = syukurLogSchema.parse(formData)

  // Check if record exists for this user, date
  const { data: existing } = await supabase
    .from("syukur")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    status: validated.status,
    isi_syukur: validated.isi_syukur || null,
    kategori: validated.kategori || null,
    catatan: validated.catatan || null,
    alasan_tidak: validated.alasan_tidak || null,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("syukur")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("syukur")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/syukur")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")

  return { data, error: null }
}

export async function deleteSyukurLog(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("syukur")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/syukur")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")

  return { error: null }
}

export async function getSyukurLog(tanggal: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("syukur")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getSyukurLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("syukur")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getSyukurDailySummary(tanggal: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("syukur")
    .select("status")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)

  if (error) throw new Error(error.message)

  const sudahCount = data?.filter(d => d.status === 'sudah').length || 0
  const totalCount = data?.length || 0

  return { sudahCount, totalCount, persentase: totalCount > 0 ? Math.round((sudahCount / totalCount) * 100) : 0 }
}