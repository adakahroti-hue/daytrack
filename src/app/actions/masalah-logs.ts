"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const masalahLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  masalah: z.string().min(1, "Masalah wajib diisi"),
  kategori: z.enum(['pekerjaan', 'personal', 'kesehatan', 'keuangan', 'hubungan', 'lainnya']).optional(),
  solusi: z.string().optional(),
  status: z.enum(['belum', 'proses', 'selesai']).default('belum'),
  prioritas: z.enum(['rendah', 'sedang', 'tinggi']).default('sedang'),
  catatan: z.string().optional(),
})

export type MasalahLogFormData = z.infer<typeof masalahLogSchema>

export interface MasalahLogEntry {
  id: string
  user_id: string
  tanggal: string
  masalah: string
  kategori: string | null
  solusi: string | null
  status: 'belum' | 'proses' | 'selesai'
  prioritas: 'rendah' | 'sedang' | 'tinggi'
  catatan: string | null
  created_at: string
  updated_at: string
}

export async function upsertMasalahLog(formData: MasalahLogFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = masalahLogSchema.parse(formData)

  const { data: existing } = await supabase
    .from("masalah_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .eq("masalah", validated.masalah)
    .single()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    masalah: validated.masalah,
    kategori: validated.kategori || null,
    solusi: validated.solusi || null,
    status: validated.status,
    prioritas: validated.prioritas,
    catatan: validated.catatan || null,
  }

  let data, error
  if (existing) {
    const result = await supabase.from("masalah_logs").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("masalah_logs").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/masalah"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { data, error: null }
}

export async function deleteMasalahLog(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("masalah_logs").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/masalah"); revalidatePath("/overview/harian"); revalidatePath("/overview/mingguan"); revalidatePath("/overview/bulanan")
  return { error: null }
}

export async function getMasalahLog(tanggal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("masalah_logs").select("*").eq("user_id", user.id).eq("tanggal", tanggal).order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getMasalahLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("masalah_logs").select("*").eq("user_id", user.id).gte("tanggal", startDate).lte("tanggal", endDate).order("tanggal", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getMasalahStats(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase.from("masalah_logs").select("status, prioritas, kategori").eq("user_id", user.id).gte("tanggal", startDate).lte("tanggal", endDate)
  if (error) throw new Error(error.message)
  
  const logs = data || []
  const belum = logs.filter(l => l.status === 'belum').length
  const proses = logs.filter(l => l.status === 'proses').length
  const selesai = logs.filter(l => l.status === 'selesai').length
  const tinggi = logs.filter(l => l.prioritas === 'tinggi').length
  
  return { belum, proses, selesai, tinggi, total: logs.length }
}