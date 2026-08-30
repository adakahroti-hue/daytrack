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
import { Calendar, CalendarDays, Utensils, UtensilsCrossed, Soup, Sun, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useHeaderControls, getIbadahRange } from '@/components/layout/HeaderControls'
import { useMakanLogRange, useUpsertMakanLog, useDeleteMakanLog } from '@/hooks/useMakanLogs'
import { useRealtime } from '@/hooks/useRealtime'
import { MAKAN_TIME_OPTIONS } from '@/lib/makan-options'

const DAY_BADGE_COLORS: Record<string, string> = {
  Senin: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Selasa: 'bg-orange-100 text-orange-800 border-orange-200',
  Rabu: 'bg-purple-100 text-purple-800 border-purple-200',
  Kamis: 'bg-amber-100 text-amber-800 border-amber-200',
  Jumat: 'bg-blue-100 text-blue-700 border-blue-200',
  Sabtu: 'bg-green-100 text-green-800 border-green-200',
  Minggu: 'bg-rose-100 text-rose-800 border-rose-200',
}

const TABLE_BORDER = 'border-slate-900'

interface MakanLogEntry {
  id: string
  user_id: string
  tanggal: string
  makan_pagi: string | null
  makan_siang: string | null
  makan_malam: string | null
  makan_pagi_isi: string | null
  makan_siang_isi: string | null
  makan_malam_isi: string | null
  created_at: string
  updated_at: string
}

const ISI_KEYS = {
  makan_pagi: 'makan_pagi_isi',
  makan_siang: 'makan_siang_isi',
  makan_malam: 'makan_malam_isi',
} as const

// Hitung selisih jam antara dua waktu "HH:MM:SS".
// Jika end <= start, dianggap menyeberang hari (end + 24 jam).
function diffJam(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let s = sh * 60 + sm
  let e = eh * 60 + em
  if (e <= s) e += 24 * 60 // menyeberang tengah malam
  return Math.round(((e - s) / 60) * 10) / 10
}

const COLUMNS = [
  { key: 'makan_pagi', label: 'Makan Pagi', icon: Sun },
  { key: 'makan_siang', label: 'Makan Siang', icon: Soup },
  { key: 'makan_malam', label: 'Makan Malam', icon: UtensilsCrossed },
] as const

export default function MakanPage() {
  const { ibadahPeriod: period, ibadahDate: anchorDate } = useHeaderControls()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date()
    const { start, end } = getIbadahRange(period, anchorDate)
    const cappedEnd = end > today ? today : end
    return { rangeStart: start, rangeEnd: cappedEnd }
  }, [period, anchorDate])

  const startDate = format(rangeStart, 'yyyy-MM-dd')
  const endDate = format(rangeEnd, 'yyyy-MM-dd')

  const { data: logs = [], isLoading, error } = useMakanLogRange(startDate, endDate)
  useRealtime({
    table: 'makan',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['makan', 'range', startDate, endDate]],
  })

  const upsertMakanLog = useUpsertMakanLog()
  const deleteMakanLog = useDeleteMakanLog()

  const logMap = useMemo(() => {
    const map: Record<string, MakanLogEntry> = {}
    for (const l of logs as MakanLogEntry[]) map[l.tanggal] = l
    return map
  }, [logs])

  const dates = useMemo(() => {
    if (rangeEnd < rangeStart) return []
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(d => format(d, 'yyyy-MM-dd'))
  }, [rangeStart, rangeEnd])

  // map tanggal -> entry hari berikutnya (untuk jeda malam -> pagi)
  const nextDayMap = useMemo(() => {
    const map: Record<string, MakanLogEntry> = {}
    for (const d of dates) {
      const next = new Date(d + 'T00:00:00')
      next.setDate(next.getDate() + 1)
      const nextStr = format(next, 'yyyy-MM-dd')
      if (logMap[nextStr]) map[d] = logMap[nextStr]
    }
    return map
  }, [dates, logMap])

  const handleSetJam = async (tanggal: string, field: 'makan_pagi' | 'makan_siang' | 'makan_malam', value: string) => {
    const entry = logMap[tanggal]
    await upsertMakanLog.mutateAsync({
      tanggal,
      makan_pagi: field === 'makan_pagi' ? value : (entry?.makan_pagi ?? undefined),
      makan_siang: field === 'makan_siang' ? value : (entry?.makan_siang ?? undefined),
      makan_malam: field === 'makan_malam' ? value : (entry?.makan_malam ?? undefined),
    })
  }

  const handleSetIsi = async (tanggal: string, field: 'makan_pagi_isi' | 'makan_siang_isi' | 'makan_malam_isi', value: string) => {
    const entry = logMap[tanggal]
    await upsertMakanLog.mutateAsync({
      tanggal,
      makan_pagi: entry?.makan_pagi ?? undefined,
      makan_siang: entry?.makan_siang ?? undefined,
      makan_malam: entry?.makan_malam ?? undefined,
      makan_pagi_isi: field === 'makan_pagi_isi' ? value : (entry?.makan_pagi_isi ?? undefined),
      makan_siang_isi: field === 'makan_siang_isi' ? value : (entry?.makan_siang_isi ?? undefined),
      makan_malam_isi: field === 'makan_malam_isi' ? value : (entry?.makan_malam_isi ?? undefined),
    })
  }

  const handleClear = async (tanggal: string) => {
    const entry = logMap[tanggal]
    if (entry) await deleteMakanLog.mutateAsync(entry.id)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('dt-col-stick sticky left-0 z-30 bg-white px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[72px] sm:min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Calendar className="h-3.5 w-3.5 text-orange-500" /> Tanggal</div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[64px] sm:min-w-[90px] dt-col-stick sm:sticky sm:left-[100px] sm:z-30 sm:bg-white', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-orange-500" /> Hari</div>
              </th>
              {COLUMNS.map(col => (
                <Fragment key={col.key}>
                  <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[90px] sm:min-w-[110px]', TABLE_BORDER)}>
                    <div className="flex items-center justify-center gap-1"><col.icon className="h-3.5 w-3.5 text-orange-500" /> {col.label}</div>
                  </th>
                  <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[160px]', TABLE_BORDER)}>
                    <div className="flex items-center justify-center gap-1"><Utensils className="h-3.5 w-3.5 text-orange-500" /> Makanan</div>
                  </th>
                </Fragment>
              ))}
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[80px] sm:min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Utensils className="h-3.5 w-3.5 text-orange-500" /> Jeda Pagi→Siang</div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[80px] sm:min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Utensils className="h-3.5 w-3.5 text-orange-500" /> Jeda Siang→Malam</div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[80px] sm:min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Utensils className="h-3.5 w-3.5 text-orange-500" /> Jeda Malam→Pagi</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={13} className="text-center py-12 text-slate-400"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" /><span className="text-sm">Memuat data...</span></div></td></tr>
            ) : error ? (
              <tr><td colSpan={13} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td></tr>
            ) : (
              dates.map((dateStr, rowIdx) => {
                const date = new Date(dateStr + 'T00:00:00')
                const dayName = format(date, 'EEEE', { locale: id })
                const dateDisplay = format(date, 'd MMMM', { locale: id })
                const entry = logMap[dateStr]
                const nextEntry = nextDayMap[dateStr]

                const jedaPagiSiang = diffJam(entry?.makan_pagi, entry?.makan_siang)
                const jedaSiangMalam = diffJam(entry?.makan_siang, entry?.makan_malam)
                const jedaMalamPagi = diffJam(entry?.makan_malam, nextEntry?.makan_pagi)

                return (
                  <tr key={dateStr} className={cn('border-b transition-colors', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30', 'hover:bg-blue-50/40')}>
                    <td className={cn('dt-col-stick sticky left-0 z-10 bg-inherit px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>
                      <span className="sm:hidden">{format(date, 'd MMM', { locale: id })}</span>
                      <span className="hidden sm:inline">{dateDisplay}</span>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r dt-col-stick sm:sticky sm:left-[100px] sm:z-10 sm:bg-inherit', TABLE_BORDER)}>
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs border font-medium', DAY_BADGE_COLORS[dayName] || 'bg-slate-100 text-slate-700 border-slate-200')}>{dayName}</span>
                    </td>
                    {COLUMNS.map(col => {
                      const isiKey = ISI_KEYS[col.key]
                      const isiVal = entry?.[isiKey] ?? ''
                      return (
                        <Fragment key={col.key}>
                          <td className={cn('px-2 sm:px-3 py-2 text-center border-r', TABLE_BORDER)}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" className="font-medium text-slate-700 cursor-pointer hover:text-orange-700 hover:underline">
                                  {entry?.[col.key] ? entry[col.key]!.slice(0, 5) : 'Pilih'}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="max-h-64 overflow-y-auto w-32">
                                {MAKAN_TIME_OPTIONS.map(opt => (
                                  <DropdownMenuItem key={opt.value} onClick={() => handleSetJam(dateStr, col.key, opt.value)} className="flex items-center gap-2">
                                    {opt.label}
                                  </DropdownMenuItem>
                                ))}
                                {entry?.[col.key] && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleSetJam(dateStr, col.key, '')} className="flex items-center gap-2 text-destructive focus:text-destructive">
                                      <Trash2 className="h-4 w-4" /> Kosongkan
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          <td className={cn('px-2 sm:px-3 py-2 border-r', TABLE_BORDER)}>
                            <input
                              type="text"
                              value={isiVal}
                              placeholder="Apa yang dimakan?"
                              onChange={(e) => handleSetIsi(dateStr, isiKey, e.target.value)}
                              className="w-full min-w-0 text-xs sm:text-sm text-slate-700 bg-transparent border-0 border-b border-dashed border-slate-200 focus:border-orange-400 focus:outline-none py-1 px-0.5 placeholder:text-slate-300"
                            />
                          </td>
                        </Fragment>
                      )
                    })}
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r tabular-nums font-medium text-slate-700', TABLE_BORDER)}>
                      {jedaPagiSiang != null ? `${jedaPagiSiang} jam` : '-'}
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r tabular-nums font-medium text-slate-700', TABLE_BORDER)}>
                      {jedaSiangMalam != null ? `${jedaSiangMalam} jam` : '-'}
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r tabular-nums font-medium text-slate-700', TABLE_BORDER)}>
                      {jedaMalamPagi != null ? `${jedaMalamPagi} jam` : '-'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
