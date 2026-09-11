"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const GOAL_SELECT = "id, user_id, title, target_date, is_active, created_at, updated_at"

/* ── Tipe data ── */
export interface GoalStep {
  id: string
  milestone_id: string
  title: string
  is_completed: boolean
  order: number
  target_date: string | null
  created_at: string
  updated_at: string
}

export interface GoalMilestone {
  id: string
  goal_id: string
  title: string
  description: string
  order: number
  created_at: string
  updated_at: string
  steps: GoalStep[]
}

export interface GoalProgressLog {
  id: string
  goal_id: string
  milestone_id: string | null
  step_id: string | null
  activity: string
  duration: number
  date: string
  created_at: string
}

export interface GoalData {
  id: string
  user_id: string
  title: string
  target_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  milestones: GoalMilestone[]
  progressLogs: GoalProgressLog[]
}

/* ── Ambil goal aktif beserta milestone, step, dan log ──
   Pakai query terpisah per tabel (bukan nested select) agar tidak bergantung
   nama relasi otomatis Supabase (yang sering salah: singular vs plural). */
export async function getActiveGoal(): Promise<GoalData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // 1) Goal aktif milik user (is_active=true); kalau tidak ada, ambil yang terbaru
  let goalRow: any = null
  const { data: activeRow, error: activeErr } = await supabase
    .from("goal")
    .select("id, user_id, title, target_date, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()
  if (activeErr) throw new Error(activeErr.message)
  if (activeRow) {
    goalRow = activeRow
  } else {
    const { data: latest, error: latestErr } = await supabase
      .from("goal")
      .select("id, user_id, title, target_date, is_active, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestErr) throw new Error(latestErr.message)
    goalRow = latest
  }
  if (!goalRow) return null

  // 2) Milestones + progress logs DIJALANKAN PARALEL (keduanya hanya butuh goal_id) —
  //    sebelumnya beruntun 4 query; ini memangkas 1 round-trip per pemanggilan.
  const [milestonesRes, logsRes] = await Promise.all([
    supabase
      .from("goal_milestone")
      .select("id, goal_id, title, description, \"order\", created_at, updated_at")
      .eq("goal_id", goalRow.id)
      .order("order", { ascending: true }),
    supabase
      .from("goal_progress_log")
      .select("id, goal_id, milestone_id, step_id, activity, duration, date, created_at")
      .eq("goal_id", goalRow.id),
  ])
  const milestonesRaw = milestonesRes.data || []
  if (milestonesRes.error) throw new Error(milestonesRes.error.message)
  if (logsRes.error) throw new Error(logsRes.error.message)
  const logsRaw = logsRes.data || []

  // 3) Steps — difilter by milestone_ids (HINDARI cross-table filter .eq("goal_milestone.goal_id")
  //    yang rawan gagal kalau Supabase tak mendeteksi relasi FK otomatis → throw & crash).
  const milestoneIds = milestonesRaw.map((m: any) => m.id)
  let stepsRaw: any[] = []
  if (milestoneIds.length > 0) {
    const { data, error: sErr } = await supabase
      .from("goal_step")
      .select("id, milestone_id, title, is_completed, \"order\", target_date, created_at, updated_at")
      .in("milestone_id", milestoneIds)
      .order("order", { ascending: true })
    if (sErr) throw new Error(sErr.message)
    stepsRaw = data || []
  }

  // Kelompokkan step per milestone
  const stepsByMilestone: Record<string, GoalStep[]> = {}
  for (const s of stepsRaw) {
    ;(stepsByMilestone[s.milestone_id] ||= []).push(s as GoalStep)
  }

  const milestones: GoalMilestone[] = milestonesRaw.map((m: any) => ({
    id: m.id,
    goal_id: m.goal_id,
    title: m.title,
    description: m.description,
    order: m.order,
    created_at: m.created_at,
    updated_at: m.updated_at,
    steps: (stepsByMilestone[m.id] || []).sort((a, b) => a.order - b.order),
  }))

  return {
    id: goalRow.id,
    user_id: goalRow.user_id,
    title: goalRow.title,
    target_date: goalRow.target_date,
    is_active: goalRow.is_active,
    created_at: goalRow.created_at,
    updated_at: goalRow.updated_at,
    milestones,
    progressLogs: (logsRaw || []) as GoalProgressLog[],
  }
}

/* ── Goal ── */
const goalSchema = z.object({
  title: z.string().min(1, "Nama goal wajib diisi"),
  target_date: z.string().optional().nullable(),
})

export async function createGoal(formData: { title: string; target_date?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = goalSchema.parse(formData)

  // Model MULTI-GOAL: goal lama TIDAK dihapus, hanya dinonaktifkan (is_active=false) bila kolom ada.
  // Insert goal baru sebagai aktif terlebih dahulu (prioritas: data tersimpan), lalu deactivate best-effort.
  const { data, error } = await supabase
    .from("goal")
    .insert({
      user_id: user.id,
      title: validated.title,
      target_date: validated.target_date || null,
      is_active: true,
    })
    .select(GOAL_SELECT)
    .single()
  if (error) throw new Error(error.message)

  // Nonaktifkan goal lain milik user (best-effort: kalau kolom is_active belum ada, diabaikan)
  const { error: deactErr } = await supabase
    .from("goal")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true)
    .neq("id", data.id)
  if (deactErr) {
    console.warn("createGoal: gagal nonaktifkan goal lama (mungkin kolom is_active belum ada):", deactErr.message)
  }

  revalidatePath("/goal")
  return { data, error: null }
}

export async function updateGoal(id: string, formData: { title?: string; target_date?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const updateData: any = {}
  if (formData.title !== undefined) updateData.title = formData.title
  if (formData.target_date !== undefined) updateData.target_date = formData.target_date || null
  const { error } = await supabase.from("goal").update(updateData).eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { error: null }
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("goal").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { error: null }
}

/* ── Daftar semua goal (untuk dropdown ganti goal) ── */
export interface GoalListItem {
  id: string
  title: string
  target_date: string | null
  is_active: boolean
  created_at: string
}

export async function listGoals(): Promise<GoalListItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("goal")
    .select("id, title, target_date, is_active, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []) as GoalListItem[]
}

/* ── Jadikan sebuah goal sebagai aktif (nonaktifkan goal lain) ── */
export async function setActiveGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  // Pastikan goal milik user
  const { data: owned, error: ownErr } = await supabase
    .from("goal")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()
  if (ownErr) throw new Error(ownErr.message)
  if (!owned) throw new Error("Goal tidak ditemukan")
  // Nonaktifkan semua, lalu aktifkan yang dipilih
  const { error: deactErr } = await supabase
    .from("goal")
    .update({ is_active: false })
    .eq("user_id", user.id)
  if (deactErr) throw new Error(deactErr.message)
  const { error: actErr } = await supabase
    .from("goal")
    .update({ is_active: true })
    .eq("id", id)
    .eq("user_id", user.id)
  if (actErr) throw new Error(actErr.message)
  revalidatePath("/goal")
  return { error: null }
}

/* ── Milestone ── */
const milestoneSchema = z.object({
  goal_id: z.string().min(1),
  title: z.string().min(1, "Judul milestone wajib diisi"),
  description: z.string().optional().default(""),
})

export async function createMilestone(formData: { goal_id: string; title: string; description?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = milestoneSchema.parse(formData)
  const { data: existingCount } = await supabase
    .from("goal_milestone")
    .select("id")
    .eq("goal_id", validated.goal_id)
  const order = (existingCount?.length || 0)
  const { error } = await supabase
    .from("goal_milestone")
    .insert({ goal_id: validated.goal_id, title: validated.title, description: validated.description || "", order })
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { error: null }
}

export async function updateMilestone(id: string, formData: { title?: string; description?: string; order?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const updateData: any = {}
  if (formData.title !== undefined) updateData.title = formData.title
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.order !== undefined) updateData.order = formData.order
  const { error } = await supabase
    .from("goal_milestone")
    .update(updateData)
    .eq("id", id)
    .eq("goal_id", (await getGoalIdForMilestone(supabase, id, user.id)))
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { error: null }
}

export async function deleteMilestone(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const goalId = await getGoalIdForMilestone(supabase, id, user.id)
  if (!goalId) throw new Error("Milestone tidak ditemukan")
  const { error } = await supabase.from("goal_milestone").delete().eq("id", id).eq("goal_id", goalId)
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { error: null }
}

async function getGoalIdForMilestone(supabase: any, milestoneId: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("goal_milestone")
    .select("goal_id")
    .eq("id", milestoneId)
    .single()
  if (!data) return null
  const { data: goal } = await supabase.from("goal").select("id").eq("id", data.goal_id).eq("user_id", userId).single()
  return goal ? (data.goal_id as string) : null
}

/* ── Step ── */
const stepSchema = z.object({
  milestone_id: z.string().min(1),
  title: z.string().min(1, "Judul step wajib diisi"),
  target_date: z.string().optional().nullable(),
})

export async function createStep(formData: { milestone_id: string; title: string; target_date?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = stepSchema.parse(formData)
  const { data: existingCount } = await supabase
    .from("goal_step")
    .select("id")
    .eq("milestone_id", validated.milestone_id)
  const order = (existingCount?.length || 0)
  const { error } = await supabase
    .from("goal_step")
    .insert({ milestone_id: validated.milestone_id, title: validated.title, target_date: validated.target_date || null, order })
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { error: null }
}

export async function updateStep(id: string, formData: { title?: string; target_date?: string | null; order?: number; is_completed?: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const updateData: any = {}
  if (formData.title !== undefined) updateData.title = formData.title
  if (formData.target_date !== undefined) updateData.target_date = formData.target_date || null
  if (formData.order !== undefined) updateData.order = formData.order
  if (formData.is_completed !== undefined) updateData.is_completed = formData.is_completed
  const { error } = await supabase.from("goal_step").update(updateData).eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { error: null }
}

export async function toggleStepCompleted(id: string, isCompleted: boolean) {
  return updateStep(id, { is_completed: isCompleted })
}

export async function deleteStep(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("goal_step").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { error: null }
}

/* ── Progress Log ── */
const logSchema = z.object({
  goal_id: z.string().min(1),
  milestone_id: z.string().optional().nullable(),
  step_id: z.string().optional().nullable(),
  activity: z.string().min(1, "Aktivitas wajib diisi"),
  duration: z.number().int().min(0).default(0),
  date: z.string().optional(),
})

export async function addProgressLog(formData: {
  goal_id: string
  milestone_id?: string | null
  step_id?: string | null
  activity: string
  duration?: number
  date?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = logSchema.parse(formData)
  const { error } = await supabase.from("goal_progress_log").insert({
    goal_id: validated.goal_id,
    milestone_id: validated.milestone_id || null,
    step_id: validated.step_id || null,
    activity: validated.activity,
    duration: validated.duration || 0,
    date: validated.date || new Date().toISOString().slice(0, 10),
  })
  if (error) throw new Error(error.message)
  revalidatePath("/goal")
  return { error: null }
}
