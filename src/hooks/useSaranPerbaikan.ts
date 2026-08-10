"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSaranPerbaikan, upsertSaranPerbaikan, deleteSaranPerbaikan, getSaranPerbaikanRange, createSaranPerbaikan, updateSaranPerbaikan } from "@/app/actions/saran-perbaikan"
import { SaranPerbaikanFormData } from "@/app/actions/saran-perbaikan"

export function useSaranPerbaikan(tanggal: string) {
  return useQuery({
    queryKey: ["saran-perbaikan", tanggal],
    queryFn: () => getSaranPerbaikan(tanggal),
    enabled: !!tanggal,
  })
}

export function useSaranPerbaikanRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["saran-perbaikan", "range", startDate, endDate],
    queryFn: () => getSaranPerbaikanRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertSaranPerbaikan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: SaranPerbaikanFormData) => upsertSaranPerbaikan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saran-perbaikan"] })
    },
  })
}

export function useDeleteSaranPerbaikan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteSaranPerbaikan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saran-perbaikan"] })
    },
  })
}

export function useCreateSaranPerbaikan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SaranPerbaikanFormData) => createSaranPerbaikan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saran-perbaikan"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}

export function useUpdateSaranPerbaikan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { tanggal?: string; hari?: string; saran?: string } }) => updateSaranPerbaikan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saran-perbaikan"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
