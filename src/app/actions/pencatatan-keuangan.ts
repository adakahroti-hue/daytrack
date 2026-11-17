"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Tab "Arus Kas" (kategori Keuangan) — pencatatan keuangan sederhana:
// no (nomor urut dihitung di UI), jumlah uang, status masuk/keluar, alasan.
const keuanganSchema = z.object({
  jumlah: z.coerce.number().min(0, "Jumlah tidak boleh negatif"),
  status: z.enum(['masuk', 'keluar']),
  alasan: z.string().trim().max(500, "Alasan maksimal 500 karakter").default(''),
})

export type KeuanganFormData = z.infer<typeof keuanganSchema>
export type KeuanganStatus = 'masuk' | 'keluar'

export interface KeuanganEntry {
  id: string
  user_id: string
  jumlah: number
  status: KeuanganStatus
  alasan: string
  created_at: string
  updated_at: string
}

// Catatan: JANGAN throw — di produksi Next.js menyembunyikan pesan error server
// action (jadi "An error occurred in the Server Components render"), sehingga
// pengguna tak tahu penyebabnya. Kembalikan pesannya sebagai data.
export async function getPencatatanKeuanganAll(): Promise<{ entries: KeuanganEntry[]; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { entries: [], error: "Sesi login berakhir — logout lalu login lagi." }
    const { data, error } = await supabase
      .from("pencatatan_keuangan")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (error) return { entries: [], error: friendlyKeuanganError(error) }
    return { entries: (data || []) as KeuanganEntry[], error: null }
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : String(e) }
  }
}

function friendlyKeuanganError(error: { code?: string | null; message: string }): string {
  const m = error.message || ""
  if (error.code === "PGRST205" || error.code === "42P01" || m.includes("schema cache") || m.includes("pencatatan_keuangan"))
    return "Tabel pencatatan_keuangan belum ada — jalankan migrasi SQL 20261115000003 di Supabase."
  if (/URL|API key/i.test(m)) return "Konfigurasi Supabase (URL/API key) tidak terbaca di server."
  return m
}

export async function createPencatatanKeuangan(formData: KeuanganFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const v = keuanganSchema.parse(formData)
  const { error } = await supabase.from("pencatatan_keuangan").insert({
    user_id: user.id,
    jumlah: v.jumlah,
    status: v.status,
    alasan: v.alasan,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/arus-kas")
  return { error: null }
}

export async function updatePencatatanKeuangan(id: string, formData: KeuanganFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const v = keuanganSchema.parse(formData)
  const { error } = await supabase
    .from("pencatatan_keuangan")
    .update({ jumlah: v.jumlah, status: v.status, alasan: v.alasan })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/arus-kas")
  return { error: null }
}

export async function deletePencatatanKeuangan(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("pencatatan_keuangan")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/arus-kas")
  return { error: null }
}
