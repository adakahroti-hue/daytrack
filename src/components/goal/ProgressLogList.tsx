import { Clock } from "lucide-react"

export function ProgressLogList({
  logs,
}: {
  logs: {
    id: string
    activity: string
    duration: number
    date: string
    milestone_id: string | null
    step_id: string | null
  }[]
}) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
        Belum ada catatan progress harian.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <Clock className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-900">{log.activity}</p>
            <p className="text-[11px] text-slate-400">{log.date}</p>
          </div>
          {log.duration > 0 && (
            <span className="shrink-0 text-xs font-medium text-slate-600 tabular-nums">{log.duration} mnt</span>
          )}
        </div>
      ))}
    </div>
  )
}
