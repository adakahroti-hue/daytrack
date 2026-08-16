"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getSwotItems,
  getSwotTopics,
  getSwotActions,
  createSwotItem,
  updateSwotItem,
  deleteSwotItem,
  createSwotTopic,
  renameSwotTopic,
  deleteSwotTopic,
  createSwotAction,
  updateSwotAction,
  deleteSwotAction,
  type SwotItem,
  type SwotTopic,
  type SwotAction,
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

export function useSwotTopics() {
  return useQuery({
    queryKey: ["swot", "topics"],
    queryFn: () => getSwotTopics(),
  })
}

export function useSwotActions(topicId?: string) {
  return useQuery({
    queryKey: ["swot", "actions", topicId ?? "all"],
    queryFn: () => getSwotActions(topicId),
  })
}

export function useCreateSwotItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { topic_id: string; kategori: SwotKategori; judul: string; prioritas?: SwotPrioritas; tren?: SwotTren; status?: SwotStatus }) =>
      createSwotItem(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swot"] }),
  })
}

export function useCreateSwotTopic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (judul: string) => createSwotTopic(judul),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swot"] }),
  })
}

export function useRenameSwotTopic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, judul }: { id: string; judul: string }) => renameSwotTopic(id, judul),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["swot"] }),
  })
}

export function useDeleteSwotTopic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSwotTopic(id),
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
    mutationFn: (data: { topic_id?: string | null; target: string; langkah_aksi?: string | null; deadline?: string | null; progress?: number; swot_item_id?: string | null }) =>
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
