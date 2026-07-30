"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const prayerReasonSchema = z.enum(["malas", "lupa", "sibuk", "sakit", "perjalanan", "tak_ada_tempat", "bersama_teman", "lainnya"])

const prayerLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  status: z.enum(["sudah", "belum"]).default("belum"),
  sholat_subuh: z.boolean().default(false),
  sholat_dzuhur: z.boolean().default(false),
  sholat_ashar: z.boolean().default(false),
  sholat_maghrib: z.boolean().default(false),
  sholat_isya: z.boolean().default(false),
  alasan_subuh: prayerReasonSchema.optional(),
  alasan_dzuhur: prayerReasonSchema.optional(),
  alasan_ashar: prayerReasonSchema.optional(),
  alasan_maghrib: prayerReasonSchema.optional(),
  alasan_isya: prayerReasonSchema.optional(),
  refleksi: z.string().optional(),
})

export type PrayerLogFormData = z.infer<typeof prayerLogSchema>

const PRAYER_TIMES = ["subuh", "dzuhur", "ashar", "maghrib", "isya"] as const

export async function upsertPrayerLog(formData: PrayerLogFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = prayerLogSchema.parse(formData)

  const { data: existing } = await supabase
    .from("prayer_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const allDone = [validated.sholat_subuh, validated.sholat_dzuhur, validated.sholat_ashar, validated.sholat_maghrib, validated.sholat_isya].every(Boolean)
  const status = allDone ? "sudah" : "belum"

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    status,
    sholat_subuh: validated.sholat_subuh,
    sholat_dzuhur: validated.sholat_dzuhur,
    sholat_ashar: validated.sholat_ashar,
    sholat_maghrib: validated.sholat_maghrib,
    sholat_isya: validated.sholat_isya,
    alasan_subuh: validated.alasan_subuh || null,
    alasan_dzuhur: validated.alasan_dzuhur || null,
    alasan_ashar: validated.alasan_ashar || null,
    alasan_maghrib: validated.alasan_maghrib || null,
    alasan_isya: validated.alasan_isya || null,
    refleksi: validated.refleksi || null,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("prayer_logs")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("prayer_logs")
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

export async function togglePrayer(tanggal: string, prayerTime: typeof PRAYER_TIMES[number], value: boolean, reason?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const columnMap: Record<string, string> = {
    subuh: "sholat_subuh",
    dzuhur: "sholat_dzuhur",
    ashar: "sholat_ashar",
    maghrib: "sholat_maghrib",
    isya: "sholat_isya",
  }
  const reasonColumnMap: Record<string, string> = {
    subuh: "alasan_subuh",
    dzuhur: "alasan_dzuhur",
    ashar: "alasan_ashar",
    maghrib: "alasan_maghrib",
    isya: "alasan_isya",
  }

  const column = columnMap[prayerTime]
  const reasonColumn = reasonColumnMap[prayerTime]

  if (!column) throw new Error("Invalid prayer time")

  const { data: existing } = await supabase
    .from("prayer_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  const updates: any = { [column]: value }
  if (!value && reason) {
    updates[reasonColumn] = reason
  } else if (value) {
    updates[reasonColumn] = null
  }

  // Calculate status
  let status = "belum"
  if (existing) {
    const allDone = [
      column === "sholat_subuh" ? value : existing.sholat_subuh,
      column === "sholat_dzuhur" ? value : existing.sholat_dzuhur,
      column === "sholat_ashar" ? value : existing.sholat_ashar,
      column === "sholat_maghrib" ? value : existing.sholat_maghrib,
      column === "sholat_isya" ? value : existing.sholat_isya,
    ].every(Boolean)
    status = allDone ? "sudah" : "belum"
    updates.status = status
  } else {
    status = value ? "belum" : "belum" // Only one prayer, not all
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("prayer_logs")
      .update(updates)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("prayer_logs")
      .insert({
        user_id: user.id,
        tanggal,
        status,
        ...updates,
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

export async function getPrayerLog(tanggal: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("prayer_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getPrayerLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("prayer_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}