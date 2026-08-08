"use client"

export const dynamic = "force-dynamic"

import { useState, useMemo, useRef, useEffect, useCallback, forwardRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { Check, Sun, CloudSun, Sunset, Moon, Calendar, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTableLock } from '@/components/ui/table-lock'
import { usePrayerLogRange, useTogglePrayer, useUpdatePrayerQuality } from '@/hooks/usePrayerLogs'
import { useRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'
import nextDynamic from 'next/dynamic'
import { AnalyticsSkeleton } from '@/components/ui/analytics-skeleton'
const SholatAnalytics = nextDynamic(() => import('@/components/sholat/SholatAnalytics').then(m => m.SholatAnalytics), { ssr: false, loading: () => <AnalyticsSkeleton /> })

// ─── Constants ────────────────────────────────────

type SholatKey = 'subuh' | 'dhuha' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya'

const SHOLAT_COLUMNS: { key: SholatKey; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: 'subuh', label: 'Subuh', icon: Sun, color: 'text-amber-500' },
  { key: 'dhuha', label: 'Dhuha', icon: Sun, color: 'text-orange-400' },
  { key: 'dzuhur', label: 'Dzuhur', icon: Sun, color: 'text-yellow-500' },
  { key: 'ashar', label: 'Ashar', icon: CloudSun, color: 'text-sky-500' },
  { key: 'maghrib', label: 'Maghrib', icon: Sunset, color: 'text-rose-500' },
  { key: 'isya', label: 'Isya', icon: Moon, color: 'text-indigo-500' },
]

type StatusOption = {
  value: string
  label: string
  isDone: boolean
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'sudah', label: 'Sudah Sholat', isDone: true },
  { value: 'malas', label: 'Malas', isDone: false },
  { value: 'lupa', label: 'Lupa', isDone: false },
  { value: 'sibuk', label: 'Sibuk', isDone: false },
  { value: 'sakit', label: 'Sakit', isDone: false },
  { value: 'perjalanan', label: 'Perjalanan', isDone: false },
  { value: 'tak_ada_tempat', label: 'Tidak Ada Tempat Sholat', isDone: false },
  { value: 'bersama_teman', label: 'Bersama Teman', isDone: false },
  { value: 'lainnya', label: 'Lainnya', isDone: false },
]

const REASON_LABELS: Record<string, string> = {
  ketiduran: 'Ketiduran',
  malas: 'Malas',
  lupa: 'Lupa',
  sibuk: 'Sibuk',
  sakit: 'Sakit',
  perjalanan: 'Perjalanan',
  tak_ada_tempat: 'Tidak Ada Tempat',
  bersama_teman: 'Bersama Teman',
  lainnya: 'Lainnya',
}

// Rating kualitas sholat 1-5 dengan label kategori
const RATING_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 1, label: 'Kurang', desc: 'Sekadar menggugurkan kewajiban' },
  { value: 2, label: 'Cukup', desc: 'Sholat tapi kurang fokus' },
  { value: 3, label: 'Baik', desc: 'Cukup khusyuk' },
  { value: 4, label: 'Sangat Baik', desc: 'Khusyuk dan tuma\'ninah' },
  { value: 5, label: 'Sempurna', desc: 'Hadir hati sepenuhnya' },
]

const RATING_LABELS: Record<number, string> = {
  1: 'Kurang',
  2: 'Cukup',
  3: 'Baik',
  4: 'Sangat Baik',
  5: 'Sempurna',
}

// Warna badge rating (1 = merah, 5 = hijau)
const RATING_COLORS: Record<number, string> = {
  1: 'bg-rose-100 text-rose-700 border-rose-200',
  2: 'bg-orange-100 text-orange-700 border-orange-200',
  3: 'bg-amber-100 text-amber-700 border-amber-200',
  4: 'bg-lime-100 text-lime-700 border-lime-200',
  5: 'bg-green-100 text-green-700 border-green-200',
}

// Day badge pastel colors
const DAY_BADGE_COLORS: Record<string, string> = {
  Senin: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Selasa: 'bg-orange-100 text-orange-800 border-orange-200',
  Rabu: 'bg-purple-100 text-purple-800 border-purple-200',
  Kamis: 'bg-amber-100 text-amber-800 border-amber-200',
  Jumat: 'bg-blue-100 text-blue-800 border-blue-200',
  Sabtu: 'bg-green-100 text-green-800 border-green-200',
  Minggu: 'bg-rose-100 text-rose-800 border-rose-200',
}

// Daytrack table border style — garis hitam
const TABLE_BORDER = 'border-slate-900'

// ─── Types ─────────────────────────────────────────

type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'yearly'

const PERIOD_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

type SholatRow = {
  id: string
  tanggal: string
  sholat_subuh: boolean
  sholat_dhuha: boolean
  sholat_dzuhur: boolean
  sholat_ashar: boolean
  sholat_maghrib: boolean
  sholat_isya: boolean
  alasan_subuh: string | null
  alasan_dhuha: string | null
  alasan_dzuhur: string | null
  alasan_ashar: string | null
  alasan_maghrib: string | null
  alasan_isya: string | null
  kualitas_subuh: number | null
  kualitas_dhuha: number | null
  kualitas_dzuhur: number | null
  kualitas_ashar: number | null
  kualitas_maghrib: number | null
  kualitas_isya: number | null
}

type CellStatus = 'done' | 'reason' | 'empty'

type DropdownState = {
  tanggal: string
  sholatKey: SholatKey
  rowIndex: number
  colIndex: number
} | null

// ─── Helper: get cell status from row data ────────

function getCellStatus(row: SholatRow | undefined, key: SholatKey): { status: CellStatus; reason: string | null; quality: number | null } {
  if (!row) return { status: 'empty', reason: null, quality: null }
  const isDone = row[`sholat_${key}` as keyof SholatRow] as boolean
  const reason = row[`alasan_${key}` as keyof SholatRow] as string | null
  const quality = row[`kualitas_${key}` as keyof SholatRow] as number | null
  if (isDone) return { status: 'done', reason: null, quality: quality ?? null }
  if (reason) return { status: 'reason', reason, quality: null }
  return { status: 'empty', reason: null, quality: null }
}

// ─── Rating badge (compact, untuk di dalam cell) ──

function RatingBadge({ quality }: { quality: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-px rounded-full border text-[10px] font-semibold leading-tight',
        RATING_COLORS[quality] || 'bg-slate-100 text-slate-600 border-slate-200'
      )}
      title={RATING_LABELS[quality]}
    >
      <Star className="h-2.5 w-2.5 fill-current" />
      {quality}
    </span>
  )
}

// ─── Dropdown Menu Component ──────────────────────

const DropdownMenuContent = forwardRef<HTMLDivElement, {
  tanggal: string
  sholatKey: SholatKey
  sholatMap: Record<string, SholatRow>
  onSelect: (option: StatusOption) => void
  onRate: (quality: number) => void
  onClear: () => void
  onClose: () => void
}>(({ tanggal, sholatKey, sholatMap, onSelect, onRate, onClear, onClose }, ref) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight?: number } | null>(null)

  useEffect(() => {
    const cell = document.querySelector(`[data-dropdown-cell="${tanggal}-${sholatKey}"]`) as HTMLElement
    if (!cell) return

    const rect = cell.getBoundingClientRect()
    const menuWidth = 240
    const menuMaxHeight = 460

    let top = rect.bottom + 4
    let left = rect.left

    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 8
    }
    if (left < 8) left = 8

    // Revisi: popup selalu muncul di bawah cell — jangan flip ke atas.
    // Bila ruang di bawah kurang, kecilkan maxHeight agar muat & bisa di-scroll.
    const availableBelow = window.innerHeight - top - 8
    const maxHeight = Math.max(160, Math.min(menuMaxHeight, availableBelow))

    setPosition({ top, left, maxHeight })
  }, [tanggal, sholatKey])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const { currentValue, currentQuality } = (() => {
    const row = sholatMap[tanggal]
    if (!row) return { currentValue: null as string | null, currentQuality: null as number | null }
    const isDone = row[`sholat_${sholatKey}` as keyof SholatRow] as boolean
    const reason = row[`alasan_${sholatKey}` as keyof SholatRow] as string | null
    const quality = row[`kualitas_${sholatKey}` as keyof SholatRow] as number | null
    if (isDone) return { currentValue: 'sudah', currentQuality: quality ?? null }
    if (reason) return { currentValue: reason, currentQuality: null }
    return { currentValue: null, currentQuality: null }
  })()

  if (!position) return null

  const isDone = currentValue === 'sudah'

  return (
    <div
      ref={menuRef}
      data-sholat-dropdown
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[240px] max-h-[460px] overflow-y-auto"
      style={{ top: position.top, left: position.left, maxHeight: position.maxHeight }}
    >
      {STATUS_OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => onSelect(option)}
          className={cn(
            'w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors',
            'hover:bg-blue-50 text-slate-700',
            currentValue === option.value && 'bg-blue-50 font-medium text-blue-700'
          )}
        >
          {option.isDone ? (
            <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
          ) : (
            <span className="w-3.5 h-3.5 shrink-0" />
          )}
          {option.label}
        </button>
      ))}

      {/* Rating kualitas — hanya muncul bila sudah sholat */}
      {isDone && (
        <>
          <div className="border-t border-slate-100 my-1" />
          <div className="px-3 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Kualitas Sholat</p>
            <div className="space-y-0.5">
              {RATING_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => onRate(r.value)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors',
                    'hover:bg-blue-50',
                    currentQuality === r.value ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                  )}
                >
                  <span className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold shrink-0',
                    RATING_COLORS[r.value]
                  )}>
                    {r.value}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-slate-800 leading-tight">{r.label}</span>
                    <span className="block text-[11px] text-slate-400 leading-tight truncate">{r.desc}</span>
                  </span>
                  {currentQuality === r.value && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="border-t border-slate-100 my-1" />
      {/* Clear status */}
      <button
        onClick={onClear}
        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-slate-50 text-slate-500"
      >
        <span className="w-3.5 h-3.5 shrink-0" />
        Kosongkan Status
      </button>
    </div>
  )
})
DropdownMenuContent.displayName = 'DropdownMenuContent'

// ─── Main Component ────────────────────────────────

export default function SholatPage() {
  // Revisi mobile (batch 8): lock/unlock tabel — khusus tampilan mobile
  const { effectiveLocked, lockControl } = useTableLock()
  const queryClient = useQueryClient()
  const [dropdown, setDropdown] = useState<DropdownState>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // ── Rev 10: periode & anchor date dari HeaderControls (toolbar di header) ──
  const { ibadahPeriod: period, ibadahDate: anchorDate } = useHeaderControls()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Hitung rentang tanggal berdasarkan periode + anchor
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
    // Batasi end ke hari ini bila periode mencakup hari ini (hindari ratusan baris kosong masa depan)
    const cappedEnd = end > today ? today : end
    // Periode "saat ini" = rentang penuh (start..end) mencakup hari ini
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

  const { data: sholatRows = [], isLoading, error } = usePrayerLogRange(startDate, endDate)
  useRealtime({
    table: 'prayer_logs',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['prayer_logs', 'range', startDate, endDate]],
  })

  const updateCell = useTogglePrayer()
  const updateQuality = useUpdatePrayerQuality()

  // Build a map of tanggal -> row for quick lookup
  const sholatMap = useMemo(() => {
    const map: Record<string, SholatRow> = {}
    for (const row of sholatRows as SholatRow[]) {
      map[row.tanggal] = row
    }
    return map
  }, [sholatRows])

  // Generate all dates in range (descending — newest first)
  const dates = useMemo(() => {
    if (rangeEnd < rangeStart) return []
    // Urutan tanggal dari atas ke bawah — terbaru paling bawah (ascending)
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(d => format(d, 'yyyy-MM-dd'))
  }, [rangeStart, rangeEnd])

  // Close dropdown on outside click — menu di-render fixed di luar table container,
  // jadi cek juga apakah klik terjadi di dalam menu (via data attribute)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      const inTable = tableContainerRef.current?.contains(target)
      const inMenu = !!target.closest?.('[data-sholat-dropdown]')
      if (!inTable && !inMenu) {
        setDropdown(null)
      }
    }
    if (dropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdown])

  // Optimistic update helper
  const optimisticallyUpdateCell = useCallback(
    (tanggal: string, key: SholatKey, status: CellStatus, reason: string | null) => {
      queryClient.setQueryData(['prayer_logs', 'range', startDate, endDate], (old: SholatRow[] | undefined) => {
        if (!old) return old
        const existing = old.find(r => r.tanggal === tanggal)
        if (existing) {
          return old.map(r => {
            if (r.tanggal !== tanggal) return r
            return {
              ...r,
              [`sholat_${key}`]: status === 'done',
              [`alasan_${key}`]: status === 'reason' ? reason : null,
            } as SholatRow
          })
        }
        const newRow: SholatRow = {
          id: 'temp-' + tanggal,
          tanggal,
          sholat_subuh: false, sholat_dhuha: false, sholat_dzuhur: false,
          sholat_ashar: false, sholat_maghrib: false, sholat_isya: false,
          alasan_subuh: null, alasan_dhuha: null, alasan_dzuhur: null,
          alasan_ashar: null, alasan_maghrib: null, alasan_isya: null,
          kualitas_subuh: null, kualitas_dhuha: null, kualitas_dzuhur: null,
          kualitas_ashar: null, kualitas_maghrib: null, kualitas_isya: null,
          [`sholat_${key}`]: status === 'done',
          [`alasan_${key}`]: status === 'reason' ? reason : null,
        } as SholatRow
        return [...old, newRow]
      })
    },
    [queryClient, startDate, endDate]
  )

  const optimisticallyUpdateQuality = useCallback(
    (tanggal: string, key: SholatKey, quality: number) => {
      queryClient.setQueryData(['prayer_logs', 'range', startDate, endDate], (old: SholatRow[] | undefined) => {
        if (!old) return old
        return old.map(r => (r.tanggal === tanggal ? ({ ...r, [`kualitas_${key}`]: quality } as SholatRow) : r))
      })
    },
    [queryClient, startDate, endDate]
  )

  const handleSelectStatus = async (option: StatusOption) => {
    if (!dropdown) return
    const { tanggal, sholatKey } = dropdown

    if (option.value === 'sudah') {
      optimisticallyUpdateCell(tanggal, sholatKey, 'done', null)
      try {
        await updateCell.mutateAsync({ tanggal, prayerTime: sholatKey, value: true })
      } catch {
        queryClient.invalidateQueries({ queryKey: ['prayer_logs'] })
      }
      // Jangan tutup dropdown — biarkan user langsung pilih rating kualitas
      return
    }

    setDropdown(null)
    const reason = option.value
    optimisticallyUpdateCell(tanggal, sholatKey, 'reason', reason)
    try {
      await updateCell.mutateAsync({ tanggal, prayerTime: sholatKey, value: false, reason })
    } catch {
      queryClient.invalidateQueries({ queryKey: ['prayer_logs'] })
    }
  }

  const handleRate = async (quality: number) => {
    if (!dropdown) return
    const { tanggal, sholatKey } = dropdown
    optimisticallyUpdateQuality(tanggal, sholatKey, quality)
    try {
      await updateQuality.mutateAsync({ tanggal, prayerTime: sholatKey, quality })
    } catch {
      queryClient.invalidateQueries({ queryKey: ['prayer_logs'] })
    }
  }

  const handleClearStatus = async () => {
    if (!dropdown) return
    const { tanggal, sholatKey } = dropdown
    setDropdown(null)

    optimisticallyUpdateCell(tanggal, sholatKey, 'empty', null)
    optimisticallyUpdateQuality(tanggal, sholatKey, 0)
    try {
      await updateCell.mutateAsync({ tanggal, prayerTime: sholatKey, value: false })
    } catch {
      queryClient.invalidateQueries({ queryKey: ['prayer_logs'] })
    }
  }

  const handleCellClick = (e: React.MouseEvent, tanggal: string, sholatKey: SholatKey, rowIndex: number, colIndex: number) => {
    e.stopPropagation()
    if (dropdown?.tanggal === tanggal && dropdown?.sholatKey === sholatKey) {
      setDropdown(null)
      return
    }
    setDropdown({ tanggal, sholatKey, rowIndex, colIndex })
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* ── Rev 3: Table dengan garis hitam (daytrack style) ── */}
      <div
        ref={tableContainerRef}
        className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}
      >
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
              {SHOLAT_COLUMNS.map(col => (
                <th key={col.key} className={cn('px-3 py-2 text-center font-semibold text-slate-700 border-r last:border-r-0 min-w-[110px]', TABLE_BORDER)}>
                  <div className="flex items-center justify-center gap-1">
                    <col.icon className={cn('h-3.5 w-3.5', col.color)} />
                    {col.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn(effectiveLocked && 'pointer-events-none select-none')}>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-red-500">
                  Gagal memuat data: {error.message}
                </td>
              </tr>
            ) : (
              dates.map((dateStr, rowIdx) => {
                const row = sholatMap[dateStr]
                const date = new Date(dateStr + 'T00:00:00')
                const dayName = format(date, 'EEEE', { locale: id })
                const dateDisplay = format(date, 'd MMMM', { locale: id })

                return (
                  <tr
                    key={dateStr}
                    className={cn(
                      'border-b transition-colors',
                      TABLE_BORDER,
                      dateStr === todayStr ? 'row-today-pulse' : (rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'),
                      'hover:bg-blue-50/40'
                    )}
                  >
                    <td className={cn('dt-col-stick sticky left-0 z-10 bg-inherit px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>
                      <span className="sm:hidden">{format(date, 'd MMM', { locale: id })}</span>
                      <span className="hidden sm:inline">{dateDisplay}</span>
                    </td>
                    <td className={cn('px-3 py-2 text-center border-r dt-col-stick sm:sticky sm:left-[100px] sm:z-10 sm:bg-inherit', TABLE_BORDER)}>
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-xs border font-medium',
                        DAY_BADGE_COLORS[dayName] || 'bg-slate-100 text-slate-700 border-slate-200'
                      )}>
                        {dayName}
                      </span>
                    </td>
                    {SHOLAT_COLUMNS.map((col, colIdx) => {
                      const { status, reason, quality } = getCellStatus(row, col.key)
                      const isDropdownOpen = dropdown?.tanggal === dateStr && dropdown?.sholatKey === col.key

                      return (
                        <td
                          key={col.key}
                          data-dropdown-cell={`${dateStr}-${col.key}`}
                          className={cn(
                            'px-3 py-2 text-center border-r last:border-r-0 cursor-pointer transition-colors relative',
                            TABLE_BORDER,
                            'hover:bg-blue-50/60',
                            isDropdownOpen && 'bg-blue-50'
                          )}
                          onClick={(e) => handleCellClick(e, dateStr, col.key, rowIdx, colIdx + 2)}
                        >
                          <div className="flex flex-col items-center justify-center gap-1 min-h-[32px]">
                            {status === 'done' && (
                              <>
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 border border-green-200">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                                {quality && quality >= 1 && quality <= 5 && <RatingBadge quality={quality} />}
                              </>
                            )}
                            {status === 'reason' && reason && (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium whitespace-nowrap">
                                {REASON_LABELS[reason] || reason}
                              </span>
                            )}
                            {status === 'empty' && (
                              <span className="text-slate-300 text-xs">×</span>
                            )}
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

      {/* ── Analytics & Insight — tepat di bawah tabel (dinamis per periode aktif) ── */}
      <SholatAnalytics
        dates={dates}
        sholatMap={sholatMap}
        columns={SHOLAT_COLUMNS}
        alasanLabels={REASON_LABELS}
      />

      {/* Dropdown menu */}
      {dropdown && (
        <DropdownMenuContent
          ref={tableContainerRef}
          tanggal={dropdown.tanggal}
          sholatKey={dropdown.sholatKey}
          sholatMap={sholatMap}
          onSelect={handleSelectStatus}
          onRate={handleRate}
          onClear={handleClearStatus}
          onClose={() => setDropdown(null)}
        />
      )}
    </div>
  )
}

// Helper: startOfDay yang aman
function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
