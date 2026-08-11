"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const keranjangSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  nama_barang: z.string().min(1, "Nama barang wajib diisi"),
  harga: z.number().int().nonnegative(),
  status: z.enum(["belum", "sudah"]).default("belum"),
})

export type KeranjangFormData = z.infer<typeof keranjangSchema>

export interface KeranjangEntry {
  id: string
  user_id: string
  tanggal: string
  nama_barang: string
  harga: number
  status: "belum" | "sudah"
  created_at: string
  updated_at: string
}

export async function upsertKeranjang(formData: KeranjangFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = keranjangSchema.parse(formData)
  const { data: existing } = await supabase
    .from("keranjang")
    .select("id")
    .eq("user_id", user.id)
    .eq("tanggal", validated.tanggal)
    .eq("nama_barang", validated.nama_barang)
    .eq("harga", validated.harga)
    .maybeSingle()

  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    nama_barang: validated.nama_barang,
    harga: validated.harga,
    status: validated.status,
  }

  let data, error
  if (existing) {
    const result = await supabase.from("keranjang").update(insertData).eq("id", existing.id).eq("user_id", user.id).select().single()
    data = result.data; error = result.error
  } else {
    const result = await supabase.from("keranjang").insert(insertData).select().single()
    data = result.data; error = result.error
  }

  if (error) throw new Error(error.message)
  revalidatePath("/keranjang")
  return { data, error: null }
}

export async function createKeranjang(formData: KeranjangFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const validated = keranjangSchema.parse(formData)
  const insertData = {
    user_id: user.id,
    tanggal: validated.tanggal,
    nama_barang: validated.nama_barang,
    harga: validated.harga,
    status: validated.status,
  }
  const { data, error } = await supabase.from("keranjang").insert(insertData).select().single()
  if (error) throw new Error(error.message)
  revalidatePath("/keranjang")
  return { data, error: null }
}

export async function updateKeranjang(id: string, formData: { nama_barang?: string; harga?: number; tanggal?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const updateData: Record<string, any> = {}
  if (formData.tanggal !== undefined) updateData.tanggal = formData.tanggal
  if (formData.nama_barang !== undefined) updateData.nama_barang = formData.nama_barang
  if (formData.harga !== undefined) updateData.harga = formData.harga
  const { data, error } = await supabase.from("keranjang").update(updateData).eq("id", id).eq("user_id", user.id).select().single()
  if (error) throw new Error(error.message)
  revalidatePath("/keranjang")
  return { data, error: null }
}

export async function deleteKeranjang(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("keranjang").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/keranjang")
  return { error: null }
}

export async function getKeranjangRange(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("keranjang")
    .select("id, user_id, tanggal, nama_barang, harga, status, created_at")
    .eq("user_id", user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Tandai keranjang sebagai "sudah" dibeli, lalu:
 *  - pindah ke arus_kas sebagai uang_keluar (nominal = harga, alasan = nama_barang)
 *  - hapus baris keranjang (langsung hilang dari tabel keranjang)
 */
export async function beliKeranjang(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: item, error: fetchErr } = await supabase
    .from("keranjang")
    .select("id, tanggal, nama_barang, harga")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchErr) throw new Error(fetchErr.message)
  if (!item) throw new Error("Item keranjang tidak ditemukan")

  // 1. Insert ke arus_kas (uang_keluar)
  const { error: insertErr } = await supabase.from("arus_kas").insert({
    user_id: user.id,
    tanggal: item.tanggal,
    kategori: "uang_keluar",
    nominal: item.harga,
    alasan: item.nama_barang,
  })
  if (insertErr) throw new Error(insertErr.message)

  // 2. Hapus dari keranjang
  const { error: delErr } = await supabase.from("keranjang").delete().eq("id", id).eq("user_id", user.id)
  if (delErr) throw new Error(delErr.message)

  revalidatePath("/keranjang")
  revalidatePath("/arus-kas")
  return { error: null }
}
