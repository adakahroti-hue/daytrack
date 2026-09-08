"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const startSchema = z.object({
  name: z.string().trim().min(1, "Nama kegiatan wajib diisi"),
})

// Auto-stop timer yang masih running (ubah jadi completed + hitung durasi)
async function autoStopRunning(supabase: any, userId: string) {
  const { data: running } = await supabase
    .from("jejak_waktu")
    .select("id, started_at")
    .eq("user_id", userId)
    .eq("status", "running")
    .limit(1)

  if (running && running.length > 0) {
    const r = running[0]
    const start = new Date(r.started_at).getTime()
    const end = Date.now()
    const durationSeconds = Math.max(0, Math.round((end - start) / 1000))
    await supabase
      .from("jejak_waktu")
      .update({
        ended_at: new Date(end).toISOString(),
        duration_seconds: durationSeconds,
        status: "completed",
      })
      .eq("id", r.id)
      .eq("user_id", userId)
  }
}

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

export type WaktuPeriod = "harian" | "mingguan" | "bulanan" | "tahunan"

function startOfPeriod(period: WaktuPeriod): string {
  const now = new Date()
  if (period === "harian") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (period === "mingguan") {
    const day = now.getDay() // 0=Minggu
    const diff = (day + 6) % 7 // senin awal minggu
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
    return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).toISOString()
  }
  if (period === "bulanan") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }
  // tahunan
  return new Date(now.getFullYear(), 0, 1).toISOString()
}

export async function getJejakWaktuByPeriod(period: WaktuPeriod = "harian"): Promise<JejakWaktu[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const startPeriod = startOfPeriod(period)
  const { data } = await supabase
    .from("jejak_waktu")
    .select("id, user_id, name, started_at, ended_at, duration_seconds, status, created_at, updated_at")
    .eq("user_id", user.id)
    .gte("started_at", startPeriod)
    .order("started_at", { ascending: false })
  return (data || []) as JejakWaktu[]
}

export async function getJejakWaktuNames(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data } = await supabase
    .from("jejak_waktu")
    .select("name")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(200)
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of (data || []) as { name: string }[]) {
    const n = row.name.trim()
    if (n && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase())
      out.push(n)
    }
  }
  return out
}

export async function startActivity(input: unknown) {
  const validated = startSchema.parse(input)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Jika masih ada timer lama yang jalan, auto-stop dulu
  await autoStopRunning(supabase, user.id)

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

  // Jika masih ada timer lama yang jalan, auto-stop dulu
  await autoStopRunning(supabase, user.id)

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
