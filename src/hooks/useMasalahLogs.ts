import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMasalahLog, getMasalahLogRange, upsertMasalahLog, updateMasalahLog, deleteMasalahLog } from "@/app/actions/masalah-logs"
import type { MasalahLogFormData } from "@/app/actions/masalah-logs"
export function useMasalahLog(tanggal: string) {
  return useQuery({ queryKey: ["refleksi", tanggal], queryFn: () => getMasalahLog(tanggal), enabled: !!tanggal })
}
export function useMasalahLogRange(startDate: string, endDate: string) {
  return useQuery({ queryKey: ["refleksi", "range", startDate, endDate], queryFn: () => getMasalahLogRange(startDate, endDate), enabled: !!startDate && !!endDate })
}
export function useUpsertMasalahLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (data: MasalahLogFormData) => upsertMasalahLog(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["refleksi"] }) })
}
export function useUpdateMasalahLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: { masalah?: string; solusi?: string; status?: 'belum' | 'sudah'; tanggal?: string } }) => updateMasalahLog(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["refleksi"] }) })
}
export function useDeleteMasalahLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteMasalahLog(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["refleksi"] }) })
}
