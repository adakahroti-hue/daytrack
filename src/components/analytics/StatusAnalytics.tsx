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

// ─── Generik: analytics untuk tab status harian tunggal ─────────
// (Doa, Syukur, Tidur, PMO) — bar "tingkat kesulitan" per hari +
// donut "alasan terbanyak".

export interface StatusAnalyticsEntry {
  tanggal: string // 'yyyy-MM-dd'
  missed: boolean // true = tidak dilakukan / begadang / relapse
  reason: string | null // label alasan (sudah dipetakan)
}

interface StatusAnalyticsProps {
  entries: StatusAnalyticsEntry[]
  difficultyTitle: string
  difficultySubtitle?: string
  reasonTitle: string
  reasonSubtitle?: string
  missedNoun: string // mis. 'terlewat' | 'begadang' | 'relapse'
  barColor?: string // custom bar color (default: pastel palette)
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

const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

const RADIAN = Math.PI / 180

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
      <p className="text-slate-500">{d.total - d.missed} dari {d.total} hari tanpa {d.noun}</p>
      <p className="font-medium text-slate-700 dark:text-slate-200">{d.percent}%</p>
    </TooltipShell>
  )
}

function ReasonTooltip({ active, payload, noun }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipShell>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{d.name}</p>
      <p className="text-slate-500">{d.count} kejadian</p>
      <p className="font-medium text-slate-700 dark:text-slate-200">{d.percent}% dari total {noun}</p>
    </TooltipShell>
  )
}

// Nama hari Indonesia dari tanggal 'yyyy-MM-dd'
function dayName(tanggal: string): string {
  const d = new Date(tanggal + 'T00:00:00')
  const names = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return names[d.getDay()]
}

export function StatusAnalytics({
  entries,
  difficultyTitle,
  difficultySubtitle,
  reasonTitle,
  reasonSubtitle,
  missedNoun,
  barColor,
}: StatusAnalyticsProps) {
  // Card 1: % dilakukan per hari (Senin..Minggu)
  const missedStats = useMemo(() => {
    const byDay = new Map<string, { missed: number; total: number }>()
    for (const e of entries) {
      const day = dayName(e.tanggal)
      const cur = byDay.get(day) ?? { missed: 0, total: 0 }
      cur.total += 1
      if (e.missed) cur.missed += 1
      byDay.set(day, cur)
    }
    return DAY_ORDER.filter(d => byDay.has(d))
      .map(d => {
        const v = byDay.get(d)!
        return {
          key: d,
          name: d,
          missed: v.missed,
          total: v.total,
          percent: v.total > 0 ? Math.round(((v.total - v.missed) / v.total) * 100) : 0,
          noun: missedNoun,
        }
      })
      .sort((a, b) => b.missed - a.missed || b.total - a.total)
  }, [entries, missedNoun])

  // Card 2: alasan terbanyak
  const reasonStats = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of entries) {
      if (e.missed && e.reason) counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1)
    }
    const total = [...counts.values()].reduce((s, c) => s + c, 0)
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count, percent: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
  }, [entries])

  const topMissed = missedStats[0] ?? null
  const topReason = reasonStats[0] ?? null
  const hasMissedData = missedStats.length > 0
  const hasReasonData = reasonStats.length > 0

  return (
    <section className="space-y-4" aria-label="Analytics">
      <div className="pt-2">
        <h2 className="text-sm font-bold uppercase tracking-tight text-slate-700 dark:text-slate-200">
          Ringkasan
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* ── Card 1: Tingkat Kesulitan ── */}
        <AnalyticsCard
          title={difficultyTitle}
          subtitle={difficultySubtitle}
          insight={
            hasMissedData && topMissed && topMissed.missed > 0
              ? <>{missedNoun.charAt(0).toUpperCase() + missedNoun.slice(1)} paling sering terjadi pada hari <b className="font-bold">{topMissed.name}</b>.</>
              : hasMissedData
                ? 'Semua yang tercatat sudah dilakukan.'
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

        {/* ── Card 2: Alasan Terbanyak ── */}
        <AnalyticsCard
          title={reasonTitle}
          subtitle={reasonSubtitle}
          insight={topReason ? <>Alasan paling sering adalah <b className="font-bold">{topReason.name}</b>.</> : null}
          insightTone="blue"
        >
          {hasReasonData ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-[46%] min-w-[150px]">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Tooltip content={<ReasonTooltip noun={missedNoun} />} />
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
