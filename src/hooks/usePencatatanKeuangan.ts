import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getPencatatanKeuanganAll,
  createPencatatanKeuangan,
  updatePencatatanKeuangan,
  deletePencatatanKeuangan,
  type KeuanganFormData,
} from "@/app/actions/pencatatan-keuangan"

const KEY = ["pencatatan-keuangan"]

export function usePencatatanKeuanganAll() {
  return useQuery({
    queryKey: [...KEY, "all"],
    // Action tidak throw (prod menyembunyikan pesannya) → lempar ulang di sini
    // supaya error.message yang tampil di halaman adalah pesan sebenarnya.
    queryFn: async () => {
      const res = await getPencatatanKeuanganAll()
      if (res.error) throw new Error(res.error)
      return res.entries
    },
  })
}

export function useCreateKeuangan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: KeuanganFormData) => createPencatatanKeuangan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateKeuangan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KeuanganFormData }) =>
      updatePencatatanKeuangan(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteKeuangan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePencatatanKeuangan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
