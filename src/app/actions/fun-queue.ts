"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
const funQueueSchema = z.object({
  nama_kesenangan: z.string().min(1, "Nama kesenangan wajib diisi"),
  kategori: z.enum(['hiburan', 'hobi', 'makanan', 'travel', 'belanja', 'sosial', 'istirahat', 'lainnya']).default('hiburan'),
  prioritas: z.enum(['rendah', 'sedang', 'tinggi']).default('sedang'),
  status: z.enum(['ditunda', 'siap_dinikmati', 'sedang_dilakukan', 'selesai']).default('ditunda'),
  target_selesai: z.string().optional(),
  catatan: z.string().optional(),
  syarat_claim: z.string().optional(),
})
export type FunQueueFormData = z.infer<typeof funQueueSchema>
export interface FunQueueEntry {
  id: string
  user_id: string
  nama_kesenangan: string
  kategori: string
  prioritas: 'rendah' | 'sedang' | 'tinggi'
  status: 'ditunda' | 'siap_dinikmati' | 'sedang_dilakukan' | 'selesai'
  target_selesai: string | null
  tanggal_dilakukan: string | null
  catatan: string | null
  syarat_claim: string | null
  created_at: string
  updated_at: string
}
export async function upsertFunQueue(formData: FunQueueFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = funQueueSchema.parse(formData)
  const { data, error } = await supabase.from("fun_queue").insert({
    user_id: user.id,
    nama_kesenangan: validated.nama_kesenangan,
    kategori: validated.kategori,
    prioritas: validated.prioritas,
    status: validated.status,
    target_selesai: validated.target_selesai || null,
    catatan: validated.catatan || null,
    syarat_claim: validated.syarat_claim || null,
  }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath("/kesenangan"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}
export async function updateFunQueueStatus(id: string, status: 'ditunda' | 'siap_dinikmati' | 'sedang_dilakukan' | 'selesai') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const updateData: any = { status }
  if (status === 'selesai') updateData.tanggal_dilakukan = new Date().toISOString().split('T')[0]
  if (status === 'sedang_dilakukan') updateData.tanggal_dilakukan = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase.from("fun_queue").update(updateData).eq("id", id).eq("user_id", user.id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath("/kesenangan"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}
export async function deleteFunQueue(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("fun_queue").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/kesenangan"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { error: null }
}
export async function getFunQueue(status?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  let query = supabase.from("fun_queue").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  if (status) query = query.eq("status", status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}
