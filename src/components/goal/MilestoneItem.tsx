import { useState } from "react"
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from "lucide-react"
import { StepItem } from "./StepItem"

export function MilestoneItem({
  milestone,
  onToggleStep,
  onEditStep,
  onDeleteStep,
  onAddStep,
  onEditMilestone,
  onDeleteMilestone,
}: {
  milestone: {
    id: string
    title: string
    description: string
    order: number
    steps: {
      id: string
      title: string
      is_completed: boolean
      target_date: string | null
    }[]
  }
  onToggleStep: (id: string, isCompleted: boolean) => void
  onEditStep: (step: any) => void
  onDeleteStep: (id: string) => void
  onAddStep: (milestoneId: string) => void
  onEditMilestone: (milestone: any) => void
  onDeleteMilestone: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const total = milestone.steps.length
  const done = milestone.steps.filter((s) => s.is_completed).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 p-3">
        <button onClick={() => setOpen((o) => !o)} className="text-slate-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{milestone.title}</p>
          {milestone.description && (
            <p className="text-xs text-slate-500 line-clamp-1">{milestone.description}</p>
          )}
        </div>
        <span className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">{pct}%</span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEditMilestone(milestone)} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDeleteMilestone(milestone.id)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-900 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {total === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada step.</p>
          ) : (
            milestone.steps.map((s) => (
              <StepItem
                key={s.id}
                step={s}
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
