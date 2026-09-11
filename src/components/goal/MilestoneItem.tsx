import { useState } from "react"
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus, CheckCircle2, Circle, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { StepItem } from "./StepItem"

export function MilestoneItem({
  milestone,
  index,
  onToggleStep,
  onEditStep,
  onDeleteStep,
  onAddStep,
  onEditMilestone,
  onDeleteMilestone,
  onToggleAllSteps,
  onToggleMilestone,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  milestone: {
    id: string
    title: string
    description: string
    order: number
    is_completed?: boolean
    steps: {
      id: string
      title: string
      is_completed: boolean
      target_date: string | null
    }[]
  }
  index: number
  onToggleStep: (id: string, isCompleted: boolean) => void
  onEditStep: (step: any) => void
  onDeleteStep: (id: string) => void
  onAddStep: (milestoneId: string) => void
  onEditMilestone: (milestone: any) => void
  onDeleteMilestone: (id: string) => void
  onToggleAllSteps?: (milestoneId: string, isCompleted: boolean) => void
  onToggleMilestone?: (milestoneId: string, isCompleted: boolean) => void
  onMove?: (milestoneId: string, direction: "up" | "down") => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}) {
  const [open, setOpen] = useState(false)
  const total = milestone.steps.length
  const done = milestone.steps.filter((s) => s.is_completed).length
  const stepsAllDone = total > 0 && done === total
  // Status centang milestone = dicentang manual ATAU semua step-nya selesai
  const checked = !!milestone.is_completed || stepsAllDone
  const pct = total > 0 ? Math.round((done / total) * 100) : checked ? 100 : 0

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-slate-500 shrink-0"
          aria-label={open ? "Tutup step" : "Buka step"}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button
          onClick={() => {
            if (!checked && onToggleAllSteps && total > 0 && !stepsAllDone) {
              // Ada step belum selesai: centang = tandai SEMUA step selesai + milestone
              onToggleAllSteps(milestone.id, true)
            }
            onToggleMilestone?.(milestone.id, !checked)
          }}
          className={cn(
            "shrink-0 hover:scale-110 transition-transform",
            checked ? "text-slate-900" : "text-slate-300"
          )}
          aria-label={checked ? "Buka centang milestone" : "Tandai milestone selesai"}
          title={checked ? "Klik untuk buka centang" : "Klik untuk tandai selesai"}
        >
          {checked ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
        </button>
        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold break-words leading-snug", checked ? "text-slate-400 line-through" : "text-slate-900")}>
            {milestone.title}
          </p>
          {milestone.description && (
            <p className="text-xs text-slate-500 line-clamp-1">{milestone.description}</p>
          )}
        </div>
        <span className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">{pct}%</span>
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {onMove && (
            <>
              <button
                onClick={() => onMove(milestone.id, "up")}
                disabled={!canMoveUp}
                className="p-1.5 sm:p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                aria-label="Pindah ke atas"
                title="Tukar dengan milestone di atas"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onMove(milestone.id, "down")}
                disabled={!canMoveDown}
                className="p-1.5 sm:p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                aria-label="Pindah ke bawah"
                title="Tukar dengan milestone di bawah"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button onClick={() => onEditMilestone(milestone)} aria-label="Edit milestone" className="p-1.5 sm:p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDeleteMilestone(milestone.id)} aria-label="Hapus milestone" className="p-1.5 sm:p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="px-2.5 pb-2 sm:px-3 sm:pb-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-900 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {open && (
        <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3 space-y-2">
          {total === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada step.</p>
          ) : (
            milestone.steps.map((s, i) => (
              <StepItem
                key={s.id}
                step={s}
                label={`${index + 1}.${String.fromCharCode(97 + i)}.`}
                onToggle={onToggleStep}
                onEdit={onEditStep}
                onDelete={onDeleteStep}
              />
            ))
          )}
          <button
            onClick={() => onAddStep(milestone.id)}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:border-slate-400"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Step
          </button>
        </div>
      )}
    </div>
  )
}
