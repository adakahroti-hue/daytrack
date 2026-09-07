"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getJejakWaktuByPeriod,
  type WaktuPeriod,
  startActivity,
  completeActivity,
  deleteActivity,
  continueActivity,
} from "@/app/actions/jejak-waktu"

export function useJejakWaktu(period: WaktuPeriod = "harian") {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ["jejak-waktu", period] })

  const data = useQuery({
    queryKey: ["jejak-waktu", period],
    queryFn: () => getJejakWaktuByPeriod(period),
    refetchInterval: 15000,
    staleTime: 30000,
    placeholderData: (prev) => prev,
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
