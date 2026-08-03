"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getTasks, createTask, updateTask, deleteTask, toggleTaskStatus, bulkDeleteTasks, bulkResetTasks } from "@/app/actions/tasks"
import { TaskFormData } from "@/app/actions/tasks"

export function useTasks(date?: string, status?: string) {
  return useQuery({
    queryKey: ["tasks", date, status],
    queryFn: () => getTasks(date, status, date ? undefined : 200),
    staleTime: 60_000, // 1 menit — tidak fetch ulang kalau data masih fresh
    placeholderData: (previousData) => previousData, // keep previous data saat refetch
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: TaskFormData) => createTask(data),
    onSuccess: () => {
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