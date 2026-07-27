import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getQuran, 
  getQuranRange, 
  upsertQuran, 
  toggleQuran 
} from "@/app/actions/quran"
import type { QuranFormData } from "@/app/actions/quran"

export function useQuran(tanggal: string) {
  return useQuery({
    queryKey: ["quran", tanggal],
    queryFn: () => getQuran(tanggal),
    enabled: !!tanggal,
  })
}

export function useQuranRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["quran", "range", startDate, endDate],
    queryFn: () => getQuranRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertQuran() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: QuranFormData) => upsertQuran(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quran"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}

export function useToggleQuran() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      tanggal, 
      quranTime, 
      value, 
      alasan 
    }: { 
      tanggal: string
      quranTime: "setelah_subuh" | "setelah_dzuhur" | "setelah_ashar" | "setelah_maghrib" | "setelah_isya"
      value: boolean
      alasan?: string
    }) => toggleQuran(tanggal, quranTime, value, alasan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quran"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}