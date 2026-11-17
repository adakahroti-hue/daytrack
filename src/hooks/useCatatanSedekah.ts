import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getCatatanSedekahAll,
  saveCatatanSedekah,
  deleteCatatanSedekah,
  type SedekahFormData,
} from "@/app/actions/catatan-sedekah"

const KEY = ["catatan-sedekah"]

export function useCatatanSedekahAll() {
  return useQuery({
    queryKey: [...KEY, "all"],
    // Action tidak throw (prod menyembunyikan pesannya) → lempar ulang di sini
    // supaya error.message yang tampil di halaman adalah pesan sebenarnya.
    queryFn: async () => {
      const res = await getCatatanSedekahAll()
      if (res.error) throw new Error(res.error)
      return res.entries
    },
  })
}

export function useSaveSedekah() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string | null; data: SedekahFormData }) =>
      saveCatatanSedekah(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteSedekah() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCatatanSedekah(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
