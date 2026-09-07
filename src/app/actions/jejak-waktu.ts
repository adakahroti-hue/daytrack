"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const startSchema = z.object({
  name: z.string().trim().min(1, "Nama kegiatan wajib diisi"),
})

export type JejakWaktu = {
  id: string
  user_id: string
  name: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  status: "running" | "completed"
  created_at: string
  updated_at: string
}

export async function getJejakWaktuToday(): Promise<JejakWaktu[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const { data } = await supabase
    .from("jejak_waktu")
    .select("id, user_id, name, started_at, ended_at, duration_seconds, status, created_at, updated_at")
    .eq("user_id", user.id)
    .gte("started_at", startOfDay)
    .order("started_at", { ascending: false })
  return (data || []) as JejakWaktu[]
}

export async function startActivity(input: unknown) {
  const validated = startSchema.parse(input)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Hanya boleh 1 timer aktif
  const { data: running } = await supabase
    .from("jejak_waktu")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "running")
    .limit(1)

  if (running && running.length > 0) {
    throw new Error("Masih ada aktivitas yang berjalan. Selesaikan dulu sebelum memulai yang baru.")
  }

  const { error } = await supabase
    .from("jejak_waktu")
    .insert({ user_id: user.id, name: validated.name, status: "running" })
  if (error) throw new Error(error.message)
  revalidatePath("/jejak-waktu")
}

// Lanjutkan tugas: buat aktivitas baru dengan nama sama (record baru / posisi beda)
export async function continueActivity(input: unknown) {
  const validated = startSchema.parse(input)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Hanya boleh 1 timer aktif
  const { data: running } = await supabase
    .from("jejak_waktu")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "running")
    .limit(1)

  if (running && running.length > 0) {
    throw new Error("Masih ada aktivitas yang berjalan. Selesaikan dulu sebelum melanjutkan.")
  }

  const { error } = await supabase
    .from("jejak_waktu")
    .insert({ user_id: user.id, name: validated.name, status: "running" })
  if (error) throw new Error(error.message)
  revalidatePath("/jejak-waktu")
}

export async function completeActivity(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: current } = await supabase
    .from("jejak_waktu")
    .select("started_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!current) throw new Error("Aktivitas tidak ditemukan")

  const start = new Date(current.started_at).getTime()
  const end = Date.now()
  const durationSeconds = Math.max(0, Math.round((end - start) / 1000))

  const { error } = await supabase
    .from("jejak_waktu")
    .update({
      ended_at: new Date(end).toISOString(),
      duration_seconds: durationSeconds,
      status: "completed",
    })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/jejak-waktu")
}

export async function deleteActivity(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("jejak_waktu")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/jejak-waktu")
}
