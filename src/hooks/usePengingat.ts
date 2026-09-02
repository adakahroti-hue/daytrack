import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getPengingat,
  createPengingat,
  updatePengingat,
  deletePengingat,
} from "@/app/actions/pengingat"

export function usePengingat() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ["pengingat"] })

  const data = useQuery({
    queryKey: ["pengingat"],
    queryFn: getPengingat,
  })

  const create = useMutation({
    mutationFn: (input: { nama: string; tanggal?: string | null; jam?: string | null }) =>
      createPengingat(input),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: (vars: { id: string; data: { nama?: string; tanggal?: string | null; jam?: string | null } }) =>
      updatePengingat(vars.id, vars.data),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deletePengingat(id),
    onSuccess: invalidate,
  })

  return { ...data, create, update, remove }
}
