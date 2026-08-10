import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getTidurLog, 
  getTidurLogRange, 
  upsertTidurLog, 
  deleteTidurLog,
  getTidurStats 
} from "@/app/actions/tidur-logs"
import type { TidurLogFormData, TidurLogEntry } from "@/app/actions/tidur-logs"
export function useTidurLog(tanggal: string) {
  return useQuery({ queryKey: ["tidur", tanggal], queryFn: () => getTidurLog(tanggal), enabled: !!tanggal })
}
export function useTidurLogRange(startDate: string, endDate: string) {
  return useQuery({ queryKey: ["tidur", "range", startDate, endDate], queryFn: () => getTidurLogRange(startDate, endDate), enabled: !!startDate && !!endDate })
}
export function useTidurStats(startDate: string, endDate: string) {
  return useQuery({ queryKey: ["tidur", "stats", startDate, endDate], queryFn: () => getTidurStats(startDate, endDate), enabled: !!startDate && !!endDate })
}
export function useUpsertTidurLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TidurLogFormData) => upsertTidurLog(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tidur"] }) }
  })
}
export function useDeleteTidurLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTidurLog(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tidur"] }) }
  })
}
