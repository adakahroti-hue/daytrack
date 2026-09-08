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

export type WaktuPeriod = "harian" | "kemarin" | "shot" | "mingguan" | "bulanan" | "tahunan"

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Shot: rentang Minggu–Sabtu (7 hari), sama seperti overview
function getShotStart(anchor: Date): Date {
  const d = startOfDay(anchor)
  const day = d.getDay() // 0=Minggu
  const baseSunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
  const shift = day === 0 ? -7 : 0
  return new Date(baseSunday.getFullYear(), baseSunday.getMonth(), baseSunday.getDate() + shift)
}

function getPeriodRange(period: WaktuPeriod, anchor: Date = new Date()): { start: string; end: string | null } {
  const a = startOfDay(anchor)
  if (period === "harian") {
    return { start: a.toISOString(), end: null }
  }
  if (period === "kemarin") {
    const yesterday = new Date(a.getFullYear(), a.getMonth(), a.getDate() - 1)
    return { start: yesterday.toISOString(), end: a.toISOString() }
  }
  if (period === "shot") {
    const s = getShotStart(anchor)
    const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)
    return { start: s.toISOString(), end: e.toISOString() }
  }
  if (period === "mingguan") {
    const day = anchor.getDay() // 0=Minggu
    const diff = (day + 6) % 7 // Senin awal minggu
    const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - diff)
    return { start: monday.toISOString(), end: null }
  }
  if (period === "bulanan") {
    return { start: new Date(anchor.getFullYear(), anchor.getMonth(), 1).toISOString(), end: null }
  }
  // tahunan
  return { start: new Date(anchor.getFullYear(), 0, 1).toISOString(), end: null }
}

export async function getJejakWaktuByPeriod(period: WaktuPeriod = "harian", anchor: Date = new Date()): Promise<JejakWaktu[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { start, end } = getPeriodRange(period, anchor)
  let query = supabase
    .from("jejak_waktu")
    .select("id, user_id, name, started_at, ended_at, duration_seconds, status, created_at, updated_at")
    .eq("user_id", user.id)
    .gte("started_at", start)
  if (end) query = query.lt("started_at", end)
  const { data } = await query.order("started_at", { ascending: false })
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
