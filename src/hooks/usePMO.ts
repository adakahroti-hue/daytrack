import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getPMO, 
  getPMORange, 
  getPMOStats, 
  upsertPMO 
} from "@/app/actions/pmo"
import type { PMOFormData } from "@/app/actions/pmo"

export function usePMO(tanggal: string) {
  return useQuery({
    queryKey: ["pmo", tanggal],
    queryFn: () => getPMO(tanggal),
    enabled: !!tanggal,
  })
}

export function usePMORange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["pmo", "range", startDate, endDate],
    queryFn: () => getPMORange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function usePMOStats(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["pmo", "stats", startDate, endDate],
    queryFn: () => getPMOStats(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertPMO() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: PMOFormData) => upsertPMO(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pmo"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}