"use client"

import { useMemo } from 'react'
import {
  format,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns'
import { id } from 'date-fns/locale'
import { Calendar, Brain, Check, X, Trash2, Flame, Trophy } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTableLock } from '@/components/ui/table-lock'
import { usePmoLogRange, useUpsertPmoLog, useDeletePmoLog } from '@/hooks/usePmoLogs'
import { useRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'
import { StatusAnalytics } from '@/components/analytics/StatusAnalytics'

// ─── Constants ────────────────────────────────────

// Revisi 3 (batch 5): alasan relapse
const RELAPSE_REASONS = ['Tak Bisa Tidur', 'Trigger HP', 'Melamun Jorok', 'Bosan', 'Duduk Terlalu Lama']

const DAY_BADGE_COLORS: Record<string, string> = {
  Senin: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Selasa: 'bg-orange-100 text-orange-800 border-orange-200',
  Rabu: 'bg-purple-100 text-purple-800 border-purple-200',
  Kamis: 'bg-amber-100 text-amber-800 border-amber-200',
  Jumat: 'bg-blue-100 text-blue-800 border-blue-200',
  Sabtu: 'bg-green-100 text-green-800 border-green-200',
  Minggu: 'bg-rose-100 text-rose-800 border-rose-200',
}

const TABLE_BORDER = 'border-slate-900'

interface PmoLogEntry {
  id: string
  user_id: string
  tanggal: string
  hari_ke: number
  status: 'berhasil' | 'relapse'
  trigger: string | null
  strategi: string | null
  catatan: string | null
  created_at: string
  updated_at: string
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ─── Main Component ────────────────────────────────

export default function PmoPage() {
  // Revisi mobile (batch 8): lock/unlock tabel — khusus tampilan mobile
  const { effectiveLocked, lockControl } = useTableLock()
  // Periode & tanggal dari HeaderControls (toolbar di header)
  const { ibadahPeriod: period, ibadahDate: anchorDate } = useHeaderControls()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date()
    let start: Date
    let end: Date
    if (period === 'daily') {
      start = startOfDaySafe(anchorDate)
      end = anchorDate
    } else if (period === 'weekly') {
      start = startOfWeek(anchorDate, { weekStartsOn: 1 })
      end = endOfWeek(anchorDate, { weekStartsOn: 1 })
    } else if (period === 'monthly') {
      start = startOfMonth(anchorDate)
      end = endOfMonth(anchorDate)
    } else {
      start = startOfYear(anchorDate)
      end = endOfYear(anchorDate)
    }
    const cappedEnd = end > today ? today : end
    return { rangeStart: start, rangeEnd: cappedEnd }
  }, [period, anchorDate])

  const startDate = format(rangeStart, 'yyyy-MM-dd')
  const endDate = format(rangeEnd, 'yyyy-MM-dd')

  const { data: logs = [], isLoading, error } = usePmoLogRange(startDate, endDate)
  useRealtime({
    table: 'pmo_logs',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['pmo_logs', 'range', startDate, endDate]],
  })

  // Data sepanjang waktu — untuk card rekor streak & perhitungan hari_ke
  const { data: allLogs = [] } = usePmoLogRange('2000-01-01', todayStr)

  const upsertPmoLog = useUpsertPmoLog()
  const deletePmoLog = useDeletePmoLog()

  // Map tanggal -> entry (rentang tampilan)
  const logMap = useMemo(() => {
    const map: Record<string, PmoLogEntry> = {}
    for (const l of logs as PmoLogEntry[]) map[l.tanggal] = l
    return map
  }, [logs])

  // Map tanggal -> entry (sepanjang waktu)
  const allLogMap = useMemo(() => {
    const map: Record<string, PmoLogEntry> = {}
    for (const l of allLogs as PmoLogEntry[]) map[l.tanggal] = l
    return map
  }, [allLogs])

  // Revisi 3: rekor streak — hari berturut-turut tanpa PMO (status 'berhasil')
  const { currentStreak, bestStreak } = useMemo(() => {
    const sorted = [...(allLogs as PmoLogEntry[])].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    let cur = 0
    let best = 0
    for (const e of sorted) {
      if (e.status === 'berhasil') {
        cur += 1
        if (cur > best) best = cur
      } else if (e.status === 'relapse') {
        cur = 0
      }
    }
    return { currentStreak: cur, bestStreak: best }
  }, [allLogs])

  // Daftar tanggal dalam rentang (ascending — terbaru paling bawah)
  const dates = useMemo(() => {
    if (rangeEnd < rangeStart) return []
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(d => format(d, 'yyyy-MM-dd'))
  }, [rangeStart, rangeEnd])

  const handleSetStatus = async (tanggal: string, status: 'berhasil' | 'relapse', reason?: string) => {
    // hari_ke: lanjutkan streak dari hari sebelumnya bila berhasil
    let hariKe = 1
    if (status === 'berhasil') {
      const prev = new Date(tanggal + 'T00:00:00')
      prev.setDate(prev.getDate() - 1)
      const prevEntry = allLogMap[format(prev, 'yyyy-MM-dd')]
      hariKe = prevEntry?.status === 'berhasil' ? (prevEntry.hari_ke || 0) + 1 : 1
    }
    await upsertPmoLog.mutateAsync({
      tanggal,
      hari_ke: hariKe,
      status,
      catatan: status === 'relapse' && reason ? `Relapse: ${reason}` : undefined,
    })
  }

  // Revisi 7: data untuk Analytics & Insight
  const analyticsEntries = useMemo(() => {
    return (logs as PmoLogEntry[]).map(l => ({
      tanggal: l.tanggal,
      missed: l.status === 'relapse',
      reason: l.status === 'relapse' && l.catatan?.startsWith('Relapse:')
        ? l.catatan.replace('Relapse: ', '')
        : (l.status === 'relapse' ? 'Relapse' : null),
    }))
  }, [logs])

  const handleClear = async (tanggal: string) => {
    const entry = logMap[tanggal]
    if (entry) await deletePmoLog.mutateAsync(entry.id)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {/* Revisi 3: card rekor hari berturut-turut tanpa PMO */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">Streak Saat Ini</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{currentStreak} <span className="text-xs sm:text-sm font-medium text-slate-500">hari</span></p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">Rekor Terbaik</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{bestStreak} <span className="text-xs sm:text-sm font-medium text-slate-500">hari</span></p>
          </div>
        </div>
      </div>

      {/* Tabel gaya Quran: Tanggal | Hari | Status */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('dt-col-stick sticky left-0 z-30 bg-white px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[72px] sm:min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Tanggal
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[64px] sm:min-w-[90px] dt-col-stick sm:sticky sm:left-[100px] sm:z-30 sm:bg-white', TABLE_BORDER)}>
                Hari
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[130px] sm:min-w-[170px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Brain className="h-3.5 w-3.5 text-violet-500" />
                  Status
                </div>
              </th>
            </tr>
          </thead>
          <tbody className={cn(effectiveLocked && 'pointer-events-none select-none')}>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td>
              </tr>
            ) : (
              dates.map((dateStr, rowIdx) => {
                const date = new Date(dateStr + 'T00:00:00')
                const dayName = format(date, 'EEEE', { locale: id })
                const dateDisplay = format(date, 'd MMMM', { locale: id })
                const entry = logMap[dateStr]
                const isDone = entry?.status === 'berhasil'
                const isRelapse = entry?.status === 'relapse'
                const relapseLabel = isRelapse && entry?.catatan?.startsWith('Relapse:')
                  ? entry.catatan.replace('Relapse: ', '')
                  : 'Relapse'

                return (
                  <tr
                    key={dateStr}
                    className={cn('border-b transition-colors', TABLE_BORDER, dateStr === todayStr ? 'row-today-pulse' : (rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'), 'hover:bg-blue-50/40')}
                  >
                    <td className={cn('dt-col-stick sticky left-0 z-10 bg-inherit px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>
                      <span className="sm:hidden">{format(date, 'd MMM', { locale: id })}</span>
                      <span className="hidden sm:inline">{dateDisplay}</span>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r dt-col-stick sm:sticky sm:left-[100px] sm:z-10 sm:bg-inherit', TABLE_BORDER)}>
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs border font-medium', DAY_BADGE_COLORS[dayName] || 'bg-slate-100 text-slate-700 border-slate-200')}>
                        {dayName}
                      </span>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center', TABLE_BORDER)}>
                      <div className="flex items-center justify-center min-h-[36px]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                'inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer whitespace-normal leading-tight text-center',
                                isRelapse
                                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                  : isDone
                                    ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                    : 'text-slate-400 border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-600'
                              )}
                            >
                              {isDone && <Check className="h-3.5 w-3.5 shrink-0" />}
                              {isDone ? `Berhasil${entry?.hari_ke ? ` (H${entry.hari_ke})` : ''}` : isRelapse ? relapseLabel : 'Belum'}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-48">
                            <DropdownMenuItem onClick={() => handleSetStatus(dateStr, 'berhasil')} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" /> Berhasil
                            </DropdownMenuItem>
                            {RELAPSE_REASONS.map(r => (
                              <DropdownMenuItem key={r} onClick={() => handleSetStatus(dateStr, 'relapse', r)} className="flex items-center gap-2">
                                <X className="h-4 w-4 text-red-500" /> {r}
                              </DropdownMenuItem>
                            ))}
                            {entry && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleClear(dateStr)} className="flex items-center gap-2 text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4" /> Batalkan
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {lockControl}

      {/* Revisi 7: Analytics & Insight */}
      <StatusAnalytics
        entries={analyticsEntries}
        difficultyTitle="Tingkat Kesulitan Bertahan PMO"
        difficultySubtitle="Berdasarkan frekuensi relapse per hari"
        reasonTitle="Alasan Terbanyak Relapse PMO"
        reasonSubtitle="Berdasarkan alasan yang dipilih saat relapse"
        missedNoun="relapse"
      />
    </div>
  )
}
