import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMakanLogRange,
  upsertMakanLog,
  deleteMakanLog,
} from "@/app/actions/makan-logs"
import type { MakanLogFormData } from "@/app/actions/makan-logs"

export function useMakanLogRange(startDate: string, endDate: string) {
  return useQuery({ queryKey: ["makan", "range", startDate, endDate], queryFn: () => getMakanLogRange(startDate, endDate), enabled: !!startDate && !!endDate })
}

export function useUpsertMakanLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MakanLogFormData) => upsertMakanLog(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["makan"] }) },
  })
}

export function useDeleteMakanLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMakanLog(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["makan"] }) },
  })
}
