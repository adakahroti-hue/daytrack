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

/* ── Ambil goal aktif beserta milestone, step, dan log dalam 1 query (nested) ── */
export async function getActiveGoal(): Promise<GoalData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: goals } = await supabase
    .from("goal")
    .select(`
      id, user_id, title, target_date, is_active, created_at, updated_at,
      goal_milestone (
        id, goal_id, title, description, "order", created_at, updated_at,
        goal_step ( id, milestone_id, title, is_completed, "order", target_date, created_at, updated_at )
      ),
      goal_progress_log (
        id, goal_id, milestone_id, step_id, activity, duration, date, created_at
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const goal = goals as any
  if (!goal) return null

  const milestonesRaw: any[] = goal.goal_milestone || []
  const milestonesWithSteps: GoalMilestone[] = milestonesRaw
    .sort((a: any, b: any) => a.order - b.order)
    .map((m: any) => ({
      id: m.id,
      goal_id: m.goal_id,
      title: m.title,
      description: m.description,
      order: m.order,
      created_at: m.created_at,
      updated_at: m.updated_at,
      steps: (m.goal_step || [])
        .sort((a: any, b: any) => a.order - b.order)
        .map((s: any) => ({
          id: s.id,
          milestone_id: s.milestone_id,
          title: s.title,
          is_completed: s.is_completed,
          order: s.order,
          target_date: s.target_date,
          created_at: s.created_at,
          updated_at: s.updated_at,
        })),
    }))

  const progressLogs = (goal.goal_progress_log || []) as GoalProgressLog[]

  return {
    id: goal.id,
    user_id: goal.user_id,
    title: goal.title,
    target_date: goal.target_date,
    is_active: goal.is_active,
    created_at: goal.created_at,
    updated_at: goal.updated_at,
    milestones: milestonesWithSteps,
    progressLogs,
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
