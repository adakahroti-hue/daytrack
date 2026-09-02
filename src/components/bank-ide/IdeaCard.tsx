"use client"

import { MoreHorizontal, Pencil, Trash2, ArrowRightCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { TaskCardTask } from "@/components/tasks/TaskCard"

// Palet background lembut (mirip aksen tab Semua) — tiap card dapat warna beda berdasarkan id
const IDE_BG = [
  "bg-rose-50 border-rose-200 hover:border-rose-300",
  "bg-orange-50 border-orange-200 hover:border-orange-300",
  "bg-amber-50 border-amber-200 hover:border-amber-300",
  "bg-lime-50 border-lime-200 hover:border-lime-300",
  "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
  "bg-teal-50 border-teal-200 hover:border-teal-300",
  "bg-sky-50 border-sky-200 hover:border-sky-300",
  "bg-indigo-50 border-indigo-200 hover:border-indigo-300",
  "bg-fuchsia-50 border-fuchsia-200 hover:border-fuchsia-300",
  "bg-pink-50 border-pink-200 hover:border-pink-300",
]

function ideaBg(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return IDE_BG[h % IDE_BG.length]
}

export function IdeaCard({
  task,
  onEdit,
  onDelete,
  onPromote,
}: {
  task: TaskCardTask
  onEdit: (task: TaskCardTask) => void
  onDelete: (id: string) => void
  onPromote: (id: string) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(task)}
      onKeyDown={(e) => { if (e.key === "Enter") onEdit(task) }}
      className={`group cursor-pointer rounded-[13px] border p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${ideaBg(task.id)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-h-[3.5rem]" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              aria-label="Menu ide"
              className="shrink-0 rounded p-1 text-slate-500 opacity-0 transition-opacity hover:bg-black/5 hover:text-slate-700 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(task) }}>
              <Pencil className="h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPromote(task.id) }}>
              <ArrowRightCircle className="h-4 w-4" /> Jadikan Tugas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
            >
              <Trash2 className="h-4 w-4" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="line-clamp-4 text-[15px] font-medium leading-relaxed text-slate-900">
        {task.nama}
      </p>
    </div>
  )
}
