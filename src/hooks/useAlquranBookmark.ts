"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getAlquranBookmark, saveAlquranBookmark } from "@/app/actions/alquran-bookmark"

export function useAlquranBookmark() {
  const qc = useQueryClient()
  const data = useQuery({
    queryKey: ["alquran-bookmark"],
    queryFn: getAlquranBookmark,
  })
  const save = useMutation({
    mutationFn: (input: { surah: number; ayat: number }) => saveAlquranBookmark(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alquran-bookmark"] }),
  })
  return { ...data, save }
}
