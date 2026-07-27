"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const taskSchema = z.object({
  nama: z.string().min(1, "Nama tugas wajib diisi"),
  tanggal_jam: z.string().min(1, "Tanggal dan jam wajib diisi"),
  estimasi_menit: z.number().int().min(0).default(0),
  prioritas: z.enum(["p1", "p2", "p3", "p4"]).default("p3"),
  aspek: z.enum(["psikis", "produktivitas", "keuangan", "hubungan"]).default("produktivitas"),
  deadline: z.string().optional(),
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
      tanggal_jam: new Date(validated.tanggal_jam).toISOString(),
      deadline: validated.deadline ? new Date(validated.deadline).toISOString() : null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/jadwal-tugas")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { data, error: null }
}

export async function updateTask(id: string, formData: Partial<TaskFormData>) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = taskSchema.partial().parse(formData)
  
  const updateData: any = { ...validated }
  if (validated.tanggal_jam) updateData.tanggal_jam = new Date(validated.tanggal_jam).toISOString()
  if (validated.deadline) updateData.deadline = new Date(validated.deadline).toISOString()

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/jadwal-tugas")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
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

  revalidatePath("/jadwal-tugas")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
  return { error: null }
}

export async function toggleTaskStatus(id: string, status: "proses" | "belum" | "selesai") {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/jadwal-tugas")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  
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
    .order("tanggal_jam", { ascending: true })

  if (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    query = query.gte("tanggal_jam", start.toISOString()).lte("tanggal_jam", end.toISOString())
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