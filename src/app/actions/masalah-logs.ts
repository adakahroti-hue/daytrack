"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
const masalahLogSchema = z.object({
  masalah: z.string().min(1, "Masalah wajib diisi"),
  status: z.enum(['belum', 'sudah']).default('belum'),
  kategori: z.enum(['kebiasaan_berpikir', 'kebiasaan_bertindak', 'kebiasaan_bersikap', 'kebiasaan_berbicara']).optional().nullable(),
})

export type MasalahLogFormData = z.infer<typeof masalahLogSchema>

export type RefleksiKategori = 'kebiasaan_berpikir' | 'kebiasaan_bertindak' | 'kebiasaan_bersikap' | 'kebiasaan_berbicara'

export interface MasalahLogEntry {
  id: string
  user_id: string
  masalah: string
  status: 'belum' | 'sudah'
  kategori: RefleksiKategori | null
  created_at: string
  updated_at: string
}

export async function upsertMasalahLog(formData: MasalahLogFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = masalahLogSchema.parse(formData)

  const { data: existing } = await supabase
    .from("refleksi")
    .select("id")
    .eq("user_id", user.id)
    .eq("masalah", validated.masalah)
    .single()

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    masalah: validated.masalah,
    status: validated.status,
  }
  // kategori: best-effort — kalau kolom belum ada di DB (42703), simpan tanpa kategori
  if (validated.kategori) insertData.kategori = validated.kategori

  let data, error
  if (existing) {
    let result = await supabase.from("refleksi").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    if (result.error && validated.kategori && /42703|column .* does not exist/i.test(result.error.message)) {
      const { kategori, ...rest } = insertData as Record<string, unknown>
      result = await supabase.from("refleksi").update(rest).eq("id", existing.id).eq("user_id", user.id).select().single()
    }
    data = result.data; error = result.error
  } else {
    let result = await supabase.from("refleksi").insert(insertData).select().single()
    if (result.error && validated.kategori && /42703|column .* does not exist/i.test(result.error.message)) {
      const { kategori, ...rest } = insertData as Record<string, unknown>
      result = await supabase.from("refleksi").insert(rest).select().single()
    }
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/masalah");
  return { data, error: null }
}

export async function updateMasalahLog(id: string, formData: { masalah?: string; status?: 'belum' | 'sudah'; kategori?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const updateData: Record<string, unknown> = {}
  if (formData.masalah !== undefined) updateData.masalah = formData.masalah
  if (formData.status !== undefined) updateData.status = formData.status
  if (formData.kategori !== undefined) updateData.kategori = formData.kategori || null

  let result = await supabase
    .from("refleksi")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()
  // Toleran DB lama: kolom kategori belum ada (42703) → ulangi tanpa kategori
  if (result.error && formData.kategori !== undefined && /42703|column .* does not exist/i.test(result.error.message)) {
    const { kategori, ...rest } = updateData
    result = await supabase.from("refleksi").update(rest).eq("id", id).eq("user_id", user.id).select().single()
  }

  if (result.error) throw new Error(result.error.message)
  revalidatePath("/masalah"); 
  return { data: result.data, error: null }
}

export async function deleteMasalahLog(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("refleksi").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/masalah");
  return { error: null }
}


// Tampilkan SELURUH refleksi (journal) — tidak dibatasi periode tanggal.
export async function getMasalahLogAll() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  let { data, error } = await supabase
    .from("refleksi")
    .select("id, user_id, masalah, status, kategori, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  // Toleran DB lama: kolom kategori belum ada → retry tanpa kategori
  if (error && /42703|column .* does not exist/i.test(error.message)) {
    const res = await supabase
      .from("refleksi")
      .select("id, user_id, masalah, status, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    data = (res.data || []).map((r: any) => ({ ...r, kategori: null }))
    error = res.error
  }
  if (error) throw new Error(error.message)
  return data || []
}
