"use client"

// Hooks khusus tab Prioritas — membaca tabel TERPISAH `tugas_prioritas`.
// Query key: ["tugas_prioritas", ...] — TIDAK bercampur dengan ["tugas"],
// sehingga tab Semua / Hari Ini / Overview tidak pernah terpengaruh (dan sebaliknya).

import { useQuery, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"
import {
  createTugasPrioritas,
  updateTugasPrioritas,
  deleteTugasPrioritas,
  bulkDeleteTugasPrioritas,
  toggleTugasPrioritasStatus,
  type TugasPrioritasFormData,
} from "@/app/actions/tugas-prioritas"
import { createClient } from "@/lib/supabase/client"
import { getTaskActiveSeconds } from "@/lib/utils"

// Bentuk row = sama dengan TaskRow tab lain + jenjang (primer/sekunder)
export interface TugasPrioritasRow {
  id: string
  user_id: string
  nama: string
  tanggal: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: 'belum' | 'proses' | 'selesai'
  jenjang: 'primer' | 'sekunder'
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  accumulated_seconds?: number | null
  is_paused?: boolean | null
  last_resumed_at?: string | null
  terlewat_tanggal?: string | null
  group_id?: string | null
  group_order?: number | null
}

async function fetchTugasPrioritas() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("tugas_prioritas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000)
  if (error) throw new Error(error.message)
  return (data || []) as TugasPrioritasRow[]
}

export function useTugasPrioritas() {
  return useQuery({
    queryKey: ["tugas_prioritas"],
    queryFn: fetchTugasPrioritas,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    gcTime: 5 * 60 * 1000,
  })
}

const invalidate = (qc: { invalidateQueries: (o: { queryKey: QueryKey }) => void }) =>
  qc.invalidateQueries({ queryKey: ["tugas_prioritas"] })

export function useCreateTugasPrioritas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TugasPrioritasFormData) => createTugasPrioritas(data),
    onSuccess: (res) => {
      if (res.error) return
      invalidate(queryClient)
    },
  })
}

export function useUpdateTugasPrioritas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TugasPrioritasFormData> }) =>
      updateTugasPrioritas(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["tugas_prioritas"] })
      const previous = queryClient.getQueryData<TugasPrioritasRow[]>(["tugas_prioritas"])
      if (previous) {
        queryClient.setQueryData<TugasPrioritasRow[]>(
          ["tugas_prioritas"],
          previous.map((t) => (t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t))
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tugas_prioritas"], context.previous)
    },
    onSettled: () => invalidate(queryClient),
  })
}

export function useDeleteTugasPrioritas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTugasPrioritas(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tugas_prioritas"] })
      const previous = queryClient.getQueryData<TugasPrioritasRow[]>(["tugas_prioritas"])
      if (previous) {
        queryClient.setQueryData<TugasPrioritasRow[]>(
          ["tugas_prioritas"],
          previous.filter((t) => t.id !== id)
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tugas_prioritas"], context.previous)
    },
    onSettled: () => invalidate(queryClient),
  })
}

export function useBulkDeleteTugasPrioritas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTugasPrioritas(ids),
    onSuccess: () => invalidate(queryClient),
  })
}

export function useToggleTugasPrioritasStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "proses" | "belum" | "selesai" }) =>
      toggleTugasPrioritasStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tugas_prioritas"] })
      const previous = queryClient.getQueryData<TugasPrioritasRow[]>(["tugas_prioritas"])
      const now = new Date().toISOString()
      if (previous) {
        queryClient.setQueryData<TugasPrioritasRow[]>(
          ["tugas_prioritas"],
          previous.map((t) => {
            if (t.id !== id) return t
            const updated: TugasPrioritasRow = { ...t, status, updated_at: now }
            if (status === "proses") {
              updated.started_at = now
              updated.completed_at = null
              updated.accumulated_seconds = 0
              updated.is_paused = false
              updated.last_resumed_at = now
            } else if (status === "selesai") {
              updated.completed_at = now
              updated.is_paused = false
              updated.accumulated_seconds = getTaskActiveSeconds(t)
              updated.last_resumed_at = null
            } else {
              updated.started_at = null
              updated.completed_at = null
              updated.accumulated_seconds = 0
              updated.is_paused = false
              updated.last_resumed_at = null
            }
            return updated
          })
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tugas_prioritas"], context.previous)
    },
    onSettled: () => invalidate(queryClient),
  })
}