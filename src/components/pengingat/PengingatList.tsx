"use client"

import type { Pengingat } from "@/app/actions/pengingat"
import { PengingatCard } from "./PengingatCard"

export function PengingatList({
  items,
  onEdit,
  onDelete,
}: {
  items: Pengingat[]
  onEdit: (p: Pengingat) => void
  onDelete: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Belum ada pengingat. Tambah pengingat pertama kamu.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((p) => (
        <PengingatCard key={p.id} pengingat={p} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
