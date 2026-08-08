'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  PieChart,
  Pie,
} from 'recharts'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types (mirror struktur log quran) ─────────────────────

export interface QuranLogEntry {
  id: string
  tanggal: string
  waktu_baca: string
  surat: string | null
  juz: number | null
  halaman_mulai: number | null
  halaman_selesai: number | null
  jumlah_halaman: number | null
  catatan: string | null
}

interface QuranColumn {
  key: string
  label: string
}

interface QuranAnalyticsProps {
  logMap: Record<string, Record<string, QuranLogEntry | undefined>>
  columns: readonly QuranColumn[]
}

const PASTEL_BAR_COLORS = [
  '#FDA4AF',
  '#93C5FD',
  '#FCD34D',
  '#86EFAC',
  '#C4B5FD',
  '#7DD3FC',
]

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

function ReasonTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <TooltipShell>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{d.name}</p>
      <p className="text-slate-500">{d.count} kejadian</p>
      <p className="font-medium text-slate-700 dark:text-slate-200">{d.percent}% dari seluruh waktu baca yang terlewat</p>
    </TooltipShell>
  )
}

// ─── Main component ───────────────────────────────────────

export function QuranAnalytics({ logMap, columns }: QuranAnalyticsProps) {
  // Card 1: persentase membaca per waktu baca
  const missedStats = useMemo(() => {
    return columns
      .map(col => {
        let missed = 0
        let total = 0
        for (const tanggal of Object.keys(logMap)) {
          const entry = logMap[tanggal]?.[col.key]
          if (!entry) continue
          total += 1
          if (entry.catatan?.startsWith('Tidak membaca:')) missed += 1
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
  }, [logMap, columns])

  // Card 2: alasan terbanyak tidak membaca
  const reasonStats = useMemo(() => {
    const counts = new Map<string, number>()
    for (const tanggal of Object.keys(logMap)) {
      for (const col of columns) {
        const entry = logMap[tanggal]?.[col.key]
        if (!entry?.catatan?.startsWith('Tidak membaca:')) continue
        const reason = entry.catatan.replace('Tidak membaca: ', '').trim()
        if (reason) counts.set(reason, (counts.get(reason) ?? 0) + 1)
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
  }, [logMap, columns])

  const topMissed = missedStats[0] ?? null
  const topReason = reasonStats[0] ?? null
  const hasMissedData = missedStats.length > 0
  const hasReasonData = reasonStats.length > 0

  return (
    <section className="space-y-4" aria-label="Analytics quran">
      <div className="pt-2">
        <h2 className="text-sm font-bold uppercase tracking-tight text-slate-700 dark:text-slate-200">
          Analytics &amp; Insight
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* ── Card 1: Tingkat Kesulitan Baca Quran ── */}
        <AnalyticsCard
          title="Baca Quran Terbanyak"
          insight={
            hasMissedData && topMissed && topMissed.missed > 0
              ? `${topMissed.name} adalah waktu yang paling sering terlewat.`
              : hasMissedData
                ? 'Semua waktu baca yang tercatat sudah dilakukan. Pertahankan!'
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
                <Bar dataKey="percent" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive animationDuration={500}>
                  {missedStats.map((entry, i) => (
                    <Cell key={entry.key} fill={PASTEL_BAR_COLORS[i % PASTEL_BAR_COLORS.length]} />
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

        {/* ── Card 2: Alasan Terbanyak Tidak Baca Quran ── */}
        <AnalyticsCard
          title="Alasan Tak Baca Quran"
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
                      innerRadius={48}
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
