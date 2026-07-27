"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const quranReasonSchema = z.enum(["malas", "lupa", "sibuk", "sakit", "perjalanan", "tak_ada_tempat", "bersama_teman", "lainnya"])
const quranSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  hari: z.string().min(1, "Hari wajib diisi"),
  setelah_subuh: z.boolean().default(false),
  setelah_dzuhur: z.boolean().default(false),
  setelah_ashar: z.boolean().default(false),
  setelah_maghrib: z.boolean().default(false),
  setelah_isya: z.boolean().default(false),
  alasan_setelah_subuh: quranReasonSchema.optional(),
  alasan_setelah_dzuhur: quranReasonSchema.optional(),
  alasan_setelah_ashar: quranReasonSchema.optional(),
  alasan_setelah_maghrib: quranReasonSchema.optional(),
  alasan_setelah_isya: quranReasonSchema.optional(),
})

export type QuranFormData = z.infer<typeof quranSchema>

const QURAN_TIMES = ["setelah_subuh", "setelah_dzuhur", "setelah_ashar", "setelah_maghrib", "setelah_isya"] as const

export async function upsertQuran(formData: QuranFormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = quranSchema.parse(formData)
  
  const { data: existing } = await supabase
    .from("quran")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    hari: validated.hari,
    setelah_subuh: validated.setelah_subuh,
    setelah_dzuhur: validated.setelah_dzuhur,
    setelah_ashar: validated.setelah_ashar,
    setelah_maghrib: validated.setelah_maghrib,
    setelah_isya: validated.setelah_isya,
    alasan_setelah_subuh: validated.alasan_setelah_subuh || null,
    alasan_setelah_dzuhur: validated.alasan_setelah_dzuhur || null,
    alasan_setelah_ashar: validated.alasan_setelah_ashar || null,
    alasan_setelah_maghrib: validated.alasan_setelah_maghrib || null,
    alasan_setelah_isya: validated.alasan_setelah_isya || null,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("quran")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("quran")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/quran")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function toggleQuran(tanggal: string, quranTime: typeof QURAN_TIMES[number], value: boolean, alasan?: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: existing } = await supabase
    .from("quran")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  const updateData = {
    [quranTime]: value,
    [`alasan_${quranTime}`]: value ? null : (alasan || null),
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("quran")
      .update(updateData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("quran")
      .insert({
        user_id: user.id,
        tanggal,
        hari: new Date(tanggal).toLocaleDateString("id-ID", { weekday: "long" }),
        ...updateData,
      })
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/quran")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function getQuran(tanggal: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("quran")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getQuranRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("quran")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}