"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type AlquranBookmark = {
  surah: number
  ayat: number
}

export async function getAlquranBookmark(): Promise<AlquranBookmark> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { data } = await supabase
    .from("alquran_bookmark")
    .select("surah, ayat")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!data) return { surah: 1, ayat: 1 }
  return { surah: data.surah || 1, ayat: data.ayat || 1 }
}

export async function saveAlquranBookmark(input: { surah: number; ayat: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("alquran_bookmark")
    .upsert({ user_id: user.id, surah: input.surah, ayat: input.ayat }, { onConflict: "user_id" })
  if (error) throw new Error(error.message)
  revalidatePath("/alquran")
}
