"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Tab "Sedekah" (kategori Ibadah) — pencatatan sedekah.
// Benefit: SATU transaksi bisa punya BANYAK benefit, masing-masing ada tanggalnya.
const JENIS_SEDEKAH = ['subuh', 'jumat', 'rutin', 'spontan', 'lainnya'] as const

const benefitSchema = z.object({
  benefit: z.string().trim().min(1, "Benefit wajib diisi"),
  tanggal_benefit: z.string().trim().min(1, "Tanggal benefit wajib diisi"),
})

const sedekahSchema = z.object({
  tanggal_sedekah: z.string().trim().min(1, "Tanggal sedekah wajib diisi"),
  jenis: z.enum(JENIS_SEDEKAH),
  penerima: z.string().trim().max(200).default(''),
  keterangan: z.string().trim().max(500).default(''),
  nominal: z.coerce.number().min(0),
  cerita: z.string().trim().max(4000).default(''),
  benefits: z.array(benefitSchema).default([]),
})

export type SedekahFormData = z.infer<typeof sedekahSchema>
export type JenisSedekah = (typeof JENIS_SEDEKAH)[number]
export const JENIS_OPTIONS = JENIS_SEDEKAH

export interface SedekahBenefit {
  id: string
  sedekah_id: string
  benefit: string
  tanggal_benefit: string | null
}

export interface SedekahEntry {
  id: string
  user_id: string
  kode: string
  tanggal_sedekah: string
  jenis: JenisSedekah
  penerima: string
  keterangan: string
  nominal: number
  cerita: string
  created_at: string
  updated_at: string
  benefits?: SedekahBenefit[]
}

function genKode(): string {
  // Nomor identitas transaksi: SDK-XXXXXX (huruf+angka acak)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return `SDK-${out}`
}

// Catatan: JANGAN throw — di produksi Next.js menyembunyikan pesan error server
// action (jadi "An error occurred in the Server Components render"), sehingga
// pengguna tak tahu penyebabnya. Kembalikan pesannya sebagai data.
export async function getCatatanSedekahAll(): Promise<{ entries: SedekahEntry[]; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { entries: [], error: "Sesi login berakhir — logout lalu login lagi." }
    const { data, error } = await supabase
      .from("catatan_sedekah")
      .select("*, benefits:catatan_sedekah_benefit(*)")
      .eq("user_id", user.id)
      .order("tanggal_sedekah", { ascending: false })
      .order("created_at", { ascending: false })
    if (error) return { entries: [], error: friendlySedekahError(error) }
    return { entries: (data || []) as SedekahEntry[], error: null }
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : String(e) }
  }
}

function friendlySedekahError(error: { code?: string | null; message: string }): string {
  const m = error.message || ""
  if (error.code === "PGRST205" || error.code === "42P01" || m.includes("schema cache") || m.includes("catatan_sedekah"))
    return "Tabel catatan_sedekah belum ada — jalankan migrasi SQL 20261115000003 di Supabase."
  if (/relationship/i.test(m)) return "Relasi benefit tidak dikenali — jalankan ulang migrasi SQL 20261115000003."
  if (/URL|API key/i.test(m)) return "Konfigurasi Supabase (URL/API key) tidak terbaca di server."
  return m
}

export async function saveCatatanSedekah(id: string | null, formData: SedekahFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const v = sedekahSchema.parse(formData)

  let sedekahId = id
  if (id) {
    const { error } = await supabase
      .from("catatan_sedekah")
      .update({
        tanggal_sedekah: v.tanggal_sedekah,
        jenis: v.jenis,
        penerima: v.penerima,
        keterangan: v.keterangan,
        nominal: v.nominal,
        cerita: v.cerita,
      })
      .eq("id", id)
      .eq("user_id", user.id)
    if (error) throw new Error(error.message)
    // Benefit: ganti semua (hapus lama -> insert baru) — simpel & selalu konsisten
    const { error: delErr } = await supabase
      .from("catatan_sedekah_benefit")
      .delete()
      .eq("sedekah_id", id)
      .eq("user_id", user.id)
    if (delErr) throw new Error(delErr.message)
  } else {
    const { data: created, error } = await supabase
      .from("catatan_sedekah")
      .insert({
        user_id: user.id,
        kode: genKode(),
        tanggal_sedekah: v.tanggal_sedekah,
        jenis: v.jenis,
        penerima: v.penerima,
        keterangan: v.keterangan,
        nominal: v.nominal,
        cerita: v.cerita,
      })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    sedekahId = created.id as string
  }

  if (v.benefits.length > 0) {
    const { error: insErr } = await supabase.from("catatan_sedekah_benefit").insert(
      v.benefits.map((b) => ({
        user_id: user.id,
        sedekah_id: sedekahId,
        benefit: b.benefit,
        tanggal_benefit: b.tanggal_benefit,
      }))
    )
    if (insErr) throw new Error(insErr.message)
  }

  revalidatePath("/sedekah")
  return { error: null }
}

export async function deleteCatatanSedekah(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  // Benefit ikut terhapus (FK ON DELETE CASCADE)
  const { error } = await supabase
    .from("catatan_sedekah")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/sedekah")
  return { error: null }
}
