"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getArusKasRange,
  createArusKas,
  deleteArusKas,
  updateArusKas,
} from "@/app/actions/arus-kas"
import type { ArusKasFormData } from "@/app/actions/arus-kas"

export function useArusKasRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["arus-kas", "range", startDate, endDate],
    queryFn: () => getArusKasRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useCreateArusKas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ArusKasFormData) => createArusKas(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arus-kas"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}

export function useDeleteArusKas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteArusKas(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arus-kas"] })
    },
  })
}

export function useUpdateArusKas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ArusKasFormData }) => updateArusKas(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["arus-kas"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
