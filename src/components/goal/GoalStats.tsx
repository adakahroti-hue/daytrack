import { CheckCircle2, CalendarDays, Clock, ListChecks } from "lucide-react"

export function GoalStats({
  completedSteps,
  totalSteps,
  activeDays,
  totalDuration,
  targetDate,
}: {
  completedSteps: number
  totalSteps: number
  activeDays: number
  totalDuration: number
  targetDate: string | null
}) {
  const fmtDuration = (m: number) => {
    const h = Math.floor(m / 60)
    const r = m % 60
    if (h > 0) return `${h}j ${r}m`
    return `${r}m`
  }
  const items = [
    { icon: ListChecks, label: "Step Selesai", value: `${completedSteps}/${totalSteps}` },
    { icon: CalendarDays, label: "Hari Aktif", value: `${activeDays}` },
    { icon: Clock, label: "Total Waktu", value: fmtDuration(totalDuration) },
    { icon: CheckCircle2, label: "Target", value: targetDate || "—" },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <it.icon className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wide">{it.label}</span>
          </div>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{it.value}</p>
        </div>
      ))}
    </div>
  )
}
