"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import {
  createIdea,
  updateIdea,
  deleteIdea,
  promoteIdea,
  type Idea,
  type IdeaFormData,
} from "@/app/actions/bank-ide"

async function fetchIdeas(): Promise<Idea[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("bank_ide")
    .select("id, user_id, catatan, created_at, updated_at")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export function useBankIde() {
  return useQuery({
    queryKey: ["bank_ide"],
    queryFn: fetchIdeas,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    gcTime: 5 * 60 * 1000,
  })
}

export function useCreateIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: IdeaFormData) => createIdea(data),
    onSuccess: (res) => {
      if (res.error) {
        try {
          import("sonner").then(({ toast }) => toast.error(`Gagal menyimpan ide: ${res.error}`))
        } catch {
          alert(`Gagal menyimpan ide: ${res.error}`)
        }
        return
      }
      queryClient.invalidateQueries({ queryKey: ["bank_ide"] })
    },
    onError: (error) => {
      console.error("[createIdea] gagal:", error)
      try {
        import("sonner").then(({ toast }) => toast.error(`Gagal menyimpan ide: ${(error as Error)?.message || "unknown error"}`))
      } catch {
        alert(`Gagal menyimpan ide: ${(error as Error)?.message || "unknown error"}`)
      }
    },
  })
}

export function useUpdateIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IdeaFormData> }) => updateIdea(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["bank_ide"] })
      const previous = queryClient.getQueriesData({ queryKey: ["bank_ide"] })
      queryClient.setQueriesData({ queryKey: ["bank_ide"] }, (old: any) => {
        if (!old) return old
        return old.map((it: any) => (it.id === id ? { ...it, ...data, updated_at: new Date().toISOString() } : it))
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]: any) => queryClient.setQueryData(key, data))
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["bank_ide"] }),
  })
}

export function useDeleteIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteIdea(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["bank_ide"] })
      const previous = queryClient.getQueriesData({ queryKey: ["bank_ide"] })
      queryClient.setQueriesData({ queryKey: ["bank_ide"] }, (old: any) => {
        if (!old) return old
        return old.filter((it: any) => it.id !== id)
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]: any) => queryClient.setQueryData(key, data))
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["bank_ide"] }),
  })
}

export function usePromoteIdea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, taskData }: { id: string; taskData: { nama: string; tanggal?: string; estimasi_menit: number; prioritas: "p1" | "p2" | "p3" | "p4" } }) =>
      promoteIdea(id, taskData),
    onSuccess: (res) => {
      if (res.error) {
        try {
          import("sonner").then(({ toast }) => toast.error(`Gagal menjadikan tugas: ${res.error}`))
        } catch {
          alert(`Gagal menjadikan tugas: ${res.error}`)
        }
        return
      }
      queryClient.invalidateQueries({ queryKey: ["bank_ide"] })
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
    onError: (error) => {
      console.error("[promoteIdea] gagal:", error)
      try {
        import("sonner").then(({ toast }) => toast.error(`Gagal menjadikan tugas: ${(error as Error)?.message || "unknown error"}`))
      } catch {
        alert(`Gagal menjadikan tugas: ${(error as Error)?.message || "unknown error"}`)
      }
    },
  })
}
