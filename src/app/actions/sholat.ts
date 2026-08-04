"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const sholatReasonSchema = z.enum(["malas", "lupa", "sibuk", "sakit", "perjalanan", "tak_ada_tempat", "bersama_teman", "lainnya"])
const sholatSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  hari: z.string().min(1, "Hari wajib diisi"),
  subuh: z.boolean().default(false),
  dhuha: z.boolean().default(false),
  dzuhur: z.boolean().default(false),
  ashar: z.boolean().default(false),
  maghrib: z.boolean().default(false),
  isya: z.boolean().default(false),
  alasan_subuh: sholatReasonSchema.optional(),
  alasan_dhuha: sholatReasonSchema.optional(),
  alasan_dzuhur: sholatReasonSchema.optional(),
  alasan_ashar: sholatReasonSchema.optional(),
  alasan_maghrib: sholatReasonSchema.optional(),
  alasan_isya: sholatReasonSchema.optional(),
})

export type SholatFormData = z.infer<typeof sholatSchema>

const SHOLAT_TIMES = ["subuh", "dhuha", "dzuhur", "ashar", "maghrib", "isya"] as const

export async function upsertSholat(formData: SholatFormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = sholatSchema.parse(formData)
  
  const { data: existing } = await supabase
    .from("sholat")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    hari: validated.hari,
    subuh: validated.subuh,
    dhuha: validated.dhuha,
    dzuhur: validated.dzuhur,
    ashar: validated.ashar,
    maghrib: validated.maghrib,
    isya: validated.isya,
    alasan_subuh: validated.alasan_subuh || null,
    alasan_dhuha: validated.alasan_dhuha || null,
    alasan_dzuhur: validated.alasan_dzuhur || null,
    alasan_ashar: validated.alasan_ashar || null,
    alasan_maghrib: validated.alasan_maghrib || null,
    alasan_isya: validated.alasan_isya || null,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("sholat")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("sholat")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/sholat")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function toggleSholat(tanggal: string, sholatTime: typeof SHOLAT_TIMES[number], value: boolean, alasan?: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: existing } = await supabase
    .from("sholat")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  const updateData = {
    [sholatTime]: value,
    [`alasan_${sholatTime}`]: value ? null : (alasan || null),
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("sholat")
      .update(updateData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("sholat")
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

  revalidatePath("/sholat")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function getSholat(tanggal: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("sholat")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getSholatRange(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("sholat")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function updateSholatCell(
  tanggal: string,
  sholatTime: "subuh" | "dhuha" | "dzuhur" | "ashar" | "maghrib" | "isya",
  value: boolean,
  alasan?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: existing } = await supabase
    .from("sholat")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  const updateData = {
    [sholatTime]: value,
    [`alasan_${sholatTime}`]: value ? null : (alasan || null),
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("sholat")
      .update(updateData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("sholat")
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

  revalidatePath("/sholat")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")

  return { data, error: null }
}

export async function clearSholatCell(
  tanggal: string,
  sholatTime: "subuh" | "dhuha" | "dzuhur" | "ashar" | "maghrib" | "isya"
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: existing } = await supabase
    .from("sholat")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  if (!existing) return { data: null, error: null }

  const updateData = {
    [sholatTime]: false,
    [`alasan_${sholatTime}`]: null,
  }

  const { data, error } = await supabase
    .from("sholat")
    .update(updateData)
    .eq("id", existing.id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/sholat")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")

  return { data, error: null }
}