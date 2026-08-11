"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getKeranjangRange,
  createKeranjang,
  updateKeranjang,
  deleteKeranjang,
  beliKeranjang,
} from "@/app/actions/keranjang"
import type { KeranjangFormData } from "@/app/actions/keranjang"

export function useKeranjangRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["keranjang", "range", startDate, endDate],
    queryFn: () => getKeranjangRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}

export function useCreateKeranjang() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: KeranjangFormData) => createKeranjang(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keranjang"] })
    },
  })
}

export function useUpdateKeranjang() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nama_barang?: string; harga?: number; tanggal?: string; dompet?: "kebutuhan" | "tabungan" | "self_reward" | "sedekah" } }) =>
      updateKeranjang(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keranjang"] })
    },
  })
}

export function useDeleteKeranjang() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteKeranjang(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keranjang"] })
    },
  })
}

export function useBeliKeranjang() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => beliKeranjang(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keranjang"] })
      queryClient.invalidateQueries({ queryKey: ["arus-kas"] })
    },
  })
}
