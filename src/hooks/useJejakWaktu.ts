"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getJejakWaktuToday,
  startActivity,
  completeActivity,
  deleteActivity,
  continueActivity,
} from "@/app/actions/jejak-waktu"

export function useJejakWaktu() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ["jejak-waktu"] })

  const data = useQuery({
    queryKey: ["jejak-waktu"],
    queryFn: getJejakWaktuToday,
    refetchInterval: 15000,
  })

  const start = useMutation({
    mutationFn: (input: { name: string }) => startActivity(input),
    onSuccess: invalidate,
  })

  const complete = useMutation({
    mutationFn: (id: string) => completeActivity(id),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: invalidate,
  })

  const continueMut = useMutation({
    mutationFn: (name: string) => continueActivity({ name }),
    onSuccess: invalidate,
  })

  return { ...data, start, complete, remove, continue: continueMut }
}
