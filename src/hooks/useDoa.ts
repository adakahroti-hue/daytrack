import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getDoa, 
  getDoaRange, 
  upsertDoa 
} from "@/app/actions/doa"
import type { DoaFormData } from "@/app/actions/doa"

export function useDoa(tanggal: string) {
  return useQuery({
    queryKey: ["doa", tanggal],
    queryFn: () => getDoa(tanggal),
    enabled: !!tanggal,
  })
}

export function useDoaRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["doa", "range", startDate, endDate],
    queryFn: () => getDoaRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertDoa() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: DoaFormData) => upsertDoa(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doa"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}