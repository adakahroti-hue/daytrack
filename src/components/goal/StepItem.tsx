import { CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react"

export function StepItem({
  step,
  onToggle,
  onEdit,
  onDelete,
}: {
  step: {
    id: string
    title: string
    is_completed: boolean
    target_date: string | null
  }
  onToggle: (id: string, isCompleted: boolean) => void
  onEdit: (step: any) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white">
      <button
        onClick={() => onToggle(step.id, !step.is_completed)}
        className="shrink-0 text-slate-900"
        aria-label={step.is_completed ? "Tandai belum selesai" : "Tandai selesai"}
      >
        {step.is_completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-slate-300" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={step.is_completed ? "text-sm text-slate-400 line-through" : "text-sm text-slate-900"}>
          {step.title}
        </p>
        {step.target_date && (
          <p className="text-[11px] text-slate-400">Target: {step.target_date}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(step)} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onDelete(step.id)} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
