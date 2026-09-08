"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getJejakWaktuByPeriod,
  getJejakWaktuNames,
  type WaktuPeriod,
  startActivity,
  completeActivity,
  deleteActivity,
  continueActivity,
} from "@/app/actions/jejak-waktu"

export function useJejakWaktuNames() {
  return useQuery({
    queryKey: ["jejak-waktu-names"],
    queryFn: getJejakWaktuNames,
    staleTime: 60000,
  })
}

export function useJejakWaktu(period: WaktuPeriod = "harian", anchor: Date = new Date()) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ["jejak-waktu", period, anchor.toISOString().slice(0, 10)] })

  const data = useQuery({
    queryKey: ["jejak-waktu", period, anchor.toISOString().slice(0, 10)],
    queryFn: () => getJejakWaktuByPeriod(period, anchor),
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
