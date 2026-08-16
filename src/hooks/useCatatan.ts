import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getCatatanAll,
  createCatatan,
  updateCatatan,
  deleteCatatan,
} from "@/app/actions/catatan"
import type { CatatanFormData } from "@/app/actions/catatan"

export function useCatatanAll() {
  return useQuery({
    queryKey: ["catatan", "all"],
    queryFn: () => getCatatanAll(),
  })
}

export function useCreateCatatan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CatatanFormData) => createCatatan(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catatan"] }),
  })
}

export function useUpdateCatatan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { judul?: string; isi?: string; warna?: "yellow" | "green" | "blue" | "pink" | "orange" } }) =>
      updateCatatan(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catatan"] }),
  })
}

export function useDeleteCatatan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCatatan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["catatan"] }),
  })
}
