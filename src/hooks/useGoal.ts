"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getGoalRange,
  createGoal,
  updateGoal,
  deleteGoal,
} from "@/app/actions/goal"
import type { GoalFormData } from "@/app/actions/goal"

export function useGoalRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["goal", "range", startDate, endDate],
    queryFn: () => getGoalRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GoalFormData) => createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal"] })
    },
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { tanggal_set?: string; tanggal_deadline?: string; nama_goal?: string; proyeksi_harga?: number; action_harian?: string; langkah_aksi?: string } }) =>
      updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal"] })
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal"] })
    },
  })
}
