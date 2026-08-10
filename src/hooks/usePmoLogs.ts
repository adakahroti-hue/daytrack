import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getPmoLog, getPmoLogRange, upsertPmoLog, deletePmoLog } from "@/app/actions/pmo-logs"
import type { PmoLogFormData } from "@/app/actions/pmo-logs"
export function usePmoLog(tanggal: string) {
  return useQuery({ queryKey: ["pmo", tanggal], queryFn: () => getPmoLog(tanggal), enabled: !!tanggal })
}
export function usePmoLogRange(startDate: string, endDate: string) {
  return useQuery({ queryKey: ["pmo", "range", startDate, endDate], queryFn: () => getPmoLogRange(startDate, endDate), enabled: !!startDate && !!endDate })
}
export function useUpsertPmoLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (data: PmoLogFormData) => upsertPmoLog(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pmo"] }) })
}
export function useDeletePmoLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deletePmoLog(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pmo"] }) })
}
