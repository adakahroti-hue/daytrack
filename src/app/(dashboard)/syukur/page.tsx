"use client"

import { Fragment, useMemo } from 'react'
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
import { Calendar, CalendarDays, Sparkles, Check, X, Trash2, MessageCircle, Pencil } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSyukurLogRange, useUpsertSyukurLog, useDeleteSyukurLog } from '@/hooks/useSyukurLogs'
import { useRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'
import dynamic from 'next/dynamic'
import { AnalyticsSkeleton } from '@/components/ui/analytics-skeleton'
const StatusAnalytics = dynamic(() => import('@/components/analytics/StatusAnalytics').then(m => m.StatusAnalytics), { ssr: false, loading: () => <AnalyticsSkeleton /> })

// ─── Constants ────────────────────────────────────

// Revisi 2 (batch 5): alasan tidak bersyukur → disimpan di kolom alasan_tidak
type SyukurReason = 'sibuk' | 'malas' | 'tidak_fokus'

const SYUKUR_REASONS: { value: SyukurReason; label: string }[] = [
  { value: 'sibuk', label: 'Sibuk' },
  { value: 'malas', label: 'Malas' },
  { value: 'tidak_fokus', label: 'Tidak Fokus' },
]

const ALASAN_LABELS: Record<string, string> = {
  sibuk: 'Sibuk',
  malas: 'Malas',
  tidak_fokus: 'Tidak Fokus',
  lupa: 'Lupa',
  tidak_terpikir: 'Tidak Terpikir',
  lainnya: 'Lainnya',
}

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

interface SyukurLogEntry {
  id: string
  user_id: string
  tanggal: string
  status: 'sudah' | 'belum'
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

export default function SyukurPage() {
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

  const { data: logs = [], isLoading, error } = useSyukurLogRange(startDate, endDate)
  useRealtime({
    table: 'syukur',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['syukur', 'range', startDate, endDate]],
  })

  const upsertSyukurLog = useUpsertSyukurLog()
  const deleteSyukurLog = useDeleteSyukurLog()

  // Map tanggal -> entry
  const logMap = useMemo(() => {
    const map: Record<string, SyukurLogEntry> = {}
    for (const l of logs as SyukurLogEntry[]) map[l.tanggal] = l
    return map
  }, [logs])

  // Daftar tanggal dalam rentang (ascending — terbaru paling bawah)
  const dates = useMemo(() => {
    if (rangeEnd < rangeStart) return []
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(d => format(d, 'yyyy-MM-dd'))
  }, [rangeStart, rangeEnd])

  const handleSetStatus = async (tanggal: string, status: 'sudah' | 'belum', reasonValue?: SyukurReason) => {
    await upsertSyukurLog.mutateAsync({
      tanggal,
      status,
      alasan_tidak: status === 'belum' ? reasonValue : undefined,
    })
  }

  // Revisi 5: data untuk Ringkasan
  const analyticsEntries = useMemo(() => {
    return (logs as SyukurLogEntry[]).map(l => ({
      tanggal: l.tanggal,
      missed: l.status === 'belum',
      reason: l.status === 'belum' && l.alasan_tidak
        ? (ALASAN_LABELS[l.alasan_tidak] ?? 'Tidak')
        : (l.status === 'belum' ? 'Tidak' : null),
    }))
  }, [logs])

  const handleClear = async (tanggal: string) => {
    const entry = logMap[tanggal]
    if (entry) await deleteSyukurLog.mutateAsync(entry.id)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Tabel gaya Quran: Tanggal | Hari | Status */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className={cn('hidden sm:table-header-group sticky top-0 z-20 bg-white')}>
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('dt-col-stick sticky left-0 z-30 bg-white px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[72px] sm:min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-green-500" />
                  Tanggal
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[64px] sm:min-w-[90px] dt-col-stick sm:sticky sm:left-[100px] sm:z-30 sm:bg-white', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-green-500" />
                  Hari
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[150px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-green-500" />
                  Status
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-left font-semibold text-slate-700 min-w-[120px] sm:min-w-[160px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                  Alasan
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td>
              </tr>
            ) : (
              dates.map((dateStr, rowIdx) => {
                const date = new Date(dateStr + 'T00:00:00')
                const dayName = format(date, 'EEEE', { locale: id })
                const dateDisplay = format(date, 'd MMMM', { locale: id })
                const entry = logMap[dateStr]
                const isDone = entry?.status === 'sudah'
                const isMissed = entry?.status === 'belum'

                return (
                  <Fragment key={dateStr}>
                    {/* ── Mobile: kartu ringkas (sm:hidden) ── */}
                    <tr className={cn('sm:hidden border-b', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                      <td colSpan={4} className={cn('px-3 py-3', TABLE_BORDER)}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-semibold text-slate-800">{dateDisplay}</span>
                              <span className={cn('ml-2 shrink-0 inline-block px-1.5 py-0.5 rounded-full text-[11px] border font-medium', DAY_BADGE_COLORS[dayName] || 'bg-slate-100 text-slate-700 border-slate-200')}>{dayName}</span>
                              {isDone ? (
                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[11px] font-medium border border-green-200">
                                  <Check className="h-3 w-3" /> Sudah
                                </span>
                              ) : isMissed ? (
                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 px-2 py-0.5 text-[11px] font-medium border border-red-200">
                                  <X className="h-3 w-3" /> Tidak
                                </span>
                              ) : (
                                <span className="ml-2 text-slate-400 text-[11px]">-</span>
                              )}
                              {isMissed && entry?.alasan_tidak && (
                                <div className="mt-1 text-[11px] text-slate-500">{ALASAN_LABELS[entry.alasan_tidak] ?? entry.alasan_tidak}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" aria-label="Ubah status syukur" className="h-6 w-6 p-0 bg-slate-600 hover:bg-slate-700 text-white">
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-44">
                                  <DropdownMenuItem onClick={() => { handleSetStatus(dateStr, 'sudah') }} className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-600" /> Sudah
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { if (!isMissed) handleSetStatus(dateStr, 'belum') }} className="flex items-center gap-2">
                                    <X className="h-4 w-4 text-red-500" /> Tidak
                                  </DropdownMenuItem>
                                  {isMissed && (
                                    <>
                                      <DropdownMenuSeparator />
                                      {SYUKUR_REASONS.map(r => (
                                        <DropdownMenuItem
                                          key={r.value}
                                          onClick={() => handleSetStatus(dateStr, 'belum', r.value)}
                                          className="flex items-center gap-2"
                                        >
                                          {entry?.alasan_tidak === r.value ? <Check className="h-4 w-4 text-green-600" /> : <span className="w-4 h-4" />}
                                          {r.label}
                                        </DropdownMenuItem>
                                      ))}
                                    </>
                                  )}
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
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* ── Desktop: tabel penuh (hidden sm:table-row) ── */}
                    <tr
                      className={cn('hidden sm:table-row border-b transition-colors', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30', 'hover:bg-blue-50/40')}
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
                                  isMissed
                                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                    : isDone
                                      ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                      : 'text-slate-400 border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-600'
                                )}
                              >
                                {isDone && <Check className="h-3.5 w-3.5 shrink-0" />}
                                {isDone ? 'Sudah' : isMissed ? 'Tidak' : <X className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-44">
                              <DropdownMenuItem onClick={() => { handleSetStatus(dateStr, 'sudah') }} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-600" /> Sudah
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { if (!isMissed) handleSetStatus(dateStr, 'belum') }} className="flex items-center gap-2">
                                <X className="h-4 w-4 text-red-500" /> Tidak
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
                      <td className={cn('px-2 sm:px-3 py-2 text-center', TABLE_BORDER)}>
                        {isDone ? (
                          <span className="text-slate-400">—</span>
                        ) : isMissed ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="font-medium text-slate-700 hover:underline cursor-pointer"
                              >
                                <span className="truncate">{entry?.alasan_tidak ? (ALASAN_LABELS[entry.alasan_tidak] ?? entry.alasan_tidak) : 'Pilih alasan'}</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-44">
                              {SYUKUR_REASONS.map(r => (
                                <DropdownMenuItem
                                  key={r.value}
                                  onClick={() => handleSetStatus(dateStr, 'belum', r.value)}
                                  className="flex items-center gap-2"
                                >
                                  {entry?.alasan_tidak === r.value ? <Check className="h-4 w-4 text-green-600" /> : <span className="w-4 h-4" />}
                                  {r.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-slate-400">Pilih "Tidak" dulu</span>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Revisi 5: Ringkasan */}
      <StatusAnalytics
        entries={analyticsEntries}
        difficultyTitle="Frekuensi Bersyukur"
        reasonTitle="Alasan Tak Bersyukur"
        missedNoun="terlewat"
      />
    </div>
  )
}
