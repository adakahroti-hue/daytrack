import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getKesenangan, 
  getKesenanganRange, 
  upsertKesenangan 
} from "@/app/actions/kesenangan"
import type { KesenanganFormData } from "@/app/actions/kesenangan"

export function useKesenangan(tanggal: string) {
  return useQuery({
    queryKey: ["kesenangan", tanggal],
    queryFn: () => getKesenangan(tanggal),
    enabled: !!tanggal,
  })
}

export function useKesenanganRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["kesenangan", "range", startDate, endDate],
    queryFn: () => getKesenanganRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertKesenangan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: KesenanganFormData) => upsertKesenangan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kesenangan"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}