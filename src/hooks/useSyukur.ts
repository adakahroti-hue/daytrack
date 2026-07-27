import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getSyukur, 
  getSyukurRange, 
  upsertSyukur 
} from "@/app/actions/syukur"
import type { SyukurFormData } from "@/app/actions/syukur"

export function useSyukur(tanggal: string) {
  return useQuery({
    queryKey: ["syukur", tanggal],
    queryFn: () => getSyukur(tanggal),
    enabled: !!tanggal,
  })
}

export function useSyukurRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["syukur", "range", startDate, endDate],
    queryFn: () => getSyukurRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertSyukur() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: SyukurFormData) => upsertSyukur(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syukur"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}