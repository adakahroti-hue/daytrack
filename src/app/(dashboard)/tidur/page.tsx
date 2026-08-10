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
import { Calendar, CalendarDays, Moon, Check, X, Trash2, Clock, MessageCircle } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTableLock } from '@/components/ui/table-lock'
import { useTidurLogRange, useUpsertTidurLog, useDeleteTidurLog } from '@/hooks/useTidurLogs'
import { useRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'
import dynamic from 'next/dynamic'
import { AnalyticsSkeleton } from '@/components/ui/analytics-skeleton'
import { JAM_TIDUR_OPTIONS } from '@/lib/tidur-options'
const StatusAnalytics = dynamic(() => import('@/components/analytics/StatusAnalytics').then(m => m.StatusAnalytics), { ssr: false, loading: () => <AnalyticsSkeleton /> })

// ─── Constants ────────────────────────────────────

// Revisi 4 (batch 5): alasan begadang
const BEGADANG_REASONS = ['Tak Bisa Tidur', 'Gabut', 'Kerja', 'Main Game', 'Minum Kopi', 'Nongkrong', 'Lapar']

// JAM_TIDUR_OPTIONS dipindah ke src/lib/tidur-options.ts (dipakai juga di Overview — batch 24)

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

interface TidurLogEntry {
  id: string
  user_id: string
  tanggal: string
  status: 'tepat' | 'begadang'
  jam_tidur: string | null
  jam_bangun: string | null
  durasi_jam: number | null
  catatan: string | null
  alasan_tidak: string | null
  created_at: string
  updated_at: string
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ─── Main Component ────────────────────────────────

export default function TidurPage() {
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

  const { data: logs = [], isLoading, error } = useTidurLogRange(startDate, endDate)
  useRealtime({
    table: 'tidur',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['tidur', 'range', startDate, endDate]],
  })

  const upsertTidurLog = useUpsertTidurLog()
  const deleteTidurLog = useDeleteTidurLog()

  // Map tanggal -> entry
  const logMap = useMemo(() => {
    const map: Record<string, TidurLogEntry> = {}
    for (const l of logs as TidurLogEntry[]) map[l.tanggal] = l
    return map
  }, [logs])

  // Daftar tanggal dalam rentang (ascending — terbaru paling bawah)
  const dates = useMemo(() => {
    if (rangeEnd < rangeStart) return []
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(d => format(d, 'yyyy-MM-dd'))
  }, [rangeStart, rangeEnd])

  const handleSetStatus = async (tanggal: string, status: 'tepat' | 'begadang') => {
    const entry = logMap[tanggal]
    await upsertTidurLog.mutateAsync({
      tanggal,
      status,
      jam_tidur: entry?.jam_tidur || undefined,
      ...(status === 'tepat' ? { alasan_tidak: null as any } : {}),
    })
  }

  const handleSetAlasan = async (tanggal: string, reason: string) => {
    const entry = logMap[tanggal]
    await upsertTidurLog.mutateAsync({ tanggal, status: 'begadang', alasan_tidak: reason, jam_tidur: entry?.jam_tidur || undefined })
  }

  const handleSetJamTidur = async (tanggal: string, jamTidur: string, status: 'tepat' | 'begadang') => {
    await upsertTidurLog.mutateAsync({ tanggal, status, jam_tidur: jamTidur })
  }

  // Revisi 6: data untuk Ringkasan
  const analyticsEntries = useMemo(() => {
    return (logs as TidurLogEntry[]).map(l => ({
      tanggal: l.tanggal,
      missed: l.status === 'begadang',
      reason: l.status === 'begadang' && l.alasan_tidak
        ? l.alasan_tidak
        : (l.status === 'begadang' ? 'Begadang' : null),
    }))
  }, [logs])

  const handleClear = async (tanggal: string) => {
    const entry = logMap[tanggal]
    if (entry) await deleteTidurLog.mutateAsync(entry.id)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Tabel gaya Quran: Tanggal | Hari | Status */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}>
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
                <div className="flex items-center justify-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
                  Hari
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[160px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Moon className="h-3.5 w-3.5 text-blue-500" />
                  Status
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[80px] sm:min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  Jam Tidur
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-left font-semibold text-slate-700 min-w-[120px] sm:min-w-[160px]', TABLE_BORDER)}>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
                  Alasan
                </div>
              </th>
            </tr>
          </thead>
          <tbody className={cn(effectiveLocked && 'pointer-events-none select-none')}>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td>
              </tr>
            ) : (
              dates.map((dateStr, rowIdx) => {
                const date = new Date(dateStr + 'T00:00:00')
                const dayName = format(date, 'EEEE', { locale: id })
                const dateDisplay = format(date, 'd MMMM', { locale: id })
                const entry = logMap[dateStr]
                const isDone = entry?.status === 'tepat'
                const isBegadang = entry?.status === 'begadang'
                const begadangLabel = isBegadang && entry?.alasan_tidak
                  ? entry.alasan_tidak
                  : 'Begadang'

                return (
                  <tr
                    key={dateStr}
                    className={cn('border-b transition-colors', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30', 'hover:bg-blue-50/40')}
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
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r', TABLE_BORDER)}>
                      <div className="flex items-center justify-center min-h-[36px]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                'inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer whitespace-normal leading-tight text-center',
                                isBegadang
                                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                  : isDone
                                    ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                    : 'text-slate-400 border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-600'
                              )}
                            >
                              {isDone && <Check className="h-3.5 w-3.5 shrink-0" />}
                              {isDone ? 'Tepat Waktu' : isBegadang ? 'Begadang' : 'Belum'}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-40">
                            <DropdownMenuItem onClick={() => handleSetStatus(dateStr, 'tepat')} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" /> Tepat Waktu
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSetStatus(dateStr, 'begadang')} className="flex items-center gap-2">
                              <X className="h-4 w-4 text-red-500" /> Begadang
                            </DropdownMenuItem>
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
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r', TABLE_BORDER)}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="font-medium text-slate-700 cursor-pointer hover:text-blue-700 hover:underline"
                          >
                            {entry?.jam_tidur ? entry.jam_tidur.slice(0, 5) : 'Pilih'}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-32">
                          {JAM_TIDUR_OPTIONS.map(opt => (
                            <DropdownMenuItem
                              key={opt.value}
                              onClick={() => handleSetJamTidur(dateStr, opt.value, opt.status)}
                              className="flex items-center gap-2"
                            >
                              {opt.status === 'tepat' ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-500" />}
                              {opt.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 text-left', TABLE_BORDER)}>
                      {isBegadang && entry?.alasan_tidak ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="font-medium text-slate-700 cursor-pointer hover:text-blue-700 hover:underline"
                            >
                              {begadangLabel}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44">
                            {BEGADANG_REASONS.map(r => (
                              <DropdownMenuItem key={r} onClick={() => handleSetAlasan(dateStr, r)} className="flex items-center gap-2">
                                {r}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : isBegadang ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="font-medium text-slate-400 cursor-pointer hover:text-blue-700 hover:underline"
                            >
                              Pilih alasan
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44">
                            {BEGADANG_REASONS.map(r => (
                              <DropdownMenuItem key={r} onClick={() => handleSetAlasan(dateStr, r)} className="flex items-center gap-2">
                                {r}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {lockControl}

      {/* Revisi 6: Ringkasan */}
      <StatusAnalytics
        entries={analyticsEntries}
        difficultyTitle="Tidur Terbaik"
        reasonTitle="Alasan Begadang"
        missedNoun="begadang"
      />
    </div>
  )
}
