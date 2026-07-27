import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getMinumAir, 
  getMinumAirRange, 
  upsertMinumAir, 
  toggleMinumAir 
} from "@/app/actions/minum-air"
import type { MinumAirFormData } from "@/app/actions/minum-air"

export function useMinumAir(tanggal: string) {
  return useQuery({
    queryKey: ["minum-air", tanggal],
    queryFn: () => getMinumAir(tanggal),
    enabled: !!tanggal,
  })
}

export function useMinumAirRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["minum-air", "range", startDate, endDate],
    queryFn: () => getMinumAirRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertMinumAir() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: MinumAirFormData) => upsertMinumAir(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minum-air"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}

export function useToggleMinumAir() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      tanggal, 
      time, 
      value 
    }: { 
      tanggal: string
      time: "setelah_bangun" | "pertengahan_pagi" | "setelah_dzuhur" | "sebelum_maghrib" | "setelah_ashar" | "setelah_isya"
      value: boolean
    }) => toggleMinumAir(tanggal, time, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minum-air"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}