// Revisi batch 24: skeleton loading untuk kartu analytics (recharts di-load lazy via next/dynamic)
export function AnalyticsSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 animate-pulse" aria-hidden="true">
      <div className="h-4 w-40 rounded bg-slate-100" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-100" />
        ))}
      </div>
      <div className="h-28 rounded-lg bg-slate-100" />
    </div>
  )
}
