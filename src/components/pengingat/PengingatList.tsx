"use client"

import { Pencil, Trash2, Bell } from "lucide-react"
import type { Pengingat } from "@/app/actions/pengingat"

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
    <div className="space-y-2">
      {items.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{p.nama}</p>
              <p className="text-xs text-slate-500">
                {p.tanggal ? `📅 ${p.tanggal}` : "Tanggal —"}
                {p.jam ? `  ⏰ ${p.jam}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(p)}
              aria-label="Edit pengingat"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(p.id)}
              aria-label="Hapus pengingat"
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
