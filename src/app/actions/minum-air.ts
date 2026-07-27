"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const minumAirSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  hari: z.string().min(1, "Hari wajib diisi"),
  setelah_bangun: z.boolean().default(false),
  pertengahan_pagi: z.boolean().default(false),
  setelah_dzuhur: z.boolean().default(false),
  sebelum_maghrib: z.boolean().default(false),
  setelah_ashar: z.boolean().default(false),
  setelah_isya: z.boolean().default(false),
})

export type MinumAirFormData = z.infer<typeof minumAirSchema>

const MINUM_AIR_TIMES = ["setelah_bangun", "pertengahan_pagi", "setelah_dzuhur", "sebelum_maghrib", "setelah_ashar", "setelah_isya"] as const

export async function upsertMinumAir(formData: MinumAirFormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = minumAirSchema.parse(formData)
  
  const { data: existing } = await supabase
    .from("minum_air")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    hari: validated.hari,
    setelah_bangun: validated.setelah_bangun,
    pertengahan_pagi: validated.pertengahan_pagi,
    setelah_dzuhur: validated.setelah_dzuhur,
    sebelum_maghrib: validated.sebelum_maghrib,
    setelah_ashar: validated.setelah_ashar,
    setelah_isya: validated.setelah_isya,
  }

  let data, error
  if (existing) {
    const result = await supabase
      .from("minum_air")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("minum_air")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw new Error(error.message)

  revalidatePath("/minum-air")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function toggleMinumAir(tanggal: string, time: typeof MINUM_AIR_TIMES[number], value: boolean) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: existing } = await supabase
    .from("minum_air")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  const updateData = { [time]: value }

  let data, error
  if (existing) {
    const result = await supabase
      .from("minum_air")
      .update(updateData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("minum_air")
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

  revalidatePath("/minum-air")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function getMinumAir(tanggal: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("minum_air")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}

export async function getMinumAirRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("minum_air")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}