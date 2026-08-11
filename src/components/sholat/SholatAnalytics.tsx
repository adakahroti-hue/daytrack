'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  PieChart,
  Pie,
} from 'recharts'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types (mirror struktur row tabel sholat) ─────────────────────

export type SholatLogRow = Record<string, boolean | number | string | null | undefined>

interface SholatColumn {
  key: string
  label: string
}

interface SholatAnalyticsProps {
  dates: string[]
  sholatMap: Record<string, SholatLogRow | undefined>
  columns: readonly SholatColumn[]
  alasanLabels: Record<string, string>
}

// Warna hitam pekat untuk diagram batang (seragam)
const BAR_COLOR = '#0F172A' // slate-900 — hitam pekat

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
  // Rev 6: pakai percent dari data (payload.percent) agar sama persis dengan tooltip
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
  insight: string | null
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

export function SholatAnalytics({ dates, sholatMap, columns, alasanLabels }: SholatAnalyticsProps) {
  // Kumpulkan hanya baris yang benar-benar tercatat (ada datanya)
  const rows = useMemo(
    () => dates.map(d => sholatMap[d]).filter((r): r is SholatLogRow => {
      if (!r) return false
      // Filter baris kosong: semua sholat false + semua alasan null
      const hasAnyTrue = [r.sholat_subuh, r.sholat_dhuha, r.sholat_dzuhur, r.sholat_ashar, r.sholat_maghrib, r.sholat_isya].some(v => v === true)
      const hasAnyReason = [r.alasan_subuh, r.alasan_dhuha, r.alasan_dzuhur, r.alasan_ashar, r.alasan_maghrib, r.alasan_isya].some(v => v != null && v !== '')
      return hasAnyTrue || hasAnyReason
    }),
    [dates, sholatMap]
  )

  // Card 1: persentase dilakukan per sholat
  const missedStats = useMemo(() => {
    return columns
      .map(col => {
        let missed = 0
        let total = 0 // hanya kesempatan yang sudah dicatat (bukan null)
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
      .filter(s => s.total > 0)
      .sort((a, b) => b.missed - a.missed || b.total - a.total)
  }, [rows, columns])

  // Card 2: rata-rata rating kekhusyukan per sholat (skip null)
  const ratingStats = useMemo(() => {
    return columns
      .map(col => {
        let sum = 0
        let count = 0
        for (const row of rows) {
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

  // Card 3: alasan terbanyak tidak sholat
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

  // Label "X.X ★" di ujung batang rating (inline seperti referensi)
  const renderRatingLabel = (props: any) => {
    const { x, y, width, height, index } = props
    const entry = ratingStats[index]
    if (!entry) return null
    const lx = (x ?? 0) + (width ?? 0) + 6
    const ly = (y ?? 0) + (height ?? 0) / 2
    if (!entry.hasData) {
      return (
        <text x={lx} y={ly} dy={3} fontSize={11} fill="#94A3B8">
          —
        </text>
      )
    }
    return (
      <text x={lx} y={ly} dy={3} fontSize={11} fontWeight={600}>
        <tspan fill="#475569">{entry.average.toFixed(1)}</tspan>
        <tspan fill="#F59E0B" dx={3}>★</tspan>
      </text>
    )
  }

  return (
    <section className="space-y-4" aria-label="Analytics sholat">
      <div className="pt-2">
        <h2 className="text-sm font-bold uppercase tracking-tight text-slate-700 dark:text-slate-200">
          Ringkasan
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {/* ── Card 1: Sholat Paling Sulit Dilakukan ── */}
        <AnalyticsCard
          title="Sholat Terbanyak"
          insight={
            hasMissedData && topMissed && topMissed.missed > 0
              ? `${topMissed.name} adalah sholat yang paling sering terlewat.`
              : hasMissedData
                ? 'Semua sholat yang tercatat sudah dikerjakan. Pertahankan!'
                : null
          }
          insightTone="red"
        >
          {hasMissedData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={missedStats} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                  interval={0}
                />
                <Tooltip content={<MissedTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="percent" radius={0} maxBarSize={44} isAnimationActive animationDuration={500}>
                  {missedStats.map((entry, i) => (
                    <Cell key={entry.key} fill={BAR_COLOR} className="dark:fill-slate-200" />
                  ))}
                  <LabelList
                    dataKey="percent"
                    position="top"
                    formatter={(v: number) => `${v}%`}
                    style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </AnalyticsCard>

        {/* ── Card 2: Sholat Paling Tidak Khusyuk ── */}
        <AnalyticsCard
          title="Sholat Terkhusyuk"
          insight={topLowRating ? `${topLowRating.name} memiliki tingkat kekhusyukan terendah.` : null}
          insightTone="amber"
        >
          {hasRatingData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={ratingStats}
                layout="vertical"
                margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
                barCategoryGap="22%"
              >
                <XAxis type="number" domain={[0, 5]} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={64}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<RatingTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="average" radius={0} maxBarSize={16} isAnimationActive animationDuration={500}>
                  {ratingStats.map((entry, i) => (
                    <Cell
                      key={entry.key}
                      fill={entry.hasData ? BAR_COLOR : '#E2E8F0'}
                      className={entry.hasData ? 'dark:fill-slate-200' : undefined}
                    />
                  ))}
                  <LabelList dataKey="average" position="right" content={renderRatingLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </AnalyticsCard>

        {/* ── Card 3: Alasan Terbanyak Tidak Sholat ── */}
        <AnalyticsCard
          title="Alasan Tak Sholat"
          insight={topReason ? `${topReason.name} adalah alasan paling sering.` : null}
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
