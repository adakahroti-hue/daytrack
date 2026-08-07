import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getKesenangan, 
  getKesenanganRange, 
  upsertKesenangan,
  deleteKesenangan,
  createKesenangan,
  updateKesenangan 
} from "@/app/actions/kesenangan"
import type { KesenanganFormData } from "@/app/actions/kesenangan"

export function useKesenangan(tanggal: string) {
  return useQuery({
    queryKey: ["kesenangan", tanggal],
    queryFn: () => getKesenangan(tanggal),
    enabled: !!tanggal,
  })
}

export function useKesenanganRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["kesenangan", "range", startDate, endDate],
    queryFn: () => getKesenanganRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useUpsertKesenangan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: KesenanganFormData) => upsertKesenangan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kesenangan"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}

export function useDeleteKesenangan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteKesenangan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kesenangan"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}

export function useCreateKesenangan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createKesenangan>[0]) => createKesenangan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kesenangan"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}

export function useUpdateKesenangan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { tanggal?: string; hari?: string; kesenangan?: string; status?: "belum" | "sudah" } }) => updateKesenangan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kesenangan"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
  })
}
