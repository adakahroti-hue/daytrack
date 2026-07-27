"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSaranPerbaikan, upsertSaranPerbaikan, updateSaranPerbaikanStatus, deleteSaranPerbaikan, getSaranPerbaikanRange } from "@/app/actions/saran-perbaikan"
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

export function useUpdateSaranPerbaikanStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "belum" | "proses" | "selesai" }) => updateSaranPerbaikanStatus(id, status),
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