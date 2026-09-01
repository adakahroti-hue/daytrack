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

/* ── Ambil goal aktif beserta milestone, step, dan log ── */
export async function getActiveGoal(): Promise<GoalData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: goals } = await supabase
    .from("goal")
    .select(GOAL_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)

  const goal = (goals && goals[0]) as GoalData | undefined
  if (!goal) return null

  const { data: milestones } = await supabase
    .from("goal_milestone")
    .select("id, goal_id, title, description, \"order\", created_at, updated_at")
    .eq("goal_id", goal.id)
    .order("order", { ascending: true })

  const milestoneIds = (milestones || []).map((m: any) => m.id)
  let steps: GoalStep[] = []
  if (milestoneIds.length > 0) {
    const { data: stepRows } = await supabase
      .from("goal_step")
      .select("id, milestone_id, title, is_completed, \"order\", target_date, created_at, updated_at")
      .in("milestone_id", milestoneIds)
      .order("order", { ascending: true })
    steps = (stepRows || []) as GoalStep[]
  }

  const milestonesWithSteps: GoalMilestone[] = (milestones || []).map((m: any) => ({
    ...m,
    steps: steps.filter((s) => s.milestone_id === m.id),
  }))

  const { data: progressLogs } = await supabase
    .from("goal_progress_log")
    .select("id, goal_id, milestone_id, step_id, activity, duration, date, created_at")
    .eq("goal_id", goal.id)
    .order("date", { ascending: false })

  return {
    ...goal,
    milestones: milestonesWithSteps,
    progressLogs: (progressLogs || []) as GoalProgressLog[],
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
  const { data, error } = await supabase
    .from("goal")
    .insert({ user_id: user.id, title: validated.title, target_date: validated.target_date || null })
    .select(GOAL_SELECT)
    .single()
  if (error) throw new Error(error.message)
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
