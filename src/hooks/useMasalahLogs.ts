import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMasalahLogAll, upsertMasalahLog, updateMasalahLog, deleteMasalahLog } from "@/app/actions/masalah-logs"
import type { MasalahLogFormData, RefleksiKategori } from "@/app/actions/masalah-logs"

export function useMasalahLogAll() {
  return useQuery({ queryKey: ["refleksi", "all"], queryFn: () => getMasalahLogAll() })
}

export function useUpsertMasalahLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (data: MasalahLogFormData) => upsertMasalahLog(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["refleksi"] }) })
}

export function useUpdateMasalahLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { masalah?: string; status?: 'belum' | 'sudah'; kategori?: RefleksiKategori | null } }) => updateMasalahLog(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["refleksi"] }),
  })
}

export function useDeleteMasalahLog() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteMasalahLog(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["refleksi"] }) })
}
