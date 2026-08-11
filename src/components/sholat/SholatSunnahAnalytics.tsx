'use client'

import { useMemo } from 'react'
import {
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types (mirror struktur row tabel sholat_sunnah) ───────────────

export type SholatSunnahLogRow = Record<string, boolean | number | string | null | undefined>

interface SholatColumn {
  key: string
  label: string
}

interface SholatSunnahAnalyticsProps {
  dates: string[]
  sholatMap: Record<string, SholatSunnahLogRow | undefined>
  columns: readonly SholatColumn[]
  alasanLabels: Record<string, string>
}

const PASTEL_DONUT_COLORS = [
  '#FDA4AF',
  '#93C5FD',
  '#FCD34D',
  '#86EFAC',
  '#C4B5FD',
  '#7DD3FC',
  '#FDBA74',
  '#A5B4FC',
  '#F9A8D4',
]

const RADIAN = Math.PI / 180

// Label persentase putih di dalam potongan donut
const renderDonutLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, payload, percent } = props
  const radius = innerRadius + (outerRadius - innerRadius) / 2
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const pct = payload?.percent ?? Math.round((percent ?? 0) * 100)
  return (
    <text x={x} y={y} fill="#ffffff" fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central">
      {`${pct}%`}
    </text>
  )
}

// ─── Card wrapper (konsisten design system Daytrack) ──────────────

function AnalyticsCard({
  title,
  subtitle,
  children,
  insight,
  insightTone,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  insight: React.ReactNode | null
  insightTone: 'red' | 'amber' | 'blue'
}) {
  const toneClass =
    insightTone === 'red'
      ? 'bg-rose-50 text-rose-700 border-rose-100'
      : insightTone === 'amber'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-blue-50 text-blue-700 border-blue-100'
  return (
    <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-[#374151] rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col gap-4 min-w-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#0F172A] dark:text-white leading-tight">
            {title}
            <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          </h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="min-h-[200px]">{children}</div>
      {insight && (
        <div className={cn('mt-auto rounded-lg border px-3 py-2 text-xs font-medium', toneClass)}>
          {insight}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center px-4">
      <p className="text-xs text-slate-400">Belum cukup data untuk menampilkan analisis.</p>
    </div>
  )
}

// ─── Tooltips ─────────────────────────────────────────────────────

function TooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:bg-slate-900 dark:border-slate-700">
      {children}
    </div>
  )
}

function MissedTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipShell>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{d.name}</p>
      <p className="text-slate-500">
        {d.total - d.missed} dari {d.total} kali dilakukan
      </p>
      <p className="font-medium text-slate-700 dark:text-slate-200">{d.percent}%</p>
    </TooltipShell>
  )
}

function RatingTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipShell>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{d.name}</p>
      <p className="text-slate-500">Rata-rata kekhusyukan: {d.average} / 5</p>
      <p className="text-slate-500">Berdasarkan {d.count} catatan</p>
    </TooltipShell>
  )
}

function ReasonTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipShell>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{d.name}</p>
      <p className="text-slate-500">{d.count} kejadian</p>
      <p className="font-medium text-slate-700 dark:text-slate-200">{d.percent}% dari seluruh sholat yang terlewat</p>
    </TooltipShell>
  )
}

// ─── Main component ───────────────────────────────────────────────

export function SholatSunnahAnalytics({ dates, sholatMap, columns, alasanLabels }: SholatSunnahAnalyticsProps) {
  const rows = useMemo(
    () => dates.map(d => sholatMap[d]).filter((r): r is SholatSunnahLogRow => {
      if (!r) return false
      const hasAnyTrue = [r.sholat_dhuha, r.sholat_tahajud].some(v => v === true)
      const hasAnyReason = [r.alasan_dhuha, r.alasan_tahajud].some(v => v != null && v !== '')
      return hasAnyTrue || hasAnyReason
    }),
    [dates, sholatMap]
  )

  const missedStats = useMemo(() => {
    return columns
      .filter(col => rows.some(r => r[`sholat_${col.key}`] === true))
      .map(col => {
        let missed = 0
        let total = 0
        for (const row of rows) {
          const v = row[`sholat_${col.key}`]
          if (v === true || v === false) {
            total += 1
            if (v === false) missed += 1
          }
        }
        return {
          key: col.key,
          name: col.label,
          missed,
          total,
          percent: total > 0 ? Math.round(((total - missed) / total) * 100) : 0,
        }
      })
      .sort((a, b) => b.missed - a.missed || b.total - a.total)
  }, [rows, columns])

  const ratingStats = useMemo(() => {
    return columns
      .map(col => {
        let sum = 0
        let count = 0
        for (const row of rows) {
          if (row[`sholat_${col.key}`] !== true) continue
          const q = row[`kualitas_${col.key}`]
          if (typeof q === 'number' && q >= 1 && q <= 5) {
            sum += q
            count += 1
          }
        }
        return {
          key: col.key,
          name: col.label,
          count,
          average: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
          hasData: count > 0,
        }
      })
      .sort((a, b) => {
        if (a.hasData && b.hasData) return a.average - b.average
        if (a.hasData) return -1
        if (b.hasData) return 1
        return 0
      })
  }, [rows, columns])

  const reasonStats = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of rows) {
      for (const col of columns) {
        if (row[`sholat_${col.key}`] === false) {
          const a = row[`alasan_${col.key}`]
          if (typeof a === 'string' && a.trim()) {
            const label = alasanLabels[a] ?? a
            counts.set(label, (counts.get(label) ?? 0) + 1)
          }
        }
      }
    }
    const total = [...counts.values()].reduce((s, c) => s + c, 0)
    return [...counts.entries()]
      .map(([name, count]) => ({
        name,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [rows, columns, alasanLabels])

  const topMissed = missedStats[0] ?? null
  const topLowRating = ratingStats.find(r => r.hasData) ?? null
  const topReason = reasonStats[0] ?? null

  const hasMissedData = missedStats.length > 0
  const hasRatingData = ratingStats.some(r => r.hasData)
  const hasReasonData = reasonStats.length > 0

  return (
    <section className="space-y-4" aria-label="Analytics sholat sunnah">
      <div className="pt-2">
        <h2 className="text-sm font-bold uppercase tracking-tight text-slate-700 dark:text-slate-200">
          Ringkasan
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {/* ── Card 1: Frekuensi Sholat Sunnah ── */}
        <AnalyticsCard
          title="Frekuensi Sholat"
          insight={
            hasMissedData && topMissed && topMissed.missed > 0
              ? <>Sholat paling sering terlewat adalah <b className="font-bold text-black dark:text-white">{topMissed.name}</b>.</>
              : hasMissedData
                ? 'Semua sholat yang tercatat sudah dikerjakan.'
                : null
          }
          insightTone="red"
        >
          {hasMissedData ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-[46%] min-w-[150px]">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Tooltip content={<MissedTooltip />} />
                    <Pie
                      data={missedStats}
                      dataKey="percent"
                      nameKey="name"
                      innerRadius={0}
                      outerRadius={78}
                      paddingAngle={2}
                      strokeWidth={2}
                      stroke="#ffffff"
                      labelLine={false}
                      label={renderDonutLabel}
                      isAnimationActive
                      animationDuration={500}
                    >
                      {missedStats.map((entry, i) => (
                        <Cell key={entry.key} fill={PASTEL_DONUT_COLORS[i % PASTEL_DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:flex-1 space-y-1.5 min-w-0">
                {missedStats.map((r, i) => (
                  <div key={r.key} className="flex items-center gap-2 text-xs min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PASTEL_DONUT_COLORS[i % PASTEL_DONUT_COLORS.length] }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{r.name}</span>
                    <span className="ml-auto font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {r.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </AnalyticsCard>

        {/* ── Card 2: Tingkat Khusyuk ── */}
        <AnalyticsCard
          title="Tingkat Khusyuk"
          insight={topLowRating ? <>Sholat dengan kekhusyukan terendah adalah <b className="font-bold text-black dark:text-white">{topLowRating.name}</b>.</> : null}
          insightTone="amber"
        >
          {hasRatingData ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-[46%] min-w-[150px]">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Tooltip content={<RatingTooltip />} />
                    <Pie
                      data={ratingStats.filter(r => r.hasData)}
                      dataKey="average"
                      nameKey="name"
                      innerRadius={0}
                      outerRadius={78}
                      paddingAngle={2}
                      strokeWidth={2}
                      stroke="#ffffff"
                      labelLine={false}
                      label={renderDonutLabel}
                      isAnimationActive
                      animationDuration={500}
                    >
                      {ratingStats.filter(r => r.hasData).map((entry, i) => (
                        <Cell key={entry.key} fill={PASTEL_DONUT_COLORS[i % PASTEL_DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:flex-1 space-y-1.5 min-w-0">
                {ratingStats.filter(r => r.hasData).map((r, i) => (
                  <div key={r.key} className="flex items-center gap-2 text-xs min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: r.hasData ? PASTEL_DONUT_COLORS[i % PASTEL_DONUT_COLORS.length] : '#E2E8F0' }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{r.name}</span>
                    <span className="ml-auto font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {r.hasData ? `${r.average.toFixed(1)} ★` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </AnalyticsCard>

        {/* ── Card 3: Alasan Terbanyak Tidak Sholat ── */}
        <AnalyticsCard
          title="Alasan Tak Sholat"
          insight={topReason ? <>Alasan paling sering adalah <b className="font-bold text-black dark:text-white">{topReason.name}</b>.</> : null}
          insightTone="blue"
        >
          {hasReasonData ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-[46%] min-w-[150px]">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Tooltip content={<ReasonTooltip />} />
                    <Pie
                      data={reasonStats}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={0}
                      outerRadius={78}
                      paddingAngle={2}
                      strokeWidth={2}
                      stroke="#ffffff"
                      labelLine={false}
                      label={renderDonutLabel}
                      isAnimationActive
                      animationDuration={500}
                    >
                      {reasonStats.map((entry, i) => (
                        <Cell key={entry.name} fill={PASTEL_DONUT_COLORS[i % PASTEL_DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:flex-1 space-y-1.5 min-w-0">
                {reasonStats.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2 text-xs min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PASTEL_DONUT_COLORS[i % PASTEL_DONUT_COLORS.length] }}
                    />
                    <span className="text-slate-600 dark:text-slate-300 truncate">{r.name}</span>
                    <span className="ml-auto font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {r.count} kali
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </AnalyticsCard>
      </div>
    </section>
  )
}
