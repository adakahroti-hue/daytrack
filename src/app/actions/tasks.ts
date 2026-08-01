"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const taskSchema = z.object({
  nama: z.string().min(1, "Nama tugas wajib diisi"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  estimasi_menit: z.number().int().min(0).default(0),
  prioritas: z.enum(["p1", "p2", "p3", "p4"]).default("p3"),
  status: z.enum(["proses", "belum", "selesai"]).default("belum"),
})

export type TaskFormData = z.infer<typeof taskSchema>

export async function createTask(formData: TaskFormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = taskSchema.parse(formData)

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...validated,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/overview")

  return { data, error: null }
}

export async function updateTask(id: string, formData: Partial<TaskFormData>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = taskSchema.partial().parse(formData)

  const { data, error } = await supabase
    .from("tasks")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/overview")

  return { data, error: null }
}

export async function deleteTask(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/overview")

  return { error: null }
}

export async function toggleTaskStatus(id: string, status: "proses" | "belum" | "selesai") {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const now = new Date().toISOString()

  let updateData: { status: string; started_at?: string | null; completed_at?: string | null } = { status }

  if (status === 'proses') {
    // Capture start time when task is picked up
    updateData.started_at = now
  } else if (status === 'selesai') {
    // Capture completion time when task is marked done
    updateData.completed_at = now
  } else if (status === 'belum') {
    // Reset times when going back to belum
    updateData.started_at = null
    updateData.completed_at = null
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/hari-ini")
  revalidatePath("/tugas/semua")
  revalidatePath("/overview")

  return { data, error: null }
}

export async function getTasks(date?: string, status?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("tanggal", { ascending: true })

  if (date) {
    // Filter by date only (tanggal is DATE type)
    query = query.eq("tanggal", date)
  }

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data || []
}

export async function getTaskById(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error) throw new Error(error.message)
  return data
}