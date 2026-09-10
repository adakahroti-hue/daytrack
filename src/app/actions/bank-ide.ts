"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const ideaSchema = z.object({
  catatan: z.string().min(1, "Catatan ide wajib diisi"),
})

export type IdeaFormData = z.infer<typeof ideaSchema>

export interface Idea {
  id: string
  user_id: string
  catatan: string
  created_at: string
  updated_at: string
}

const IDEA_SELECT = "id, user_id, catatan, created_at, updated_at"

export async function createIdea(formData: IdeaFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Unauthorized" as string }

  const validated = ideaSchema.parse(formData)

  const { data, error } = await supabase
    .from("bank_ide")
    .insert({ catatan: validated.catatan, user_id: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message as string }

  revalidatePath("/tugas/bank-ide")
  return { data, error: null }
}

export async function updateIdea(id: string, formData: Partial<IdeaFormData>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const validated = ideaSchema.partial().parse(formData)

  const { data, error } = await supabase
    .from("bank_ide")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message as string }

  revalidatePath("/tugas/bank-ide")
  return { data, error: null }
}

export async function deleteIdea(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from("bank_ide")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/tugas/bank-ide")
  return { error: null }
}

// "Jadikan Tugas": pindahkan ide -> tugas (status 'belum'), lalu hapus dari bank_ide.
export async function promoteIdea(id: string, taskData: {
  nama: string
  tanggal?: string
  estimasi_menit: number
  prioritas: "p1" | "p2" | "p3" | "p4"
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" as string }

  // Ambil ide
  const { data: idea, error: fetchErr } = await supabase
    .from("bank_ide")
    .select(IDEA_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .single()
  if (fetchErr) return { error: fetchErr.message }
  if (!idea) return { error: "Ide tidak ditemukan" }

  // Buat tugas baru dari ide (gunakan createTask untuk konsistensi)
  const { createTask } = await import("@/app/actions/tasks")
  const res = await createTask({
    nama: taskData.nama,
    tanggal: taskData.tanggal,
    estimasi_menit: taskData.estimasi_menit,
    prioritas: taskData.prioritas,
    status: "belum",
  })
  if (res.error) return { error: res.error }

  // Hapus ide setelah berhasil dipromosikan
  const { error: delErr } = await supabase
    .from("bank_ide")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (delErr) return { error: delErr.message }

  revalidatePath("/tugas/bank-ide")
  revalidatePath("/tugas/semua")
  revalidatePath("/tugas/hari-ini")
  revalidatePath("/overview")
  return { error: null }
}
