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
import { Calendar, BookOpen, Check, Sun, CloudSun, Sunset, Moon, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

// Opsi status seperti tab sholat: centang = sudah baca, sisanya alasan tidak membaca
const STATUS_OPTIONS: { value: string; label: string; isDone: boolean }[] = [
  { value: 'sudah', label: 'Sudah Baca', isDone: true },
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
  malas: 'Malas',
  lupa: 'Lupa',
  sibuk: 'Sibuk',
  sakit: 'Sakit',
  perjalanan: 'Perjalanan',
  tak_ada_tempat: 'Tidak Ada Tempat',
  bersama_teman: 'Bersama Teman',
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
  created_at: string
  updated_at: string
}

type DropdownState = { tanggal: string; waktuKey: WaktuBacaKey } | null

type EditState = {
  open: boolean
  tanggal: string
  waktuBaca: WaktuBacaKey
  entry: QuranLogEntry | null
} | null

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
  onDetail,
  onClear,
  onClose,
}: {
  tanggal: string
  waktuKey: WaktuBacaKey
  logMap: Record<string, Record<string, QuranLogEntry>>
  onSelect: (option: { value: string; label: string; isDone: boolean }) => void
  onDetail: () => void
  onClear: () => void
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const cell = document.querySelector(`[data-quran-cell="${tanggal}-${waktuKey}"]`) as HTMLElement
    if (!cell) return
    const rect = cell.getBoundingClientRect()
    const menuWidth = 240
    const menuHeight = 420
    let top = rect.bottom + 4
    let left = rect.left
    if (top + menuHeight > window.innerHeight) top = rect.top - menuHeight - 4
    if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 8
    if (left < 8) left = 8
    setPosition({ top, left })
  }, [tanggal, waktuKey])

  // Hanya tutup via Escape — klik luar ditangani parent (yang tahu posisi menu)
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const currentValue = (() => {
    const entry = logMap[tanggal]?.[waktuKey]
    if (!entry) return null
    const { status, reason } = getCellStatus(entry)
    if (status === 'done') return 'sudah'
    if (status === 'reason' && reason) {
      const found = Object.entries(REASON_LABELS).find(([, label]) => label === reason)
      return found ? found[0] : 'lainnya'
    }
    return null
  })()

  if (!position) return null

  return (
    <div
      ref={menuRef}
      data-quran-dropdown
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[240px] max-h-[420px] overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {STATUS_OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => onSelect(option)}
          className={cn(
            'w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors',
            'hover:bg-green-50 text-slate-700',
            currentValue === option.value && 'bg-green-50 font-medium text-green-700'
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

      <div className="border-t border-slate-100 my-1" />

      {/* Catat detail surat/halaman */}
      <button
        onClick={onDetail}
        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-slate-50 text-slate-700"
      >
        <Edit2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        Catat detail (surat/halaman)…
      </button>

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
  const [editState, setEditState] = useState<EditState>(null)
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

  const { data: quranLogs = [], isLoading, error, refetch } = useQuranLogRange(startDate, endDate)
  const upsertQuranLog = useUpsertQuranLog()
  const deleteQuranLog = useDeleteQuranLog()

  useRealtime({
    table: 'quran_logs',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['quran_logs', 'range', startDate, endDate]],
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
      queryClient.setQueryData(['quran_logs', 'range', startDate, endDate], (old: QuranLogEntry[] | undefined) => {
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
    setDropdown(null)

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
        queryClient.invalidateQueries({ queryKey: ['quran_logs'] })
      }
    } else {
      // Alasan tidak membaca
      optimisticallySet(tanggal, waktuKey, (entry) => ({
        ...(entry || {
          id: 'temp-' + tanggal + '-' + waktuKey,
          user_id: '',
          tanggal,
          waktu_baca: waktuKey,
          surat: null, juz: null, halaman_mulai: null, halaman_selesai: null,
          jumlah_halaman: null, catatan: null, created_at: '', updated_at: '',
        }),
        surat: null, juz: null, halaman_mulai: null, halaman_selesai: null, jumlah_halaman: null,
        catatan: `Tidak membaca: ${option.label}`,
      } as QuranLogEntry))
      try {
        await upsertQuranLog.mutateAsync({
          tanggal,
          waktu_baca: waktuKey,
          catatan: `Tidak membaca: ${option.label}`,
        })
      } catch {
        queryClient.invalidateQueries({ queryKey: ['quran_logs'] })
      }
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
        queryClient.invalidateQueries({ queryKey: ['quran_logs'] })
      }
    }
  }

  const handleOpenDetail = () => {
    if (!dropdown) return
    const { tanggal, waktuKey } = dropdown
    const existing = logMap[tanggal]?.[waktuKey] || null
    setDropdown(null)
    setEditState({ open: true, tanggal, waktuBaca: waktuKey, entry: existing })
  }

  const handleSubmit = async (form: { surat?: string; juz?: number; halaman_mulai?: number; halaman_selesai?: number; catatan?: string }) => {
    if (!editState) return
    await upsertQuranLog.mutateAsync({
      tanggal: editState.tanggal,
      waktu_baca: editState.waktuBaca,
      surat: form.surat || undefined,
      juz: form.juz || undefined,
      halaman_mulai: form.halaman_mulai || undefined,
      halaman_selesai: form.halaman_selesai || undefined,
      catatan: form.catatan || undefined,
    })
    setEditState(null)
    refetch()
  }

  const handleDelete = async () => {
    if (!editState?.entry?.id) return
    if (confirm('Yakin ingin menghapus catatan ini?')) {
      await deleteQuranLog.mutateAsync(editState.entry.id)
      setEditState(null)
      refetch()
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
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    Tanggal
                  </div>
                </th>
                <th className={cn('px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[90px] dt-col-stick sm:sticky sm:left-[100px] sm:z-30 sm:bg-white', TABLE_BORDER)}>
                  Hari
                </th>
                {WAKTU_BACA.map(col => (
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
                      className={cn('border-b transition-colors', TABLE_BORDER, dateStr === todayStr ? 'row-today-pulse' : (rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'), 'hover:bg-green-50/40')}
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
                                  {entry.jumlah_halaman ? (
                                    <span className="inline-flex items-center px-1.5 py-px rounded-full bg-green-100 text-green-700 border border-green-200 text-[10px] font-semibold leading-tight">
                                      {entry.jumlah_halaman} hlm
                                    </span>
                                  ) : entry.surat ? (
                                    <span className="inline-flex items-center px-1.5 py-px rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px] font-medium leading-tight max-w-[100px] truncate">
                                      {entry.surat}
                                    </span>
                                  ) : null}
                                </>
                              )}
                              {status === 'reason' && reason && (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium whitespace-nowrap">
                                  {reason}
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
      </div>

      {/* Revisi 5: Analytics & Insight — tingkat kesulitan + alasan terbanyak tidak baca */}
      <QuranAnalytics logMap={logMap} columns={WAKTU_BACA} />

      {/* Dropdown menu gaya sholat */}
      {dropdown && (
        <QuranDropdown
          tanggal={dropdown.tanggal}
          waktuKey={dropdown.waktuKey}
          logMap={logMap}
          onSelect={handleSelectStatus}
          onDetail={handleOpenDetail}
          onClear={handleClearStatus}
          onClose={() => setDropdown(null)}
        />
      )}

      {/* Edit/Add Detail Dialog */}
      <Dialog open={!!editState?.open} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editState?.entry ? 'Edit Catatan Quran' : 'Catat Bacaan Quran'}</DialogTitle>
            <DialogDescription>
              {editState && `${format(new Date(editState.tanggal + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id })} • ${WAKTU_BACA.find(w => w.key === editState.waktuBaca)?.label}`}
            </DialogDescription>
          </DialogHeader>
          {editState && (
            <QuranEntryForm
              key={`${editState.tanggal}-${editState.waktuBaca}`}
              entry={editState.entry}
              onSubmit={handleSubmit}
              onDelete={editState.entry ? handleDelete : undefined}
              onCancel={() => setEditState(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Form Component ────────────────────────────────

function QuranEntryForm({
  entry,
  onSubmit,
  onDelete,
  onCancel,
}: {
  entry: QuranLogEntry | null
  onSubmit: (form: { surat?: string; juz?: number; halaman_mulai?: number; halaman_selesai?: number; catatan?: string }) => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const [surat, setSurat] = useState(entry?.surat || '')
  const [juz, setJuz] = useState(entry?.juz?.toString() || '')
  const [halamanMulai, setHalamanMulai] = useState(entry?.halaman_mulai?.toString() || '')
  const [halamanSelesai, setHalamanSelesai] = useState(entry?.halaman_selesai?.toString() || '')
  const [catatan, setCatatan] = useState(entry?.catatan || '')

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label>Surat</Label>
          <Input value={surat} onChange={(e) => setSurat(e.target.value)} placeholder="Contoh: Al-Baqarah" />
        </div>
        <div>
          <Label>Juz</Label>
          <Input type="number" min={1} max={30} value={juz} onChange={(e) => setJuz(e.target.value)} placeholder="1-30" />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label>Halaman Mulai</Label>
          <Input type="number" min={1} max={604} value={halamanMulai} onChange={(e) => setHalamanMulai(e.target.value)} placeholder="1-604" />
        </div>
        <div>
          <Label>Halaman Selesai</Label>
          <Input type="number" min={1} max={604} value={halamanSelesai} onChange={(e) => setHalamanSelesai(e.target.value)} placeholder="1-604" />
        </div>
      </div>
      <div>
        <Label>Catatan (opsional)</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Tulis refleksi, ayat favorit, dll." rows={3} />
      </div>
      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {onDelete && (
            <Button variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/10">Hapus</Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Batal</Button>
          <Button onClick={() => onSubmit({
            surat: surat || undefined,
            juz: juz ? parseInt(juz) : undefined,
            halaman_mulai: halamanMulai ? parseInt(halamanMulai) : undefined,
            halaman_selesai: halamanSelesai ? parseInt(halamanSelesai) : undefined,
            catatan: catatan || undefined,
          })}>Simpan</Button>
        </div>
      </div>
    </div>
  )
}
