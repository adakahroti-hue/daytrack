"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const arusKasSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  kategori: z.enum(["uang_masuk", "uang_keluar"]),
  nominal: z.number().int().nonnegative(),
  alasan: z.string().optional(),
  dompet: z.enum(["kebutuhan", "tabungan", "self_reward", "sedekah", "paylater"]).nullable().optional(),
  klasifikasi: z.enum([
    "beli_makanan", "cemilan", "self_reward", "sedekah", "laundry", "bayar_kos", "ojek",
    "jajan", "pencuci_muka", "sabun", "galon_air", "pulsa", "gas_kompor", "pasta_gigi", "sembako",
  ]).nullable().optional(),
})

export type ArusKasFormData = z.infer<typeof arusKasSchema>

export interface ArusKasEntry {
  id: string
  user_id: string
  tanggal: string
  kategori: "uang_masuk" | "uang_keluar"
  nominal: number
  alasan: string | null
  dompet: "kebutuhan" | "tabungan" | "self_reward" | "sedekah" | "paylater" | null
  klasifikasi: "beli_makanan" | "cemilan" | "self_reward" | "sedekah" | "laundry" | "bayar_kos" | "ojek" | "jajan" | "pencuci_muka" | "sabun" | "galon_air" | "pulsa" | "gas_kompor" | "pasta_gigi" | "sembako" | null
  created_at: string
  updated_at: string
}

export async function upsertArusKas(formData: ArusKasFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = arusKasSchema.parse(formData)
  const { data: existing } = await supabase
    .from("arus_kas")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .eq("kategori", validated.kategori)
    .eq("nominal", validated.nominal)
    .eq("alasan", validated.alasan ?? null)
    .maybeSingle()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    kategori: validated.kategori,
    nominal: validated.nominal,
    alasan: validated.alasan ?? null,
    dompet: validated.kategori === "uang_keluar" ? (validated.dompet ?? null) : null,
    klasifikasi: validated.klasifikasi ?? null,
  }

  let data, error
  if (existing) {
    const result = await supabase.from("arus_kas").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("arus_kas").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/arus-kas")
  revalidatePath("/overview/bulanan")
  revalidatePath("/overview/mingguan")
  revalidatePath("/overview/harian")
  return { data, error: null }
}

export async function createArusKas(formData: ArusKasFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = arusKasSchema.parse(formData)
  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    kategori: validated.kategori,
    nominal: validated.nominal,
    alasan: validated.alasan ?? null,
    dompet: validated.kategori === "uang_keluar" ? (validated.dompet ?? null) : null,
    klasifikasi: validated.klasifikasi ?? null,
  }
  const { data, error } = await supabase.from("arus_kas").insert(insertData).select().single()
  if (error) throw new Error(error.message)
  revalidatePath("/arus-kas")
  return { data, error: null }
}

export async function deleteArusKas(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("arus_kas").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/arus-kas")
  return { error: null }
}

// Revisi: update baris arus kas yang sudah ada (dipakai tombol Edit di kolom Aksi)
export async function updateArusKas(id: string, formData: ArusKasFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = arusKasSchema.parse(formData)
  const updateData = {
    tanggal: validated.tanggal,
    kategori: validated.kategori,
    nominal: validated.nominal,
    alasan: validated.alasan ?? null,
    dompet: validated.kategori === "uang_keluar" ? (validated.dompet ?? null) : null,
    klasifikasi: validated.klasifikasi ?? null,
  }
  const { data, error } = await supabase
    .from("arus_kas")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/arus-kas")
  return { data, error: null }
}

export async function getArusKasRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("arus_kas")
    .select("id, user_id, tanggal, kategori, nominal, alasan, dompet, klasifikasi, created_at")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

// Filter "Semua": ambil SELURUH catatan arus kas tanpa batas periode.
export async function getArusKasAll() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("arus_kas")
    .select("id, user_id, tanggal, kategori, nominal, alasan, dompet, klasifikasi, created_at")
    .eq("user_id", user.id)
    .order("tanggal", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}
