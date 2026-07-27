import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getTidur, 
  getTidurRange, 
  upsertTidur 
} from "@/app/actions/tidur"
import type { TidurFormData } from "@/app/actions/tidur"

export function useTidur(tanggal: string) {
  return useQuery({
    queryKey: ["tidur", tanggal],
    queryFn: () => getTidur(tanggal),
    enabled: !!tanggal,
  })
}

export function useTidurRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["tidur", "range", startDate, endDate],
    queryFn: () => getTidurRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertTidur() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: TidurFormData) => upsertTidur(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tidur"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}