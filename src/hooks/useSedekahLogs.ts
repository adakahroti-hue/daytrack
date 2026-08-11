import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getSedekahLog,
  getSedekahLogRange,
  upsertSedekahLog,
  deleteSedekahLog,
  getSedekahDailySummary,
} from "@/app/actions/sedekah-logs"
import type { SedekahLogFormData, SedekahLogEntry } from "@/app/actions/sedekah-logs"
export function useSedekahLog(tanggal: string) {
  return useQuery({
    queryKey: ["sedekah", tanggal],
    queryFn: () => getSedekahLog(tanggal),
    enabled: !!tanggal,
  })
}
export function useSedekahLogRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["sedekah", "range", startDate, endDate],
    queryFn: () => getSedekahLogRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}
export function useSedekahDailySummary(tanggal: string) {
  return useQuery({
    queryKey: ["sedekah", "summary", tanggal],
    queryFn: () => getSedekahDailySummary(tanggal),
    enabled: !!tanggal,
  })
}
export function useUpsertSedekahLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SedekahLogFormData) => upsertSedekahLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sedekah"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
export function useDeleteSedekahLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSedekahLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sedekah"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
