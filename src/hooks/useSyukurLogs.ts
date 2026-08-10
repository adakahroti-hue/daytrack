import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getSyukurLog, 
  getSyukurLogRange, 
  upsertSyukurLog,
  deleteSyukurLog,
  getSyukurDailySummary
} from "@/app/actions/syukur-logs"
import type { SyukurLogFormData, SyukurLogEntry } from "@/app/actions/syukur-logs"
export function useSyukurLog(tanggal: string) {
  return useQuery({
    queryKey: ["syukur", tanggal],
    queryFn: () => getSyukurLog(tanggal),
    enabled: !!tanggal,
  })
}
export function useSyukurLogRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["syukur", "range", startDate, endDate],
    queryFn: () => getSyukurLogRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}
export function useSyukurDailySummary(tanggal: string) {
  return useQuery({
    queryKey: ["syukur", "summary", tanggal],
    queryFn: () => getSyukurDailySummary(tanggal),
    enabled: !!tanggal,
  })
}
export function useUpsertSyukurLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: SyukurLogFormData) => upsertSyukurLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syukur"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
export function useDeleteSyukurLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => deleteSyukurLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syukur"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
