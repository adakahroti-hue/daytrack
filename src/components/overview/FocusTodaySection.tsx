'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, Timer, ArrowRight } from 'lucide-react'
import { getEstimasiText, getTaskActiveSeconds } from '@/lib/utils'
import { useTasks } from '@/hooks/useTasks'

// ─── Revisi batch 18: kartu "Tugas" untuk tab Overview (tema hitam-putih) ───

export type OverviewPeriod = 'harian' | 'kemarin' | 'mingguan' | 'shot' | 'bulanan' | 'tahunan'

export const PERIOD_LABEL: Record<OverviewPeriod, string> = {
  harian: 'Hari Ini',
  kemarin: 'Kemarin',
  mingguan: 'Minggu Ini',
  shot: 'Capture Ini',
  bulanan: 'Bulan Ini',
  tahunan: 'Tahun Ini',
}

type OverviewTask = {
  id: string
  nama: string
  tanggal: string
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: 'belum' | 'proses' | 'selesai' | 'ide'
  estimasi_menit: number
  accumulated_seconds?: number | null
  is_paused?: boolean | null
  last_resumed_at?: string | null
}

function formatSedang(task: OverviewTask): string {
  const seconds = getTaskActiveSeconds(task)
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d} hari ${h} jam ${m} menit`
  if (h > 0) return `${h} jam ${m} menit`
  if (m > 0) return `${m} menit`
  return 'baru mulai'
}

// Pie chart multi-segmen (full circle) untuk breakdown prioritas di filter shot
function PieSegments({
  segments,
  size = 64,
  centerLabel,
  labelSmall,
}: {
  segments: { value: number; color: string }[]
  size?: number
  centerLabel?: string
  labelSmall?: boolean
}) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 1
  // Bangun wedge path per segmen (mulai dari atas, -90°)
  let acc = 0
  const paths = total > 0 ? segments.map((s) => {
    const frac = s.value / total
    const a0 = -Math.PI / 2 + acc * 2 * Math.PI
    acc += frac
    const a1 = -Math.PI / 2 + acc * 2 * Math.PI
    const x0 = cx + r * Math.cos(a0)
    const y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const largeArc = frac > 0.5 ? 1 : 0
    const d = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`
    return { d, color: s.color }
  }) : []
  // Titik tengah (centroid) tiap irisan untuk menaruh label persen
  let accMid = 0
  const midAngle = segments.map((s) => {
    const frac = total > 0 ? s.value / total : 0
    const mid = -Math.PI / 2 + (accMid + frac / 2) * 2 * Math.PI
    accMid += frac
    return mid
  })
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total > 0 ? (
          paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} className="transition-all duration-700 ease-out" />
          ))
        ) : (
          <circle cx={cx} cy={cy} r={r} fill="#e2e8f0" />
        )}
        {/* Garis pemisah tipis antar segmen */}
        {total > 0 && paths.length > 1 && (
          paths.map((p, i) => (
            <path key={`sep-${i}`} d={p.d} fill="none" stroke="#ffffff" strokeWidth={1} />
          ))
        )}
        {/* Label persen: pada irisan BERWARNA (frac>0), di centroid; warna teks disesuaikan kecerahan irisan */}
        {total > 0 && segments.map((s, i) => {
          const frac = s.value / total
          if (frac <= 0) return null
          const m = /^#?([0-9a-fA-F]{6})$/.exec(s.color.trim())
          let textColor = '#ffffff'
          if (m) {
            const n = parseInt(m[1], 16)
            const r = (n >> 16) & 255
            const g = (n >> 8) & 255
            const b = n & 255
            const lum = r * 0.299 + g * 0.587 + b * 0.114
            textColor = lum > 150 ? '#111827' : '#ffffff'
          }
          const pct = Math.round(frac * 100)
          const alpha = frac * 2 * Math.PI
          const beta = alpha / 2
          const centroidR = alpha > 1e-6 ? (2 / 3) * r * (Math.sin(beta) / beta) : 0
          const rr = Math.min(centroidR, r * 0.6)
          const lx = cx + rr * Math.cos(midAngle[i])
          const ly = cy + rr * Math.sin(midAngle[i])
          return (
            <text key={`lbl-${i}`} x={lx} y={ly} fill={textColor} stroke={textColor === '#ffffff' ? '#00000066' : '#ffffff99'} strokeWidth={0.3}
              fontSize={Math.max(6, Math.round(size * 0.11))} fontWeight={700} textAnchor="middle" dominantBaseline="central">
              {pct}%
            </text>
          )
        })}
      </svg>
      {centerLabel != null && (
        <div className="absolute inset-0 flex items-center justify-center leading-none pointer-events-none">
          <span className="font-bold tabular-nums text-white drop-shadow" style={{ fontSize: Math.round(size * 0.2) }}>
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  )
}

// Warna & label prioritas (p1=mendesak, p2=tinggi, p3=sedang, p4=rendah)
const PRIORITY_META: { key: 'p1' | 'p2' | 'p3' | 'p4'; label: string; color: string }[] = [
  { key: 'p1', label: 'Mendesak', color: '#ef4444' },
  { key: 'p2', label: 'Tinggi', color: '#f59e0b' },
  { key: 'p3', label: 'Sedang', color: '#0ea5e9' },
  { key: 'p4', label: 'Rendah', color: '#22c55e' },
]

export function FocusTodayCard({ startStr, endStr, period }: { startStr: string; endStr: string; period: OverviewPeriod }) {
  const { data } = useTasks()
  const allTasks = (data ?? []) as OverviewTask[]
  const tasks = allTasks.filter(t => t.tanggal >= startStr && t.tanggal <= endStr)

  const featured = tasks.find(t => t.status === 'proses')

  const total = tasks.length
  const belum = tasks.filter(t => t.status === 'belum').length
  const sedang = tasks.filter(t => t.status === 'proses').length
  const selesai = tasks.filter(t => t.status === 'selesai').length
  const progressPct = total > 0 ? Math.round((selesai / total) * 100) : 0

  // Tick halus agar durasi "Berjalan: ..." ikut berjalan (per 30 detik)
  const featuredId = featured?.id
  const featuredPaused = !!featured?.is_paused
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!featuredId || featuredPaused) return
    const t = setInterval(() => setTick(v => v + 1), 30000)
    return () => clearInterval(t)
  }, [featuredId, featuredPaused])

  const isShot = period === 'shot'
  // Filter shot: jangan sertakan tugas yang sedang diproses
  const displayTasks = isShot ? tasks.filter(t => t.status !== 'proses') : tasks
  const displayTotal = displayTasks.length
  const displaySelesai = displayTasks.filter(t => t.status === 'selesai').length
  const priorityCounts = PRIORITY_META.map(p => ({
    ...p,
    value: displayTasks.filter(t => t.prioritas === p.key).length,
  }))

  const label = PERIOD_LABEL[period]

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Tugas{period === 'shot' ? '' : ` ${label}`}</p>
        <Link
          href="/tugas/hari-ini"
          aria-label="Lihat tugas"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {isShot ? (
        /* ── Filter Shot: pie Keseluruhan vs Selesai + breakdown prioritas (tanpa tugas diproses) ── */
        <div className="mt-3 flex flex-col sm:flex-row sm:items-stretch sm:gap-4">
          {/* Kiri: Keseluruhan vs Selesai */}
          <div className="flex items-center gap-3 sm:flex-1">
            <PieSegments
              size={64}
              segments={
                displayTotal === 0
                  ? [{ value: 1, color: '#e2e8f0' }]
                  : displaySelesai === 0
                  ? [{ value: 1, color: '#ef4444' }]
                  : [
                      { value: displaySelesai, color: '#111827' },
                      { value: displayTotal - displaySelesai, color: '#cbd5e1' },
                    ]
              }
            />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Keseluruhan vs Selesai</p>
              <p className="text-sm font-semibold text-slate-900">
                <span className="tabular-nums">{displaySelesai}</span>
                <span className="text-slate-400"> / </span>
                <span className="tabular-nums">{displayTotal}</span> selesai
              </p>
            </div>
          </div>

          {/* Divider vertikal — hanya desktop */}
          <div className="hidden sm:block w-px bg-slate-100 shrink-0" />

          {/* Kanan: Kategori Prioritas */}
          <div className="pt-3 sm:pt-0 border-t border-slate-100 sm:border-0 sm:flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Kategori Prioritas</p>
            <div className="flex items-center gap-4">
              <PieSegments size={64} segments={priorityCounts.map(p => ({ value: p.value, color: p.color }))} labelSmall />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 min-w-0 flex-1">
                {priorityCounts.map(p => (
                  <div key={p.key} className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-xs text-slate-600 truncate">{p.label}</span>
                    <span className="text-xs font-semibold text-slate-900 tabular-nums ml-auto">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Tampilan default (harian/mingguan/bulanan/tahunan): total + bar + tugas berjalan ── */
        <div className="mt-3 flex gap-4">
          {/* Kiri: total + bar pendek */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-4xl lg:text-3xl font-bold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500">Total tugas</p>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{belum} belum dikerjakan</p>
            <div className="mt-1.5 flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-2">
              <div className="h-2 rounded-full bg-slate-100 w-full lg:w-auto lg:flex-1 overflow-hidden">
                <div className="h-full rounded-full bg-slate-800 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="text-xs font-bold text-emerald-600 tabular-nums shrink-0">{selesai} tugas selesai</span>
            </div>
          </div>
          {/* Kanan: sedang dikerjakan — label di atas, isi di bawah */}
          <div className="w-px bg-slate-100 shrink-0" />
          <div className="flex-1 min-w-0">
            {sedang > 0 ? (
              <p className="text-xs font-bold text-orange-500">{sedang} Tugas Diproses</p>
            ) : (
              <p className="text-xs font-medium text-slate-500">Tidak ada tugas berjalan</p>
            )}
            {featured ? (
              <>
                <p className="text-sm font-semibold text-slate-900 line-clamp-2 pt-4 capitalize">{featured.nama}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 flex-wrap">
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {getEstimasiText(featured.estimasi_menit)}
                  </p>
                  <p className="flex items-center gap-1.5 text-orange-500 animate-pulse">
                    <Timer className="h-3.5 w-3.5" /> <span className="hidden lg:inline">{formatSedang(featured)}</span>
                    <span className="lg:hidden">Berjalan: {formatSedang(featured)}</span>
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 mt-1">Tidak ada tugas berjalan</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
