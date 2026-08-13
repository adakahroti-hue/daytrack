"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ── Tipe ──
export type SwotKategori = "strength" | "weakness" | "opportunity" | "threat"
export type SwotPrioritas = "rendah" | "sedang" | "tinggi"
export type SwotTren = "membaik" | "stagnan" | "memburuk"
export type SwotStatus = "aktif" | "ditindak" | "selesai"

export interface SwotItem {
  id: string
  user_id: string
  kategori: SwotKategori
  judul: string
  prioritas: SwotPrioritas
  tren: SwotTren
  status: SwotStatus
  created_at: string
  updated_at: string
}

export interface SwotAction {
  id: string
  user_id: string
  swot_item_id: string | null
  target: string
  langkah_aksi: string | null
  deadline: string | null
  progress: number
  created_at: string
  updated_at: string
}

export interface SwotHistoryEntry {
  id: string
  user_id: string
  periode: string
  snapshot: any
  created_at: string
}

// ── Helpers ──
function assertUser(supabase: any) {
  return supabase.auth.getUser().then(({ data }: any) => {
    if (!data.user) throw new Error("Unauthorized")
    return data.user
  })
}

function revalidateSwot() {
  revalidatePath("/swot")
}

// ── ITEMS ──
export async function getSwotItems(): Promise<SwotItem[]> {
  const supabase = await createClient()
  const user = await assertUser(supabase)
  const { data, error } = await supabase
    .from("swot_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []) as SwotItem[]
}

export async function createSwotItem(data: {
  kategori: SwotKategori
  judul: string
  prioritas?: SwotPrioritas
  tren?: SwotTren
  status?: SwotStatus
}) {
  const supabase = await createClient()
  const user = await assertUser(supabase)
  const { error } = await supabase.from("swot_items").insert({
    user_id: user.id,
    kategori: data.kategori,
    judul: data.judul,
    prioritas: data.prioritas || "sedang",
    tren: data.tren || "stagnan",
    status: data.status || "aktif",
  })
  if (error) throw new Error(error.message)
  await recordSwotSnapshot()
  revalidateSwot()
  return { error: null }
}

export async function updateSwotItem(
  id: string,
  data: Partial<{
    kategori: SwotKategori
    judul: string
    prioritas: SwotPrioritas
    tren: SwotTren
    status: SwotStatus
  }>
) {
  const supabase = await createClient()
  const user = await assertUser(supabase)
  const { error } = await supabase
    .from("swot_items")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  await recordSwotSnapshot()
  revalidateSwot()
  return { error: null }
}

export async function deleteSwotItem(id: string) {
  const supabase = await createClient()
  const user = await assertUser(supabase)
  const { error } = await supabase
    .from("swot_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  await recordSwotSnapshot()
  revalidateSwot()
  return { error: null }
}

// ── ACTIONS (Action Plan) ──
export async function getSwotActions(): Promise<SwotAction[]> {
  const supabase = await createClient()
  const user = await assertUser(supabase)
  const { data, error } = await supabase
    .from("swot_actions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []) as SwotAction[]
}

export async function createSwotAction(data: {
  target: string
  langkah_aksi?: string | null
  deadline?: string | null
  progress?: number
  swot_item_id?: string | null
}) {
  const supabase = await createClient()
  const user = await assertUser(supabase)
  const { error } = await supabase.from("swot_actions").insert({
    user_id: user.id,
    target: data.target,
    langkah_aksi: data.langkah_aksi || null,
    deadline: data.deadline || null,
    progress: data.progress ?? 0,
    swot_item_id: data.swot_item_id || null,
  })
  if (error) throw new Error(error.message)
  revalidateSwot()
  return { error: null }
}

export async function updateSwotAction(
  id: string,
  data: Partial<{
    target: string
    langkah_aksi: string | null
    deadline: string | null
    progress: number
    swot_item_id: string | null
  }>
) {
  const supabase = await createClient()
  const user = await assertUser(supabase)
  const { error } = await supabase
    .from("swot_actions")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidateSwot()
  return { error: null }
}

export async function deleteSwotAction(id: string) {
  const supabase = await createClient()
  const user = await assertUser(supabase)
  const { error } = await supabase
    .from("swot_actions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidateSwot()
  return { error: null }
}

// ── HISTORY (snapshot otomatis) ──
export async function getSwotHistory(): Promise<SwotHistoryEntry[]> {
  const supabase = await createClient()
  const user = await assertUser(supabase)
  const { data, error } = await supabase
    .from("swot_history")
    .select("*")
    .eq("user_id", user.id)
    .order("periode", { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)
  return (data || []) as SwotHistoryEntry[]
}

export async function recordSwotSnapshot(periode?: string) {
  const supabase = await createClient()
  const user = await assertUser(supabase)
  const per = periode || new Date().toISOString().slice(0, 10)

  // Jangan duplikat snapshot di hari yang sama
  const { data: existing } = await supabase
    .from("swot_history")
    .select("id")
    .eq("user_id", user.id)
    .eq("periode", per)
    .limit(1)

  const { data: items } = await supabase
    .from("swot_items")
    .select("kategori, status, prioritas")
    .eq("user_id", user.id)
  const { data: actions } = await supabase
    .from("swot_actions")
    .select("progress")
    .eq("user_id", user.id)

  const counts = { strength: 0, weakness: 0, opportunity: 0, threat: 0 }
  let doneItems = 0
  ;(items || []).forEach((it: any) => {
    if (counts[it.kategori as keyof typeof counts] != null) counts[it.kategori as keyof typeof counts]++
    if (it.status === "selesai") doneItems++
  })
  const totalActions = (actions || []).length
  const avgProgress = totalActions > 0
    ? Math.round((actions || []).reduce((s: number, a: any) => s + (a.progress || 0), 0) / totalActions)
    : 0

  const snapshot = { counts, doneItems, totalItems: (items || []).length, avgProgress, totalActions }

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from("swot_history")
      .update({ snapshot, created_at: new Date().toISOString() })
      .eq("id", existing[0].id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from("swot_history")
      .insert({ user_id: user.id, periode: per, snapshot })
    if (error) throw new Error(error.message)
  }
  return { error: null }
}
