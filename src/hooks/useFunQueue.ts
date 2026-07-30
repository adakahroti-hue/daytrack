import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getFunQueue, upsertFunQueue, updateFunQueueStatus, deleteFunQueue } from "@/app/actions/fun-queue"
import type { FunQueueFormData, FunQueueEntry } from "@/app/actions/fun-queue"
export function useFunQueue(status?: string) {
  return useQuery({ queryKey: ["fun_queue", status], queryFn: () => getFunQueue(status) })
}
export function useUpsertFunQueue() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (data: FunQueueFormData) => upsertFunQueue(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fun_queue"] }) })
}
export function useUpdateFunQueueStatus() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: 'ditunda' | 'siap_dinikmati' | 'sedang_dilakukan' | 'selesai' }) => updateFunQueueStatus(id, status), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fun_queue"] }) })
}
export function useDeleteFunQueue() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteFunQueue(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fun_queue"] }) })
}
