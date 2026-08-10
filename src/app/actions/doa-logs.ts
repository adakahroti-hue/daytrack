"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
const doaLogSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  status: z.enum(["sudah", "belum"]),
  untuk_siapa: z.string().optional(),
  keterangan: z.string().optional(),
})
export type DoaLogFormData = z.infer<typeof doaLogSchema>
export interface DoaLogEntry {
  id: string
  user_id: string
  tanggal: string
  status: 'sudah' | 'belum'
  untuk_siapa: string | null
  keterangan: string | null
  created_at: string
  updated_at: string
}
export async function upsertDoaLog(formData: DoaLogFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = doaLogSchema.parse(formData)
  // Check if record exists for this user and date
  const { data: existing } = await supabase
    .from("doa")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .single()
  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    status: validated.status,
    untuk_siapa: validated.untuk_siapa || null,
    keterangan: validated.keterangan || null,
  }
  let data, error
  if (existing) {
    const result = await supabase
      .from("doa")
      .update(insertData)
      .eq("id", existing.id)
      .eq("user_id", user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from("doa")
      .insert(insertData)
      .select()
      .single()
    data = result.data
    error = result.error
  }
  if (error) throw new Error(error.message)
  revalidatePath("/doa")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  return { data, error: null }
}
export async function deleteDoaLog(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("doa")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/doa")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  return { error: null }
}
export async function getDoaLog(tanggal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("doa")
    .select("*")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}
export async function getDoaLogRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("doa")
    .select("*")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}
export async function getDoaDailySummary(tanggal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("doa")
    .select("status")
    .eq("user_id", user.id)
    .eq("tanggal", tanggal)
  if (error) throw new Error(error.message)
  const sudahCount = data?.filter(d => d.status === 'sudah').length || 0
  const totalCount = data?.length || 0
  const persentase = totalCount > 0 ? Math.round((sudahCount / totalCount) * 100) : 0
  return { sudahCount, totalCount, persentase }
}
