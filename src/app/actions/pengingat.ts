"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const pengingatSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  tanggal: z.string().nullable().optional(),
  jam: z.string().nullable().optional(),
})

export type Pengingat = {
  id: string
  user_id: string
  nama: string
  tanggal: string | null
  jam: string | null
  created_at: string
  updated_at: string
}

export async function getPengingat(): Promise<Pengingat[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data } = await supabase
    .from("pengingat")
    .select("id, user_id, nama, tanggal, jam, created_at, updated_at")
    .eq("user_id", user.id)
    .order("tanggal", { ascending: true, nullsFirst: false })
    .order("jam", { ascending: true, nullsFirst: false })
  return (data || []) as Pengingat[]
}

export async function createPengingat(input: unknown) {
  const validated = pengingatSchema.parse(input)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("pengingat")
    .insert({ user_id: user.id, ...validated })
  if (error) throw new Error(error.message)
  revalidatePath("/tugas/pengingat")
}

export async function updatePengingat(id: string, input: unknown) {
  const validated = pengingatSchema.partial().parse(input)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("pengingat")
    .update(validated)
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/tugas/pengingat")
}

export async function deletePengingat(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("pengingat")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/tugas/pengingat")
}
