import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMasalahLog, getMasalahLogRange, upsertMasalahLog, deleteMasalahLog } from "@/app/actions/masalah-logs"
import type { MasalahLogFormData } from "@/app/actions/masalah-logs"
export function useMasalahLog(tanggal: string) {
  return useQuery({ queryKey: ["masalah_logs", tanggal], queryFn: () => getMasalahLog(tanggal), enabled: !!tanggal })
}
export function useMasalahLogRange(startDate: string, endDate: string) {
  return useQuery({ queryKey: ["masalah_logs", "range", startDate, endDate], queryFn: () => getMasalahLogRange(startDate, endDate), enabled: !!startDate && !!endDate })
}
export function useUpsertMasalahLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (data: MasalahLogFormData) => upsertMasalahLog(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["masalah_logs"] }) })
}
export function useDeleteMasalahLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteMasalahLog(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["masalah_logs"] }) })
}
