"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const improvementSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi"),
  category: z.enum(['ibadah', 'mental', 'kesehatan', 'produktivitas', 'finansial', 'lingkungan', 'hubungan', 'lainnya']).default('lainnya'),
  priority: z.enum(['rendah', 'sedang', 'tinggi', 'urgent']).default('sedang'),
  reason: z.string().optional(),
  status: z.enum(['ide_baru', 'diprioritaskan', 'sedang_diperbaiki', 'menjadi_kebiasaan']).default('ide_baru'),
  target_date: z.string().optional(),
  progress: z.number().int().min(0).max(100).default(0),
})

export type ImprovementFormData = z.infer<typeof improvementSchema>

export interface ImprovementEntry {
  id: string
  user_id: string
  title: string
  category: string
  priority: 'rendah' | 'sedang' | 'tinggi' | 'urgent'
  reason: string | null
  status: 'ide_baru' | 'diprioritaskan' | 'sedang_diperbaiki' | 'menjadi_kebiasaan'
  target_date: string | null
  started_at: string | null
  completed_at: string | null
  progress: number
  created_at: string
  updated_at: string
}

export async function upsertImprovement(formData: ImprovementFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = improvementSchema.parse(formData)

  const { data, error } = await supabase.from("improvement_backlog").insert({
    user_id: user.id,
    title: validated.title,
    category: validated.category,
    priority: validated.priority,
    reason: validated.reason || null,
    status: validated.status,
    target_date: validated.target_date || null,
    progress: validated.progress,
    started_at: (validated.status === 'sedang_diperbaiki' || validated.status === 'menjadi_kebiasaan') ? new Date().toISOString().split('T')[0] : null,
    completed_at: validated.status === 'menjadi_kebiasaan' ? new Date().toISOString().split('T')[0] : null,
  }).select().single()

  if (error) throw new Error(error.message)
  revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}

export async function updateImprovementStatus(id: string, status: 'ide_baru' | 'diprioritaskan' | 'sedang_diperbaiki' | 'menjadi_kebiasaan', progress?: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const updateData: any = { status }
  if (progress !== undefined) updateData.progress = progress
  if (status === 'sedang_diperbaiki') updateData.started_at = new Date().toISOString().split('T')[0]
  if (status === 'menjadi_kebiasaan') { updateData.completed_at = new Date().toISOString().split('T')[0]; updateData.progress = 100 }

  const { data, error } = await supabase.from("improvement_backlog").update(updateData).eq("id", id).eq("user_id", user.id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}

export async function deleteImprovement(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("improvement_backlog").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { error: null }
}

export async function getImprovements(category?: string, status?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  
  let query = supabase.from("improvement_backlog").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  if (category) query = query.eq("category", category)
  if (status) query = query.eq("status", status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

export async function getImprovementStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("improvement_backlog").select("status, category, priority").eq("user_id", user.id)
  if (error) throw new Error(error.message)
  
  const logs = data || []
  const total = logs.length
  const ide = logs.filter(l => l.status === 'ide_baru').length
  const diprioritaskan = logs.filter(l => l.status === 'diprioritaskan').length
  const diperbaiki = logs.filter(l => l.status === 'sedang_diperbaiki').length
  const kebiasaan = logs.filter(l => l.status === 'menjadi_kebiasaan').length
  const tinggi = logs.filter(l => l.priority === 'tinggi' || l.priority === 'urgent').length
  
  return { total, ide, diprioritaskan, diperbaiki, kebiasaan, tinggi }
}