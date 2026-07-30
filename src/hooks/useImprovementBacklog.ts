import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getImprovements, upsertImprovement, updateImprovementStatus, deleteImprovement } from "@/app/actions/improvement-backlog"
import type { ImprovementFormData, ImprovementEntry } from "@/app/actions/improvement-backlog"
export function useImprovements(category?: string, status?: string) {
  return useQuery({ queryKey: ["improvement_backlog", category, status], queryFn: () => getImprovements(category, status) })
}
export function useUpsertImprovement() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (data: ImprovementFormData) => upsertImprovement(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["improvement_backlog"] }) })
}
export function useUpdateImprovementStatus() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ id, status, progress }: { id: string; status: 'ide_baru' | 'diprioritaskan' | 'sedang_diperbaiki' | 'menjadi_kebiasaan'; progress?: number }) => updateImprovementStatus(id, status, progress), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["improvement_backlog"] }) })
}
export function useDeleteImprovement() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteImprovement(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["improvement_backlog"] }) })
}
