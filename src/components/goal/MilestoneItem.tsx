import { useState } from "react"
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus, ArrowUp, ArrowDown, MoreVertical, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import type { GoalMilestone, GoalStep } from "@/app/actions/goal"
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
  milestone: GoalMilestone
  index: number
  onToggleStep: (id: string, isCompleted: boolean) => void
  onEditStep: (step: GoalStep) => void
  onDeleteStep: (id: string) => void
  onAddStep: (milestoneId: string) => void
  onEditMilestone: (milestone: GoalMilestone) => void
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
        {/* Rev: nomor = sekaligus tanda centang (satu bulatan saja) */}
        <button
          onClick={() => {
            if (!checked && onToggleAllSteps && total > 0 && !stepsAllDone) {
              // Ada step belum selesai: centang = tandai SEMUA step selesai + milestone
              onToggleAllSteps(milestone.id, true)
            }
            onToggleMilestone?.(milestone.id, !checked)
          }}
          className={cn(
            "shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
            checked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
          aria-label={checked ? "Buka centang milestone" : "Tandai milestone selesai"}
          title={checked ? "Klik untuk buka centang" : "Klik untuk tandai selesai"}
        >
          {checked ? <Check className="h-3.5 w-3.5" /> : index + 1}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold break-words leading-snug", checked ? "text-slate-400 line-through" : "text-slate-900")}>
            {milestone.title}
          </p>
          {milestone.description && (
            <p className="text-xs text-slate-500 line-clamp-1">{milestone.description}</p>
          )}
        </div>
        {/* Rev: aksi (geser/edit/hapus) lewat menu titik tiga — kanan atas card */}
        <div className="flex items-center gap-0.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 sm:p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Menu milestone"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                disabled={!canMoveUp}
                onClick={() => onMove?.(milestone.id, "up")}
              >
                <ArrowUp className="h-3.5 w-3.5 mr-2" /> Naik ke atas
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canMoveDown}
                onClick={() => onMove?.(milestone.id, "down")}
              >
                <ArrowDown className="h-3.5 w-3.5 mr-2" /> Turun ke bawah
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditMilestone(milestone)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteMilestone(milestone.id)} className="text-rose-600 focus:text-rose-600">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Rev: persentase sebaris dengan bar progress */}
      <div className="px-2.5 pb-2 sm:px-3 sm:pb-2">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-900 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">{pct}%</span>
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
