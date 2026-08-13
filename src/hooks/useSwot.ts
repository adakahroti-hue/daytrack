"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getSwotItems,
  getSwotActions,
  getSwotHistory,
  createSwotItem,
  updateSwotItem,
  deleteSwotItem,
  createSwotAction,
  updateSwotAction,
  deleteSwotAction,
  type SwotItem,
  type SwotAction,
  type SwotHistoryEntry,
  type SwotKategori,
  type SwotPrioritas,
  type SwotTren,
  type SwotStatus,
} from "@/app/actions/swot"

export function useSwotItems() {
  return useQuery({
    queryKey: ["swot", "items"],
    queryFn: () => getSwotItems(),
  })
}

export function useSwotActions() {
  return useQuery({
    queryKey: ["swot", "actions"],
    queryFn: () => getSwotActions(),
  })
}

export function useSwotHistory() {
  return useQuery({
    queryKey: ["swot", "history"],
    queryFn: () => getSwotHistory(),
  })
}

export function useCreateSwotItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { kategori: SwotKategori; judul: string; prioritas?: SwotPrioritas; tren?: SwotTren; status?: SwotStatus }) =>
      createSwotItem(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swot"] }),
  })
}

export function useUpdateSwotItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SwotItem> }) => updateSwotItem(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swot"] }),
  })
}

export function useDeleteSwotItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSwotItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swot"] }),
  })
}

export function useCreateSwotAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { target: string; langkah_aksi?: string | null; deadline?: string | null; progress?: number; swot_item_id?: string | null }) =>
      createSwotAction(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swot"] }),
  })
}

export function useUpdateSwotAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SwotAction> }) => updateSwotAction(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swot"] }),
  })
}

export function useDeleteSwotAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSwotAction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swot"] }),
  })
}
