import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getDoaLog, 
  getDoaLogRange, 
  upsertDoaLog,
  deleteDoaLog,
  getDoaDailySummary
} from "@/app/actions/doa-logs"
import type { DoaLogFormData, DoaLogEntry } from "@/app/actions/doa-logs"
export function useDoaLog(tanggal: string) {
  return useQuery({
    queryKey: ["doa", tanggal],
    queryFn: () => getDoaLog(tanggal),
    enabled: !!tanggal,
  })
}
export function useDoaLogRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["doa", "range", startDate, endDate],
    queryFn: () => getDoaLogRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}
export function useDoaDailySummary(tanggal: string) {
  return useQuery({
    queryKey: ["doa", "summary", tanggal],
    queryFn: () => getDoaDailySummary(tanggal),
    enabled: !!tanggal,
  })
}
export function useUpsertDoaLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: DoaLogFormData) => upsertDoaLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doa"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
export function useDeleteDoaLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteDoaLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doa"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
