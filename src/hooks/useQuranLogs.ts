import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getQuranLog, 
  getQuranLogRange, 
  upsertQuranLog,
  deleteQuranLog,
  getQuranDailySummary
} from "@/app/actions/quran-logs"
import type { QuranLogFormData } from "@/app/actions/quran-logs"
export function useQuranLog(tanggal: string) {
  return useQuery({
    queryKey: ["quran_logs", tanggal],
    queryFn: () => getQuranLog(tanggal),
    enabled: !!tanggal,
  })
}
export function useQuranLogRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["quran_logs", "range", startDate, endDate],
    queryFn: () => getQuranLogRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}
export function useQuranDailySummary(tanggal: string) {
  return useQuery({
    queryKey: ["quran_logs", "summary", tanggal],
    queryFn: () => getQuranDailySummary(tanggal),
    enabled: !!tanggal,
  })
}
export function useUpsertQuranLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: QuranLogFormData) => upsertQuranLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quran_logs"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
export function useDeleteQuranLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteQuranLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quran_logs"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
