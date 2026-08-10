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
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from 'date-fns'
import { id } from 'date-fns/locale'
import { Calendar, Check, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTableLock } from '@/components/ui/table-lock'
import { useWaterLogRange, useUpsertWaterLog, useDeleteWaterLog } from '@/hooks/useMinumAirLogs'
import { useRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'
import dynamic from 'next/dynamic'
import { AnalyticsSkeleton } from '@/components/ui/analytics-skeleton'
const MinumAirAnalytics = dynamic(() => import('@/components/minum-air/MinumAirAnalytics').then(m => m.MinumAirAnalytics), { ssr: false, loading: () => <AnalyticsSkeleton /> })

// ─── Constants ────────────────────────────────────

type WaterKey = 'setelah_bangun' | 'setelah_dzuhur' | 'setelah_ashar' | 'setelah_maghrib' | 'sebelum_tidur'

const WATER_TIMES: { key: WaterKey; label: string; icon: string; waktu: string }[] = [
  { key: 'setelah_bangun', label: 'Setelah Bangun', icon: '🌅', waktu: '05:30' },
  { key: 'setelah_dzuhur', label: 'Setelah Dzuhur', icon: '🌞', waktu: '13:30' },
  { key: 'setelah_ashar', label: 'Setelah Ashar', icon: '🌥️', waktu: '16:00' },
  { key: 'setelah_maghrib', label: 'Setelah Maghrib', icon: '🌇', waktu: '18:00' },
  { key: 'sebelum_tidur', label: 'Sebelum Tidur', icon: '🌙', waktu: '21:30' },
]

// Revisi 6: daftar alasan tidak minum (disimpan di kolom catatan: "Tidak minum: <alasan>")
const WATER_REASONS = ['Malas', 'Lupa', 'Sibuk', 'Sakit', 'Perjalanan', 'Tidak Ada Tempat', 'Bersama Teman', 'Lainnya']

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
const GLASS_ML = 250

type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'yearly'
const PERIOD_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

interface WaterLogEntry {
  id: string
  user_id: string
  tanggal: string
  waktu_baca: string
  jumlah_ml: number
  catatan: string | null
  status: string | null
  created_at: string
  updated_at: string
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ─── Main Component ────────────────────────────────

export default function MinumAirPage() {
  // Revisi mobile (batch 8): lock/unlock tabel — khusus tampilan mobile
  const { effectiveLocked, lockControl } = useTableLock()
  // ── Rev 6: periode & tanggal dari HeaderControls (toolbar pindah ke header) ──
  const { ibadahPeriod: period, ibadahDate: anchorDate } = useHeaderControls()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const { rangeStart, rangeEnd, periodLabel, isCurrentPeriod } = useMemo(() => {
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
    const isCurrent = start <= today && end >= startOfDaySafe(today)

    let label: string
    if (period === 'daily') {
      label = format(anchorDate, 'EEEE, d MMMM yyyy', { locale: id })
    } else if (period === 'weekly') {
      label = `${format(start, 'd MMM', { locale: id })} – ${format(end, 'd MMM yyyy', { locale: id })}`
    } else if (period === 'monthly') {
      label = format(anchorDate, 'MMMM yyyy', { locale: id })
    } else {
      label = format(anchorDate, 'yyyy', { locale: id })
    }
    return { rangeStart: start, rangeEnd: cappedEnd, periodLabel: label, isCurrentPeriod: isCurrent }
  }, [period, anchorDate])

  const startDate = format(rangeStart, 'yyyy-MM-dd')
  const endDate = format(rangeEnd, 'yyyy-MM-dd')

  const { data: waterLogs = [], isLoading, error, refetch } = useWaterLogRange(startDate, endDate)
  const upsertWaterLog = useUpsertWaterLog()
  const deleteWaterLog = useDeleteWaterLog()

  useRealtime({
    table: 'minum_air_logs',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['minum_air_logs', 'range', startDate, endDate]],
  })

  // Map: tanggal -> waktu_baca -> entry
  const logMap = useMemo(() => {
    const map: Record<string, Record<string, WaterLogEntry>> = {}
    for (const log of waterLogs as WaterLogEntry[]) {
      if (!map[log.tanggal]) map[log.tanggal] = {}
      map[log.tanggal][log.waktu_baca] = log
    }
    return map
  }, [waterLogs])

  const dates = useMemo(() => {
    if (rangeEnd < rangeStart) return []
    // Revisi: urutan tanggal dari atas ke bawah — tanggal baru muncul di bawah
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(d => format(d, 'yyyy-MM-dd'))
  }, [rangeStart, rangeEnd])

  const handleSetStatus = async (tanggal: string, key: WaterKey, status: 'sudah' | 'lupa', reason?: string) => {
    await upsertWaterLog.mutateAsync({
      tanggal,
      waktu_baca: key,
      jumlah_ml: status === 'sudah' ? GLASS_ML : 0,
      status,
      catatan: status === 'lupa' && reason ? `Tidak minum: ${reason}` : undefined,
    })
    refetch()
  }
  const handleClear = async (tanggal: string, key: WaterKey) => {
    const existing = logMap[tanggal]?.[key]
    if (existing) {
      await deleteWaterLog.mutateAsync(existing.id)
      refetch()
    }
  }


  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Table — gaya seperti tab sholat */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('dt-col-stick sticky left-0 z-30 bg-white px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Tanggal
                </div>
              </th>
              <th className={cn('px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[90px] dt-col-stick sm:sticky sm:left-[100px] sm:z-30 sm:bg-white', TABLE_BORDER)}>
                Hari
              </th>
              {WATER_TIMES.map(col => (
                <th key={col.key} className={cn('px-3 py-2 text-center font-semibold text-slate-700 border-r last:border-r-0 min-w-[96px]', TABLE_BORDER)}>
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className="text-base leading-none">{col.icon}</span>
                    <span>{col.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn(effectiveLocked && 'pointer-events-none select-none')}>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td>
              </tr>
            ) : (
              dates.map((dateStr, rowIdx) => {
                const date = new Date(dateStr + 'T00:00:00')
                const dayName = format(date, 'EEEE', { locale: id })
                const dateDisplay = format(date, 'd MMMM', { locale: id })

                return (
                  <tr
                    key={dateStr}
                    className={cn('border-b transition-colors', TABLE_BORDER, dateStr === todayStr ? 'row-today-pulse' : (rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'), 'hover:bg-blue-50/40')}
                  >
                    <td className={cn('dt-col-stick sticky left-0 z-10 bg-inherit px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>
                      <span className="sm:hidden">{format(date, 'd MMM', { locale: id })}</span>
                      <span className="hidden sm:inline">{dateDisplay}</span>
                    </td>
                    <td className={cn('px-3 py-2 text-center border-r dt-col-stick sm:sticky sm:left-[100px] sm:z-10 sm:bg-inherit', TABLE_BORDER)}>
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs border font-medium', DAY_BADGE_COLORS[dayName] || 'bg-slate-100 text-slate-700 border-slate-200')}>
                        {dayName}
                      </span>
                    </td>
                    {WATER_TIMES.map(col => {
                      const entry = logMap[dateStr]?.[col.key]
                      const isDone = !!entry && (entry.status === 'sudah' || entry.jumlah_ml > 0)
                      const isLupa = !!entry && entry.status === 'lupa'
                      const lupaLabel = isLupa && entry?.catatan?.startsWith('Tidak minum:')
                        ? entry.catatan.replace('Tidak minum: ', '')
                        : 'Lupa'
                      return (
                        <td
                          key={col.key}
                          className={cn('px-3 py-2 text-center border-r last:border-r-0', TABLE_BORDER)}
                        >
                          <div className="flex items-center justify-center min-h-[32px]">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    'inline-flex items-center justify-center gap-1 rounded-full px-2 py-1 text-xs font-medium border transition-colors cursor-pointer',
                                    isLupa
                                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                      : isDone
                                        ? 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200'
                                        : 'text-slate-400 border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-600'
                                  )}
                                >
                                  {isDone && <Check className="h-3.5 w-3.5" />}
                                  {isDone ? 'Sudah' : isLupa ? lupaLabel : 'Belum'}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-40">
                                <DropdownMenuItem onClick={() => handleSetStatus(dateStr, col.key, 'sudah')} className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-blue-600" /> Sudah Minum
                                </DropdownMenuItem>
                                {WATER_REASONS.map(r => (
                                  <DropdownMenuItem key={r} onClick={() => handleSetStatus(dateStr, col.key, 'lupa', r)} className="flex items-center gap-2">
                                    <X className="h-4 w-4 text-red-500" /> {r}
                                  </DropdownMenuItem>
                                ))}
                                {entry && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleClear(dateStr, col.key)} className="flex items-center gap-2 text-destructive focus:text-destructive">
                                      <Trash2 className="h-4 w-4" /> Batalkan
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {lockControl}

      {/* Revisi 6: Ringkasan — tingkat kesulitan + alasan terbanyak tidak minum */}
      <MinumAirAnalytics logMap={logMap} columns={WATER_TIMES} />
    </div>
  )
}
