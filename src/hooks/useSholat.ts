import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getSholat, 
  getSholatRange, 
  upsertSholat,
  toggleSholat 
} from "@/app/actions/sholat"
import type { SholatFormData } from "@/app/actions/sholat"

export function useSholat(tanggal: string) {
  return useQuery({
    queryKey: ["sholat", tanggal],
    queryFn: () => getSholat(tanggal),
    enabled: !!tanggal,
  })
}

export function useSholatRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["sholat", "range", startDate, endDate],
    queryFn: () => getSholatRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertSholat() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: SholatFormData) => upsertSholat(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sholat"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}

export function useToggleSholat() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ tanggal, sholatTime, value, alasan }: { 
      tanggal: string; 
      sholatTime: "subuh" | "dhuha" | "dzuhur" | "ashar" | "maghrib" | "isya"; 
      value: boolean; 
      alasan?: string 
    }) => toggleSholat(tanggal, sholatTime, value, alasan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sholat"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}