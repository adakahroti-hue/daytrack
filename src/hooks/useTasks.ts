"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createTask, updateTask, deleteTask, toggleTaskStatus, bulkDeleteTasks, bulkResetTasks, bulkUpdateTaskDate, pauseTask, resumeTask, reorderTaskGroup } from "@/app/actions/tasks"
import { createClient } from "@/lib/supabase/client"
import { getTaskActiveSeconds } from "@/lib/utils"
import { TaskFormData } from "@/app/actions/tasks"

// Baca langsung browser -> Supabase (RLS membatasi ke user sendiri).
// Jauh lebih cepat dari server action: satu round-trip, tanpa getUser() + serialisasi action.
async function fetchTasksDirect(date?: string, status?: string, limit?: number) {
  const supabase = createClient()
  // select("*"): aman sebelum migrasi & otomatis memuat kolom baru (terlewat_tanggal)
  let query = supabase.from("tugas").select("*")
  if (date) {
    query = query.eq("tanggal", date).order("created_at", { ascending: true })
  } else {
    query = query.order("created_at", { ascending: false }).limit(limit ?? 200)
  }
  if (status) query = query.eq("status", status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

export function useTasks(date?: string, status?: string) {
  return useQuery({
    queryKey: ["tugas", date, status],
    // Tanpa filter tanggal: ambil hingga 2000 task terbaru (cukup untuk UI tab Tugas + hindari terpotongnya task terlambat).
    // Dengan filter tanggal: tanpa limit (ambil semua task hari itu).
    queryFn: () => fetchTasksDirect(date, status, date ? undefined : 2000),
    staleTime: 60 * 1000, // 1 menit — hindari refetch berulang saat pindah tab
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // keep previous data saat refetch
    gcTime: 5 * 60 * 1000, // garbage collect setelah 5 menit tidak dipakai
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TaskFormData) => createTask(data),
    onSuccess: (res) => {
      // res.error berisi pesan asli dari Supabase (tidak disensor oleh Next.js)
      if (res.error) {
        try {
          import("sonner").then(({ toast }) => {
            toast.error(`Gagal menyimpan tugas: ${res.error}`)
          })
        } catch {
          alert(`Gagal menyimpan tugas: ${res.error}`)
        }
        return
      }
      // Sukses — refresh list tugas
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
    onError: (error) => {
      // Fallback kalau mutation gagal total (network dll)
      console.error("[createTask] gagal:", error)
      try {
        import("sonner").then(({ toast }) => {
          toast.error(`Gagal menyimpan tugas: ${(error as Error)?.message || "unknown error"}`)
        })
      } catch {
        alert(`Gagal menyimpan tugas: ${(error as Error)?.message || "unknown error"}`)
      }
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskFormData> }) => updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["tugas"] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ["tugas"] })
      queryClient.setQueriesData({ queryKey: ["tugas"] }, (old: any) => {
        if (!old) return old
        return old.map((task: any) => task.id === id ? { ...task, ...data, updated_at: new Date().toISOString() } : task)
      })
      return { previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([key, data]: any) => queryClient.setQueryData(key, data))
      }
    },
    onSettled: () => {
      // Only invalidate, no refetch if data is fresh (staleTime: 30s)
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tugas"] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ["tugas"] })
      queryClient.setQueriesData({ queryKey: ["tugas"] }, (old: any) => {
        if (!old) return old
        return old.filter((task: any) => task.id !== id)
      })
      return { previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([key, data]: any) => queryClient.setQueryData(key, data))
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
  })
}

export function useToggleTaskStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "proses" | "belum" | "selesai" | "ide" }) => toggleTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tugas"] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ["tugas"] })
      const now = new Date().toISOString()
      queryClient.setQueriesData({ queryKey: ["tugas"] }, (old: any) => {
        if (!old) return old
        return old.map((task: any) => {
          if (task.id !== id) return task
          const updated: any = { ...task, status, updated_at: now }
          if (status === 'proses') {
            // Mulai: reset timer aktif, catat waktu mulai (sama dengan server action)
            updated.started_at = now
            updated.completed_at = null
            updated.accumulated_seconds = 0
            updated.is_paused = false
            updated.last_resumed_at = now
          } else if (status === 'selesai') {
            // Selesai: simpan total detik aktif (tanpa waktu pause) secara optimistik
            updated.completed_at = now
            updated.is_paused = false
            updated.accumulated_seconds = getTaskActiveSeconds(task)
            updated.last_resumed_at = null
          } else if (status === 'belum') {
            updated.started_at = null
            updated.completed_at = null
            updated.accumulated_seconds = 0
            updated.is_paused = false
            updated.last_resumed_at = null
          }
          return updated
        })
      })
      return { previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([key, data]: any) => queryClient.setQueryData(key, data))
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
  })
}

export function usePauseTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => pauseTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tugas"] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ["tugas"] })
      const now = new Date().toISOString()
      queryClient.setQueriesData({ queryKey: ["tugas"] }, (old: any) => {
        if (!old) return old
        return old.map((task: any) => {
          if (task.id !== id) return task
          return { ...task, is_paused: true, accumulated_seconds: getTaskActiveSeconds(task), last_resumed_at: null, updated_at: now }
        })
      })
      return { previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([key, data]: any) => queryClient.setQueryData(key, data))
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
  })
}

export function useResumeTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => resumeTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tugas"] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ["tugas"] })
      const now = new Date().toISOString()
      queryClient.setQueriesData({ queryKey: ["tugas"] }, (old: any) => {
        if (!old) return old
        return old.map((task: any) => {
          if (task.id !== id) return task
          return { ...task, is_paused: false, last_resumed_at: now, updated_at: now }
        })
      })
      return { previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([key, data]: any) => queryClient.setQueryData(key, data))
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
  })
}

export function useTaskById(id: string) {
  return useQuery({
    queryKey: ["tugas", id],
    queryFn: () => getTaskById(id),
    enabled: !!id,
  })
}

// Baca task dalam 1 paket goal (by group_id) -> untuk progress card Goal Utama.
export function useTasksByGroup(groupId?: string | null) {
  return useQuery({
    queryKey: ["tugas", "group", groupId],
    queryFn: async () => {
      if (!groupId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from("tugas")
        .select("*")
        .eq("group_id", groupId)
        .order("group_order", { ascending: true })
      if (error) throw new Error(error.message)
      return data || []
    },
    enabled: !!groupId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  })
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTasks(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
  })
}

export function useBulkResetTasks() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ids: string[]) => bulkResetTasks(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
  })
}

export function useBulkUpdateTaskDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ids, tanggal }: { ids: string[]; tanggal: string }) => bulkUpdateTaskDate(ids, tanggal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
  })
}

export function useReorderTaskGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ upId, downId }: { upId: string; downId: string }) => reorderTaskGroup(upId, downId),
    onMutate: async ({ upId, downId }) => {
      await queryClient.cancelQueries({ queryKey: ["tugas"] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ["tugas"] })
      queryClient.setQueriesData({ queryKey: ["tugas"] }, (old: any) => {
        if (!old) return old
        const a = old.find((t: any) => t.id === upId)
        const b = old.find((t: any) => t.id === downId)
        if (!a || !b || a.group_order == null || b.group_order == null) return old
        const oa = a.group_order
        const ob = b.group_order
        return old.map((t: any) => {
          if (t.id === upId) return { ...t, group_order: ob }
          if (t.id === downId) return { ...t, group_order: oa }
          return t
        })
      })
      return { previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([key, data]: any) => queryClient.setQueryData(key, data))
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tugas"] })
    },
  })
}

async function getTaskById(id: string) {
  const response = await fetch(`/api/tasks/${id}`)
  if (!response.ok) throw new Error("Failed to fetch task")
  return response.json()
}