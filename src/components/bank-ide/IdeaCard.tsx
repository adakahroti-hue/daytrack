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
      className="group cursor-pointer rounded-[13px] border border-slate-200 bg-white p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-h-[3.5rem]" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              aria-label="Menu ide"
              className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
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
