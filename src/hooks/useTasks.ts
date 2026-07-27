"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getTasks, createTask, updateTask, deleteTask, toggleTaskStatus } from "@/app/actions/tasks"
import { TaskFormData } from "@/app/actions/tasks"

export function useTasks(date?: string, status?: string) {
  return useQuery({
    queryKey: ["tasks", date, status],
    queryFn: () => getTasks(date, status),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useToggleTaskStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "proses" | "belum" | "selesai" }) => toggleTaskStatus(id, status),
    onSuccess: () => {
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

async function getTaskById(id: string) {
  const response = await fetch(`/api/tasks/${id}`)
  if (!response.ok) throw new Error("Failed to fetch task")
  return response.json()
}