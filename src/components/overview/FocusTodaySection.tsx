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
  shot: 'Shot Ini',
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

  const label = PERIOD_LABEL[period]

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">Tugas {label}</p>
        <Link
          href="/tugas/hari-ini"
          aria-label="Lihat tugas"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
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
    </div>
  )
}
