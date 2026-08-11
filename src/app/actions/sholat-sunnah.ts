"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const prayerReasonSchema = z.enum(["malas", "lupa", "ketiduran", "sibuk", "sakit", "perjalanan", "tak_ada_tempat", "bersama_teman", "lainnya"])

const sholatSunnahSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  status: z.enum(["sudah", "belum"]).default("belum"),
  sholat_dhuha: z.boolean().default(false),
  sholat_tahajud: z.boolean().default(false),
  alasan_dhuha: prayerReasonSchema.nullable().optional(),
  alasan_tahajud: prayerReasonSchema.nullable().optional(),
})

export type SholatSunnahFormData = z.infer<typeof sholatSunnahSchema>

const SUNNAH_TIMES = ["dhuha", "tahajud"] as const

export async function upsertSholatSunnah(formData: SholatSunnahFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = sholatSunnahSchema.parse(formData)

  const { data: existing } = await supabase
    .from("sholat_sunnah")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const allDone = [validated.sholat_dhuha, validated.sholat_tahajud].every(Boolean)
  const status = allDone ? "sudah" : "belum"

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    status,
    sholat_dhuha: validated.sholat_dhuha,
    sholat_tahajud: validated.sholat_tahajud,
    alasan_dhuha: validated.alasan_dhuha || null,
    alasan_tahajud: validated.alasan_tahajud || null,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("sholat_sunnah")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("sholat_sunnah")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/sholat-sunnah")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")

  return { data, error: null }
}

export async function toggleSholatSunnah(tanggal: string, prayerTime: typeof SUNNAH_TIMES[number], value: boolean, reason?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const columnMap: Record<string, string> = {
    dhuha: "sholat_dhuha",
    tahajud: "sholat_tahajud",
  }
  const reasonColumnMap: Record<string, string> = {
    dhuha: "alasan_dhuha",
    tahajud: "alasan_tahajud",
  }

  const column = columnMap[prayerTime]
  const reasonColumn = reasonColumnMap[prayerTime]

  if (!column) throw new Error("Invalid prayer time")

  const { data: existing } = await supabase
    .from("sholat_sunnah")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  const update: any = { [column]: value }
  if (value) {
    update[reasonColumn] = null
  } else {
    update[reasonColumn] = reason ?? null
  }

  let status = "belum"
  if (existing) {
    const allDone = [
      column === "sholat_dhuha" ? value : existing.sholat_dhuha,
      column === "sholat_tahajud" ? value : existing.sholat_tahajud,
    ].every(Boolean)
    status = allDone ? "sudah" : "belum"
    update.status = status
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("sholat_sunnah")
      .update(update)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("sholat_sunnah")
      .insert({
        user_id: user.id,
        tanggal,
        status,
        ...update,
      })
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/sholat-sunnah")

  return { data, error: null }
}

export async function getSholatSunnah(tanggal: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("sholat_sunnah")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getSholatSunnahRange(startDate: string, endDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("sholat_sunnah")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function updateSholatSunnahQuality(
  tanggal: string,
  prayerTime: typeof SUNNAH_TIMES[number],
  quality: number
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const qualityColumnMap: Record<string, string> = {
    dhuha: "kualitas_dhuha",
    tahajud: "kualitas_tahajud",
  }

  const column = qualityColumnMap[prayerTime]
  if (!column) throw new Error("Invalid prayer time")

  const { data: existing } = await supabase
    .from("sholat_sunnah")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  const updates = { [column]: quality }

  let data, error
  if (existing) {
    const result = await supabase
      .from("sholat_sunnah")
      .update(updates)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("sholat_sunnah")
      .insert({
        user_id: user.id,
        tanggal,
        ...updates,
      })
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/sholat-sunnah")

  return { data, error: null }
}
