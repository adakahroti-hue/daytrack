import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getWaterLog, 
  getWaterLogRange, 
  upsertWaterLog, 
  deleteWaterLog,
  getWaterDailySummary 
} from "@/app/actions/minum-air-logs"
import type { WaterLogFormData } from "@/app/actions/minum-air-logs"
export function useWaterLog(tanggal: string) {
  return useQuery({ queryKey: ["minum_air_logs", tanggal], queryFn: () => getWaterLog(tanggal), enabled: !!tanggal })
}
export function useWaterLogRange(startDate: string, endDate: string) {
  return useQuery({ queryKey: ["minum_air_logs", "range", startDate, endDate], queryFn: () => getWaterLogRange(startDate, endDate), enabled: !!startDate && !!endDate })
}
export function useWaterDailySummary(tanggal: string) {
  return useQuery({ queryKey: ["minum_air_logs", "summary", tanggal], queryFn: () => getWaterDailySummary(tanggal), enabled: !!tanggal })
}
export function useUpsertWaterLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (data: WaterLogFormData) => upsertWaterLog(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["minum_air_logs"] }) })
}
export function useDeleteWaterLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteWaterLog(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["minum_air_logs"] }) })
}
