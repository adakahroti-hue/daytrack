import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMaafkanAll, upsertMaafkan, updateMaafkan, deleteMaafkan } from "@/app/actions/maafkan"
import type { MaafkanFormData } from "@/app/actions/maafkan"

export function useMaafkanAll() {
  return useQuery({ queryKey: ["maafkan", "all"], queryFn: () => getMaafkanAll() })
}

export function useUpsertMaafkan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MaafkanFormData) => upsertMaafkan(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maafkan"] }),
  })
}

export function useUpdateMaafkan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { tanggal?: string; kejadian?: string; status?: string } }) =>
      updateMaafkan(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maafkan"] }),
  })
}

export function useDeleteMaafkan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMaafkan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maafkan"] }),
  })
}
