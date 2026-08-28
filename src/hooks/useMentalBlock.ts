import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMentalBlockAll, upsertMentalBlock, updateMentalBlock, deleteMentalBlock } from "@/app/actions/mental-block"
import type { MentalBlockFormData } from "@/app/actions/mental-block"
export function useMentalBlockAll() {
  return useQuery({ queryKey: ["mental_block", "all"], queryFn: () => getMentalBlockAll() })
}
export function useUpsertMentalBlock() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (data: MentalBlockFormData) => upsertMentalBlock(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mental_block"] }) })
}
export function useUpdateMentalBlock() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: { masalah?: string; tanggal?: string } }) => updateMentalBlock(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mental_block"] }) })
}
export function useDeleteMentalBlock() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteMentalBlock(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mental_block"] }) })
}
