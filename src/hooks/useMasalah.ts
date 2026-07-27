import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getMasalah, 
  getMasalahRange, 
  upsertMasalah,
  updateMasalahStatus,
  deleteMasalah
} from "@/app/actions/masalah"
import type { MasalahFormData } from "@/app/actions/masalah"

export function useMasalah(tanggal: string) {
  return useQuery({
    queryKey: ["masalah", tanggal],
    queryFn: () => getMasalah(tanggal),
    enabled: !!tanggal,
  })
}

export function useMasalahRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["masalah", "range", startDate, endDate],
    queryFn: () => getMasalahRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertMasalah() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: MasalahFormData) => upsertMasalah(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masalah"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}

export function useUpdateMasalahStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "belum" | "sudah" }) => updateMasalahStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masalah"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}

export function useDeleteMasalah() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteMasalah(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masalah"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}