"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createTask, updateTask, deleteTask, toggleTaskStatus, bulkDeleteTasks, bulkResetTasks } from "@/app/actions/tasks"
import { createClient } from "@/lib/supabase/client"
import { TaskFormData } from "@/app/actions/tasks"

const TASK_SELECT_FIELDS =
  "id, user_id, nama, tanggal, estimasi_menit, prioritas, status, created_at, updated_at, started_at, completed_at"

// Baca langsung browser -> Supabase (RLS membatasi ke user sendiri).
// Jauh lebih cepat dari server action: satu round-trip, tanpa getUser() + serialisasi action.
async function fetchTasksDirect(date?: string, status?: string, limit?: number) {
  const supabase = createClient()
  let query = supabase.from("tasks").select(TASK_SELECT_FIELDS)
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
    queryKey: ["tasks", date, status],
    queryFn: () => fetchTasksDirect(date, status, date ? undefined : 200),
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
    onSuccess: () => {
      // Only invalidate the specific task queries, not all of them
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskFormData> }) => updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ["tasks"] })
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) => {
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ["tasks"] })
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) => {
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useToggleTaskStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "proses" | "belum" | "selesai" }) => toggleTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] })
      const previousTasks = queryClient.getQueriesData({ queryKey: ["tasks"] })
      const now = new Date().toISOString()
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: any) => {
        if (!old) return old
        return old.map((task: any) => {
          if (task.id !== id) return task
          const updated: any = { ...task, status, updated_at: now }
          if (status === 'proses') updated.started_at = now
          else if (status === 'selesai') updated.completed_at = now
          else if (status === 'belum') { updated.started_at = null; updated.completed_at = null }
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useTaskById(id: string) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => getTaskById(id),
    enabled: !!id,
  })
}

export function useBulkDeleteTasks() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteTasks(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useBulkResetTasks() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (ids: string[]) => bulkResetTasks(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

async function getTaskById(id: string) {
  const response = await fetch(`/api/tasks/${id}`)
  if (!response.ok) throw new Error("Failed to fetch task")
  return response.json()
}