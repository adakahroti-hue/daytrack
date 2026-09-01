import { Target } from "lucide-react"
import { cn } from "@/lib/utils"

export function GoalHeader({
  goalTitle,
  goalProgress,
  targetDate,
}: {
  goalTitle: string
  goalProgress: number
  targetDate: string | null
}) {
  const pct = Math.max(0, Math.min(100, Math.round(goalProgress)))
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-900">
        <Target className="h-4 w-4" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">Goal Aktif</h2>
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900">{goalTitle || "—"}</p>
      {targetDate && (
        <p className="mt-0.5 text-xs text-slate-500">Target: {targetDate}</p>
      )}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span className="font-semibold text-slate-900 tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full bg-slate-900 transition-all duration-700 ease-out")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
