"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
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
import { Calendar, CalendarDays, BookOpen, Check, X, Sun, CloudSun, Sunset, Moon, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTableLock } from '@/components/ui/table-lock'
import { useQuranLogRange, useUpsertQuranLog, useDeleteQuranLog } from '@/hooks/useQuranLogs'
import { useRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'
import dynamic from 'next/dynamic'
import { AnalyticsSkeleton } from '@/components/ui/analytics-skeleton'
const QuranAnalytics = dynamic(() => import('@/components/quran/QuranAnalytics').then(m => m.QuranAnalytics), { ssr: false, loading: () => <AnalyticsSkeleton /> })

// ─── Constants ────────────────────────────────────

type WaktuBacaKey = 'setelah_subuh' | 'setelah_dzuhur' | 'setelah_ashar' | 'setelah_maghrib' | 'setelah_isya'

const WAKTU_BACA: { key: WaktuBacaKey; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: 'setelah_subuh', label: 'Setelah Subuh', icon: Sun, color: 'text-amber-500' },
  { key: 'setelah_dzuhur', label: 'Setelah Dzuhur', icon: Sun, color: 'text-yellow-500' },
  { key: 'setelah_ashar', label: 'Setelah Ashar', icon: CloudSun, color: 'text-sky-500' },
  { key: 'setelah_maghrib', label: 'Setelah Maghrib', icon: Sunset, color: 'text-rose-500' },
  { key: 'setelah_isya', label: 'Setelah Isya', icon: Moon, color: 'text-indigo-500' },
]

// Alasan tidak membaca (untuk tampilan cell)
const REASON_LABELS: Record<string, string> = {
  malas: 'Malas',
  lupa: 'Lupa',
  sibuk: 'Sibuk',
  sakit: 'Sakit',
  perjalanan: 'Perjalanan',
  tak_ada_tempat: 'Tidak Ada Tempat',
  bersama_teman: 'Bersama Teman',
  lainnya: 'Lainnya',
}

const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'malas', label: 'Malas' },
  { value: 'lupa', label: 'Lupa' },
  { value: 'sibuk', label: 'Sibuk' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'perjalanan', label: 'Perjalanan' },
  { value: 'tak_ada_tempat', label: 'Tidak Ada Tempat' },
  { value: 'bersama_teman', label: 'Bersama Teman' },
  { value: 'lainnya', label: 'Lainnya' },
]

const RATING_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 1, label: 'Kurang', desc: 'Sekadar baca tanpa pemahaman' },
  { value: 2, label: 'Cukup', desc: 'Baca tapi kurang fokus' },
  { value: 3, label: 'Baik', desc: 'Cukup khusyuk' },
  { value: 4, label: 'Sangat Baik', desc: 'Khusyuk dan tuma\'ninah' },
  { value: 5, label: 'Sempurna', desc: 'Hadir hati sepenuhnya' },
]

const RATING_LABELS: Record<number, string> = {
  1: 'Kurang', 2: 'Cukup', 3: 'Baik', 4: 'Sangat Baik', 5: 'Sempurna',
}

const RATING_COLORS: Record<number, string> = {
  1: 'bg-rose-100 text-rose-700 border-rose-200',
  2: 'bg-orange-100 text-orange-700 border-orange-200',
  3: 'bg-amber-100 text-amber-700 border-amber-200',
  4: 'bg-lime-100 text-lime-700 border-lime-200',
  5: 'bg-green-100 text-green-700 border-green-200',
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

type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'yearly'
const PERIOD_OPTIONS: { value: PeriodMode; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
]

interface QuranLogEntry {
  id: string
  user_id: string
  tanggal: string
  waktu_baca: WaktuBacaKey
  surat: string | null
  juz: number | null
  halaman_mulai: number | null
  halaman_selesai: number | null
  jumlah_halaman: number | null
  catatan: string | null
  kualitas: number | null
  created_at: string
  updated_at: string
}

type DropdownState = { tanggal: string; waktuKey: WaktuBacaKey } | null

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ─── Helper: status cell dari entry ───────────────

function getCellStatus(entry: QuranLogEntry | undefined): { status: 'done' | 'reason' | 'empty'; reason: string | null } {
  if (!entry) return { status: 'empty', reason: null }
  const note = entry.catatan || ''
  if (note.startsWith('Tidak membaca:')) {
    return { status: 'reason', reason: note.replace('Tidak membaca: ', '') }
  }
  return { status: 'done', reason: null }
}

// ─── Dropdown Menu (gaya sholat) ──────────────────

function QuranDropdown({
  tanggal,
  waktuKey,
  logMap,
  onSelect,
  onRate,
  onClear,
  onClose,
}: {
  tanggal: string
  waktuKey: WaktuBacaKey
  logMap: Record<string, Record<string, QuranLogEntry>>
  onSelect: (option: { value: string; label: string; isDone: boolean }) => void
  onRate: (quality: number) => void
  onClear: () => void
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight?: number } | null>(null)
  const [showReasons, setShowReasons] = useState(false)

  useEffect(() => {
    const cell = document.querySelector(`[data-quran-cell="${tanggal}-${waktuKey}"]`) as HTMLElement
    if (!cell) return
    const rect = cell.getBoundingClientRect()
    const menuWidth = 240
    const menuMaxHeight = 460
    let top = rect.bottom + 4
    let left = rect.left
    if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 8
    if (left < 8) left = 8
    const availableBelow = window.innerHeight - top - 8
    const maxHeight = Math.max(160, Math.min(menuMaxHeight, availableBelow))
    setPosition({ top, left, maxHeight })
  }, [tanggal, waktuKey])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const { currentValue, currentQuality } = (() => {
    const entry = logMap[tanggal]?.[waktuKey]
    if (!entry) return { currentValue: null as string | null, currentQuality: null as number | null }
    const { status, reason } = getCellStatus(entry)
    if (status === 'done') return { currentValue: 'sudah', currentQuality: (entry as any).kualitas ?? null }
    if (status === 'reason' && reason) {
      const found = Object.entries(REASON_LABELS).find(([, label]) => label === reason)
      return { currentValue: found ? found[0] : 'lainnya', currentQuality: null }
    }
    return { currentValue: null, currentQuality: null }
  })()

  if (!position) return null

  const isDone = currentValue === 'sudah'
  const isTidak = showReasons && !isDone

  return (
    <div
      ref={menuRef}
      data-quran-dropdown
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[240px] max-h-[460px] overflow-y-auto"
      style={{ top: position.top, left: position.left, maxHeight: position.maxHeight }}
    >
      {/* Step 1: Pilih status */}
      <button
        onClick={() => { setShowReasons(false); onSelect({ value: 'sudah', label: 'Sudah Baca', isDone: true }) }}
        className={cn(
          'w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors',
          'hover:bg-green-50 text-slate-700',
          isDone && 'bg-green-50 font-medium text-green-700'
        )}
      >
        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
        Sudah Baca
      </button>
      <button
        onClick={() => setShowReasons(true)}
        className={cn(
          'w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors',
          'hover:bg-green-50 text-slate-700',
          isTidak && 'bg-green-50 font-medium text-green-700'
        )}
      >
        {isTidak ? <X className="h-3.5 w-3.5 text-red-500 shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
        Tidak Baca
      </button>

      {/* Step 2a: Rating kualitas baca */}
      {isDone && (
        <>
          <div className="border-t border-slate-100 my-1" />
          <div className="px-3 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Kualitas Baca</p>
            <div className="space-y-0.5">
              {RATING_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => onRate(r.value)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors',
                    'hover:bg-green-50',
                    currentQuality === r.value ? 'bg-green-50 ring-1 ring-green-200' : ''
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
                  {currentQuality === r.value && <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Step 2b: Alasan tidak baca */}
      {isTidak && (
        <>
          <div className="border-t border-slate-100 my-1" />
          <div className="px-3 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Alasan</p>
            <div className="space-y-0.5">
              {REASON_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => onSelect({ ...r, isDone: false })}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors',
                    'hover:bg-green-50',
                    currentValue === r.value ? 'bg-green-50 ring-1 ring-green-200 font-medium text-green-700' : 'text-slate-700'
                  )}
                >
                  {r.label}
                  {currentValue === r.value && <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="border-t border-slate-100 my-1" />

      {/* Kosongkan status */}
      <button
        onClick={onClear}
        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-slate-50 text-slate-500"
      >
        <span className="w-3.5 h-3.5 shrink-0" />
        Kosongkan Status
      </button>
    </div>
  )
}

// ─── Main Component ────────────────────────────────

export default function QuranPage() {
  // Revisi mobile (batch 8): lock/unlock tabel — khusus tampilan mobile
  const { effectiveLocked, lockControl } = useTableLock()
  const queryClient = useQueryClient()
  // ── Rev 10: periode & anchor date dari HeaderControls (toolbar di header) ──
  const { ibadahPeriod: period, ibadahDate: anchorDate } = useHeaderControls()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [dropdown, setDropdown] = useState<DropdownState>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)

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

  const { data: quranLogs = [], isLoading, error } = useQuranLogRange(startDate, endDate)
  const upsertQuranLog = useUpsertQuranLog()
  const deleteQuranLog = useDeleteQuranLog()

  useRealtime({
    table: 'quran',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['quran', 'range', startDate, endDate]],
  })

  // Map: tanggal -> waktu_baca -> entry
  const logMap = useMemo(() => {
    const map: Record<string, Record<string, QuranLogEntry>> = {}
    for (const log of quranLogs as QuranLogEntry[]) {
      if (!map[log.tanggal]) map[log.tanggal] = {}
      map[log.tanggal][log.waktu_baca] = log
    }
    return map
  }, [quranLogs])

  // Rev 8: urutan tanggal dari atas ke bawah — terbaru paling bawah (ascending)
  const dates = useMemo(() => {
    if (rangeEnd < rangeStart) return []
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(d => format(d, 'yyyy-MM-dd'))
  }, [rangeStart, rangeEnd])

  const totalHalaman = useMemo(
    () => (quranLogs as QuranLogEntry[]).reduce((sum, l) => sum + (l.jumlah_halaman || 0), 0),
    [quranLogs]
  )

  // Tutup dropdown saat klik di luar tabel & di luar menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      const inTable = tableContainerRef.current?.contains(target)
      const inMenu = !!target.closest?.('[data-quran-dropdown]')
      if (!inTable && !inMenu) setDropdown(null)
    }
    if (dropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdown])

  const handleCellClick = (e: React.MouseEvent, tanggal: string, waktuKey: WaktuBacaKey) => {
    e.stopPropagation()
    if (dropdown?.tanggal === tanggal && dropdown?.waktuKey === waktuKey) {
      setDropdown(null)
      return
    }
    setDropdown({ tanggal, waktuKey })
  }

  // Optimistic update supaya pilihan langsung tercatat di UI
  const optimisticallySet = useCallback(
    (tanggal: string, waktuKey: WaktuBacaKey, updater: (entry: QuranLogEntry | undefined) => QuranLogEntry | null) => {
      queryClient.setQueryData(['quran', 'range', startDate, endDate], (old: QuranLogEntry[] | undefined) => {
        if (!old) return old
        const existing = old.find(l => l.tanggal === tanggal && l.waktu_baca === waktuKey)
        const next = updater(existing)
        if (next === null) return old.filter(l => !(l.tanggal === tanggal && l.waktu_baca === waktuKey))
        if (existing) return old.map(l => (l.tanggal === tanggal && l.waktu_baca === waktuKey ? next : l))
        return [...old, next]
      })
    },
    [queryClient, startDate, endDate]
  )

  const handleSelectStatus = async (option: { value: string; label: string; isDone: boolean }) => {
    if (!dropdown) return
    const { tanggal, waktuKey } = dropdown

    if (option.isDone) {
      // Sudah baca — pertahankan detail yang sudah ada bila ada
      const existing = logMap[tanggal]?.[waktuKey]
      const keepNote = existing?.catatan && !existing.catatan.startsWith('Tidak membaca') ? existing.catatan : 'Sudah baca'
      optimisticallySet(tanggal, waktuKey, (entry) => ({
        ...(entry || {
          id: 'temp-' + tanggal + '-' + waktuKey,
          user_id: '',
          tanggal,
          waktu_baca: waktuKey,
          surat: null, juz: null, halaman_mulai: null, halaman_selesai: null,
          jumlah_halaman: null, catatan: null, created_at: '', updated_at: '',
        }),
        catatan: keepNote,
      } as QuranLogEntry))
      try {
        await upsertQuranLog.mutateAsync({
          tanggal,
          waktu_baca: waktuKey,
          surat: existing?.surat || undefined,
          juz: existing?.juz || undefined,
          halaman_mulai: existing?.halaman_mulai || undefined,
          halaman_selesai: existing?.halaman_selesai || undefined,
          catatan: keepNote,
        })
      } catch {
        queryClient.invalidateQueries({ queryKey: ['quran'] })
      }
      // Jangan tutup dropdown — biarkan user pilih rating
      return
    }

    setDropdown(null)
    // Alasan tidak membaca — pertahankan data yang sudah ada
    const existing = logMap[tanggal]?.[waktuKey]
    optimisticallySet(tanggal, waktuKey, (entry) => ({
      ...(entry || {
        id: 'temp-' + tanggal + '-' + waktuKey,
        user_id: '',
        tanggal,
        waktu_baca: waktuKey,
        surat: null, juz: null, halaman_mulai: null, halaman_selesai: null,
        jumlah_halaman: null, catatan: null, created_at: '', updated_at: '',
      }),
      surat: existing?.surat || null,
      juz: existing?.juz || null,
      halaman_mulai: existing?.halaman_mulai || null,
      halaman_selesai: existing?.halaman_selesai || null,
      jumlah_halaman: existing?.jumlah_halaman || null,
      kualitas: existing?.kualitas || null,
      catatan: `Tidak membaca: ${option.label}`,
    } as QuranLogEntry))
    try {
      await upsertQuranLog.mutateAsync({
        tanggal,
        waktu_baca: waktuKey,
        surat: existing?.surat || undefined,
        juz: existing?.juz || undefined,
        halaman_mulai: existing?.halaman_mulai || undefined,
        halaman_selesai: existing?.halaman_selesai || undefined,
        kualitas: (existing as any)?.kualitas || undefined,
        catatan: `Tidak membaca: ${option.label}`,
      })
    } catch {
      queryClient.invalidateQueries({ queryKey: ['quran'] })
    }
  }

  const handleRateQuality = async (quality: number) => {
    if (!dropdown) return
    const { tanggal, waktuKey } = dropdown
    const existing = logMap[tanggal]?.[waktuKey]
    optimisticallySet(tanggal, waktuKey, (entry) => ({
      ...(entry || {
        id: 'temp-' + tanggal + '-' + waktuKey,
        user_id: '',
        tanggal,
        waktu_baca: waktuKey,
        surat: null, juz: null, halaman_mulai: null, halaman_selesai: null,
        jumlah_halaman: null, catatan: null, created_at: '', updated_at: '',
      }),
      kualitas: quality,
    } as QuranLogEntry))
    try {
      await upsertQuranLog.mutateAsync({
        tanggal,
        waktu_baca: waktuKey,
        kualitas: quality,
        catatan: existing?.catatan || 'Sudah baca',
      })
    } catch {
      queryClient.invalidateQueries({ queryKey: ['quran'] })
    }
  }

  const handleClearStatus = async () => {
    if (!dropdown) return
    const { tanggal, waktuKey } = dropdown
    const existing = logMap[tanggal]?.[waktuKey]
    setDropdown(null)
    optimisticallySet(tanggal, waktuKey, () => null)
    if (existing?.id && !existing.id.startsWith('temp-')) {
      try {
        await deleteQuranLog.mutateAsync(existing.id)
      } catch {
        queryClient.invalidateQueries({ queryKey: ['quran'] })
      }
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Table — gaya seperti tab sholat */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}>
        <div ref={tableContainerRef}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className={cn('border-b', TABLE_BORDER)}>
                <th className={cn('dt-col-stick sticky left-0 z-30 bg-white px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[100px]', TABLE_BORDER)}>
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-green-500" />
                    Tanggal
                  </div>
                </th>
                <th className={cn('px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[90px] dt-col-stick sm:sticky sm:left-[100px] sm:z-30 sm:bg-white', TABLE_BORDER)}>
                  <div className="flex items-center justify-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-green-500" />
                    Hari
                  </div>
                </th>
                {WAKTU_BACA.map(col => (
                  <th key={col.key} className={cn('px-3 py-2 text-center font-semibold text-slate-700 border-r last:border-r-0 min-w-[110px]', TABLE_BORDER)}>
                    <div className="flex items-center justify-center gap-1">
                      <col.icon className="h-3.5 w-3.5 text-green-500" />
                      {col.label}
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
                      className={cn('border-b transition-colors', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30', 'hover:bg-green-50/40')}
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
                      {WAKTU_BACA.map(col => {
                        const entry = logMap[dateStr]?.[col.key]
                        const { status, reason } = getCellStatus(entry)
                        const isDropdownOpen = dropdown?.tanggal === dateStr && dropdown?.waktuKey === col.key
                        return (
                          <td
                            key={col.key}
                            data-quran-cell={`${dateStr}-${col.key}`}
                            className={cn(
                              'px-3 py-2 text-center border-r last:border-r-0 cursor-pointer transition-colors',
                              TABLE_BORDER,
                              'hover:bg-green-50/60',
                              isDropdownOpen && 'bg-green-50'
                            )}
                            onClick={(e) => handleCellClick(e, dateStr, col.key)}
                          >
                            <div className="flex flex-col items-center justify-center gap-1 min-h-[32px]">
                              {status === 'done' && entry && (
                                <>
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 border border-green-200">
                                    <Check className="h-3.5 w-3.5" />
                                  </span>
                                  {(entry as any).kualitas && (entry as any).kualitas >= 1 && (entry as any).kualitas <= 5 && (
                                    <span className={cn(
                                      'inline-flex items-center gap-0.5 px-1.5 py-px rounded-full border text-[10px] font-semibold leading-tight',
                                      RATING_COLORS[(entry as any).kualitas] || 'bg-slate-100 text-slate-600 border-slate-200'
                                    )} title={RATING_LABELS[(entry as any).kualitas]}>
                                      <Star className="h-2.5 w-2.5 fill-current" />
                                      {(entry as any).kualitas}
                                    </span>
                                  )}
                                </>
                              )}
                              {status === 'reason' && reason && (
                                <>
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 border border-rose-200">
                                    <X className="h-3.5 w-3.5" />
                                  </span>
                                  <span className="inline-flex items-center justify-center px-1.5 py-px rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-medium whitespace-nowrap">
                                    {reason}
                                  </span>
                                </>
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
      </div>

      {/* Revisi 5: Ringkasan — tingkat kesulitan + alasan terbanyak tidak baca */}
      <QuranAnalytics logMap={logMap} columns={WAKTU_BACA} />

      {/* Dropdown menu gaya sholat */}
      {dropdown && (
        <QuranDropdown
          tanggal={dropdown.tanggal}
          waktuKey={dropdown.waktuKey}
          logMap={logMap}
          onSelect={handleSelectStatus}
          onRate={handleRateQuality}
          onClear={handleClearStatus}
          onClose={() => setDropdown(null)}
        />
      )}

    </div>
  )
}
