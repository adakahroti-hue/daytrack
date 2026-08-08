'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Target, FileText, Clock, Timer, Pause, Play, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, getEstimasiText, getTaskActiveSeconds, getMissionPriorityLabel, getMissionPriorityColor } from '@/lib/utils'
import { useTasks, useToggleTaskStatus, usePauseTask, useResumeTask } from '@/hooks/useTasks'

// ─── Revisi batch 9, 11 & 13: section "Fokus" untuk tab Overview ───

export type OverviewPeriod = 'harian' | 'kemarin' | 'mingguan' | 'bulanan' | 'tahunan'

export const PERIOD_LABEL: Record<OverviewPeriod, string> = {
  harian: 'Hari Ini',
  kemarin: 'Kemarin',
  mingguan: 'Minggu Ini',
  bulanan: 'Bulan Ini',
  tahunan: 'Tahun Ini',
}

// Revisi batch 13: maksimal kartu misi yang ditampilkan (termasuk "Sedang Dikerjakan")
const MAX_MISSION_CARDS = 3

type OverviewTask = {
  id: string
  nama: string
  tanggal: string
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: 'belum' | 'proses' | 'selesai'
  estimasi_menit: number
  accumulated_seconds?: number | null
  is_paused?: boolean | null
  last_resumed_at?: string | null
}

const PRIORITY_ORDER: Record<string, number> = { p1: 0, p2: 1, p3: 2, p4: 3 }

const PRIORITY_CARD_TINT: Record<string, string> = {
  p1: 'bg-red-50/70 border-red-200',
  p2: 'bg-amber-50/70 border-amber-200',
  p3: 'bg-sky-50/70 border-sky-200',
  p4: 'bg-green-50/70 border-green-200',
}

function formatSedang(task: OverviewTask): string {
  const seconds = getTaskActiveSeconds(task)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h} jam ${m} menit`
  if (m > 0) return `${m} menit`
  return 'baru mulai'
}

export function FocusTodaySection({ startStr, endStr, period }: { startStr: string; endStr: string; period: OverviewPeriod }) {
  const { data } = useTasks()
  const allTasks = (data ?? []) as OverviewTask[]
  // Filter tugas ke rentang periode terpilih (harian = 1 tanggal)
  const tasks = allTasks.filter(t => t.tanggal >= startStr && t.tanggal <= endStr)
  const toggleStatus = useToggleTaskStatus()
  const pauseTask = usePauseTask()
  const resumeTask = useResumeTask()

  const featured = tasks.find(t => t.status === 'proses')
  const backlog = tasks
    .filter(t => t.status !== 'selesai' && t.id !== featured?.id)
    .sort((a, b) => (PRIORITY_ORDER[a.prioritas] ?? 9) - (PRIORITY_ORDER[b.prioritas] ?? 9))

  // Revisi batch 13: tampilkan maksimal MAX_MISSION_CARDS misi (featured ikut dihitung)
  const missions = featured ? [featured, ...backlog] : backlog
  const visibleMissions = missions.slice(0, MAX_MISSION_CARDS)

  const total = tasks.length
  const belum = tasks.filter(t => t.status === 'belum').length
  const progressPct = total > 0 ? Math.round(((total - belum) / total) * 100) : 0

  // Tick halus agar durasi "Sedang: ..." ikut berjalan (per 30 detik)
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
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fokus {label}</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {/* Kartu statistik tugas */}
        <div className="snap-start shrink-0 w-52 rounded-xl border border-slate-200 bg-white p-4 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Tugas {label}</p>
            <div className="p-1.5 rounded-lg bg-blue-50">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{total}</p>
          <p className="text-xs text-slate-500">Total tugas</p>
          <p className="text-xs text-slate-500 mt-3">{belum} belum dikerjakan</p>
          <div className="h-2 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          {/* Revisi batch 13: tombol Selengkapnya */}
          <Link
            href="/tugas/hari-ini"
            className="mt-auto pt-3 inline-flex items-center gap-1 justify-end text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Selengkapnya <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Kartu-kartu misi — maksimal MAX_MISSION_CARDS (revisi batch 13) */}
        {visibleMissions.map(t => t.id === featured?.id ? (
          // Kartu tugas yang sedang dikerjakan
          <div key={t.id} className="snap-start shrink-0 w-[300px] sm:w-[340px] rounded-xl border border-slate-200 bg-white p-4 flex flex-col">
            <p className="text-sm font-medium text-slate-600">Sedang Dikerjakan</p>
            <p className="font-semibold text-slate-900 mt-2 line-clamp-2">{t.nama}</p>
            <span className={cn(
              'mt-1.5 w-fit inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
              t.is_paused ? 'bg-slate-100 text-slate-600' : 'bg-yellow-100 text-yellow-700'
            )}>
              {t.is_paused ? 'Dijeda' : 'Proses'}
            </span>
            <div className="mt-2.5 space-y-1 text-xs text-slate-500">
              <p className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Estimasi: {getEstimasiText(t.estimasi_menit)}
              </p>
              <p className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" /> Sedang: {formatSedang(t)}
              </p>
            </div>
            <div className="mt-auto pt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => t.is_paused ? resumeTask.mutate(t.id) : pauseTask.mutate(t.id)}
              >
                {t.is_paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {t.is_paused ? 'Lanjutkan' : 'Pause'}
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => toggleStatus.mutate({ id: t.id, status: 'selesai' })}
              >
                <Check className="h-4 w-4" /> Tandai Selesai
              </Button>
            </div>
          </div>
        ) : (
          // Kartu tugas backlog per prioritas
          <div
            key={t.id}
            className={cn('snap-start shrink-0 w-60 rounded-xl border p-4 flex flex-col', PRIORITY_CARD_TINT[t.prioritas] ?? 'bg-white border-slate-200')}
          >
            <span className={cn('w-fit inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold border', getMissionPriorityColor(t.prioritas))}>
              {getMissionPriorityLabel(t.prioritas)}
            </span>
            <p className="font-semibold text-slate-900 mt-2 line-clamp-2 min-h-[2.5rem]">{t.nama}</p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <Clock className="h-3.5 w-3.5" /> Estimasi: {getEstimasiText(t.estimasi_menit)}
            </p>
            <span className="mt-2 w-fit inline-flex rounded-md bg-white/80 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {t.status === 'proses' ? 'Proses' : 'Belum'}
            </span>
            <div className="mt-auto pt-3">
              {t.status === 'proses' ? (
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => toggleStatus.mutate({ id: t.id, status: 'selesai' })}
                >
                  <Check className="h-4 w-4" /> Tandai Selesai
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-[#0F172A] hover:bg-slate-800 text-white"
                  onClick={() => toggleStatus.mutate({ id: t.id, status: 'proses' })}
                >
                  <Play className="h-4 w-4" /> Ambil Misi
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Empty state bila benar-benar tidak ada tugas */}
        {total === 0 && (
          <div className="snap-start shrink-0 w-72 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 flex flex-col justify-center">
            <p className="text-sm text-slate-500">Belum ada tugas untuk periode ini.</p>
            <Link href="/tugas/hari-ini" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
              Kelola tugas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
