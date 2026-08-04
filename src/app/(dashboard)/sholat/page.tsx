"use client"

import { useState, useMemo, useRef, useEffect, useCallback, forwardRef } from 'react'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { id } from 'date-fns/locale'
import { Check, Sun, CloudSun, Sunset, Moon, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSholatRange, useUpdateSholatCell, useClearSholatCell } from '@/hooks/useSholat'
import { useQueryClient } from '@tanstack/react-query'
import { useSholatRealtime } from '@/hooks/useRealtime'

// ─── Constants ────────────────────────────────────

type SholatKey = 'subuh' | 'dhuha' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya'

const SHOLAT_COLUMNS: { key: SholatKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'subuh', label: 'Subuh', icon: Sun },
  { key: 'dhuha', label: 'Dhuha', icon: Sun },
  { key: 'dzuhur', label: 'Dzuhur', icon: Sun },
  { key: 'ashar', label: 'Ashar', icon: CloudSun },
  { key: 'maghrib', label: 'Maghrib', icon: Sunset },
  { key: 'isya', label: 'Isya', icon: Moon },
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
  malas: 'Malas',
  lupa: 'Lupa',
  sibuk: 'Sibuk',
  sakit: 'Sakit',
  perjalanan: 'Perjalanan',
  tak_ada_tempat: 'Tidak Ada Tempat',
  bersama_teman: 'Bersama Teman',
  lainnya: 'Lainnya',
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

// ─── Types ─────────────────────────────────────────

type SholatRow = {
  id: string
  tanggal: string
  hari: string
  subuh: boolean
  dhuha: boolean
  dzuhur: boolean
  ashar: boolean
  maghrib: boolean
  isya: boolean
  alasan_subuh: string | null
  alasan_dhuha: string | null
  alasan_dzuhur: string | null
  alasan_ashar: string | null
  alasan_maghrib: string | null
  alasan_isya: string | null
}

type CellStatus = 'done' | 'reason' | 'empty'

type DropdownState = {
  tanggal: string
  sholatKey: SholatKey
  rowIndex: number
  colIndex: number
} | null

// ─── Helper: get cell status from row data ────────

function getCellStatus(row: SholatRow | undefined, key: SholatKey): { status: CellStatus; reason: string | null } {
  if (!row) return { status: 'empty', reason: null }
  const isDone = row[key] as boolean
  const reason = row[`alasan_${key}` as keyof SholatRow] as string | null
  if (isDone) return { status: 'done', reason: null }
  if (reason) return { status: 'reason', reason }
  return { status: 'empty', reason: null }
}

// ─── Cell Badge Component ─────────────────────────

function CellBadge({ status, reason }: { status: CellStatus; reason: string | null }) {
  if (status === 'done') {
    return (
      <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 text-xs font-medium">
        <Check className="h-3 w-3" />
      </span>
    )
  }
  if (status === 'reason' && reason) {
    const label = REASON_LABELS[reason] || reason
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium whitespace-nowrap">
        {label}
      </span>
    )
  }
  return null
}

// ─── Dropdown Menu Component ──────────────────────

const DropdownMenuContent = forwardRef<HTMLDivElement, {
  tanggal: string
  sholatKey: SholatKey
  sholatMap: Record<string, SholatRow>
  onSelect: (option: StatusOption) => void
  onClear: () => void
  onClose: () => void
}>(({ tanggal, sholatKey, sholatMap, onSelect, onClear, onClose }, ref) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    // Find the clicked cell element to position dropdown near it
    const cell = document.querySelector(`[data-dropdown-cell="${tanggal}-${sholatKey}"]`) as HTMLElement
    if (!cell) return

    const rect = cell.getBoundingClientRect()
    const menuWidth = 200
    const menuHeight = 360

    let top = rect.bottom + 4
    let left = rect.left

    // Flip up if not enough space below
    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - 4
    }

    // Shift left if not enough space right
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 8
    }

    // Ensure minimum left
    if (left < 8) left = 8

    setPosition({ top, left })
  }, [tanggal, sholatKey])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const currentValue = (() => {
    const row = sholatMap[tanggal]
    if (!row) return null
    const isDone = row[sholatKey] as boolean
    const reason = row[`alasan_${sholatKey}` as keyof SholatRow] as string | null
    if (isDone) return 'sudah'
    if (reason) return reason
    return null
  })()

  if (!position) return null

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[200px] max-h-[360px] overflow-y-auto"
      style={{ top: position.top, left: position.left }}
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

const DAYS_TO_SHOW_INITIAL = 14

export default function SholatPage() {
  const queryClient = useQueryClient()
  const [daysToShow, setDaysToShow] = useState(DAYS_TO_SHOW_INITIAL)
  const [dropdown, setDropdown] = useState<DropdownState>(null)
  const [isMobile, setIsMobile] = useState(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Date range: from N days ago to today
  const endDate = format(new Date(), 'yyyy-MM-dd')
  const startDate = format(subDays(new Date(), daysToShow - 1), 'yyyy-MM-dd')

  const { data: sholatRows = [], isLoading, error } = useSholatRange(startDate, endDate)
  useSholatRealtime()

  const updateCell = useUpdateSholatCell()
  const clearCell = useClearSholatCell()

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
    const allDates = eachDayOfInterval({
      start: subDays(new Date(), daysToShow - 1),
      end: new Date(),
    })
    return allDates.reverse().map(d => format(d, 'yyyy-MM-dd'))
  }, [daysToShow])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tableContainerRef.current && !tableContainerRef.current.contains(e.target as Node)) {
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
      queryClient.setQueryData(['sholat', 'range', startDate, endDate], (old: SholatRow[] | undefined) => {
        if (!old) return old
        const existing = old.find(r => r.tanggal === tanggal)
        if (existing) {
          return old.map(r => {
            if (r.tanggal !== tanggal) return r
            return {
              ...r,
              [key]: status === 'done',
              [`alasan_${key}`]: status === 'reason' ? reason : null,
            } as SholatRow
          })
        }
        // Row doesn't exist yet — add a new one
        const newRow: SholatRow = {
          id: 'temp-' + tanggal,
          tanggal,
          hari: new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'long' }),
          subuh: false, dhuha: false, dzuhur: false,
          ashar: false, maghrib: false, isya: false,
          alasan_subuh: null, alasan_dhuha: null, alasan_dzuhur: null,
          alasan_ashar: null, alasan_maghrib: null, alasan_isya: null,
          [key]: status === 'done',
          [`alasan_${key}`]: status === 'reason' ? reason : null,
        } as SholatRow
        return [...old, newRow]
      })
    },
    [queryClient, startDate, endDate]
  )

  const handleSelectStatus = async (option: StatusOption) => {
    if (!dropdown) return
    const { tanggal, sholatKey } = dropdown
    setDropdown(null)

    if (option.value === 'sudah') {
      optimisticallyUpdateCell(tanggal, sholatKey, 'done', null)
      try {
        await updateCell.mutateAsync({ tanggal, sholatTime: sholatKey, value: true })
      } catch {
        queryClient.invalidateQueries({ queryKey: ['sholat'] })
      }
    } else {
      const reason = option.value
      optimisticallyUpdateCell(tanggal, sholatKey, 'reason', reason)
      try {
        await updateCell.mutateAsync({ tanggal, sholatTime: sholatKey, value: false, alasan: reason })
      } catch {
        queryClient.invalidateQueries({ queryKey: ['sholat'] })
      }
    }
  }

  const handleClearStatus = async () => {
    if (!dropdown) return
    const { tanggal, sholatKey } = dropdown
    setDropdown(null)

    optimisticallyUpdateCell(tanggal, sholatKey, 'empty', null)
    try {
      await clearCell.mutateAsync({ tanggal, sholatTime: sholatKey })
    } catch {
      queryClient.invalidateQueries({ queryKey: ['sholat'] })
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

  const loadMore = () => setDaysToShow(prev => prev + 30)

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-4">Sholat</h1>

      {/* Table */}
      <div
        ref={tableContainerRef}
        className="relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-160px)] rounded-lg border border-slate-200 bg-white"
      >
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="border-b border-slate-200">
              {/* Sticky first two columns */}
              <th className="sticky left-0 z-30 bg-white px-3 py-2 text-center font-medium text-slate-600 border-r border-slate-200 min-w-[100px]">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Tanggal
                </div>
              </th>
              <th className="sticky left-[100px] z-30 bg-white px-3 py-2 text-center font-medium text-slate-600 border-r border-slate-200 min-w-[90px]">
                Hari
              </th>
              {/* Prayer columns */}
              {SHOLAT_COLUMNS.map(col => (
                <th key={col.key} className="px-3 py-2 text-center font-medium text-slate-600 border-r border-slate-200 last:border-r-0 min-w-[110px]">
                  <div className="flex items-center justify-center gap-1">
                    <col.icon className="h-3.5 w-3.5 text-slate-400" />
                    {col.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
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
                const date = new Date(dateStr)
                const dayName = format(date, 'EEEE', { locale: id })
                const dateDisplay = format(date, 'dd-MM-yyyy')

                return (
                  <tr
                    key={dateStr}
                    className={cn(
                      'border-b border-slate-100 transition-colors',
                      rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30',
                      'hover:bg-blue-50/40'
                    )}
                  >
                    {/* Tanggal — sticky left */}
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-center text-slate-700 border-r border-slate-200 font-medium tabular-nums">
                      {dateDisplay}
                    </td>
                    {/* Hari — sticky, pastel badge */}
                    <td className="sticky left-[100px] z-10 bg-inherit px-3 py-2 text-center border-r border-slate-200">
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-xs border font-medium',
                        DAY_BADGE_COLORS[dayName] || 'bg-slate-100 text-slate-700 border-slate-200'
                      )}>
                        {dayName}
                      </span>
                    </td>
                    {/* Prayer cells */}
                    {SHOLAT_COLUMNS.map((col, colIdx) => {
                      const { status, reason } = getCellStatus(row, col.key)
                      const isDropdownOpen = dropdown?.tanggal === dateStr && dropdown?.sholatKey === col.key

                      return (
                        <td
                          key={col.key}
                          data-dropdown-cell={`${dateStr}-${col.key}`}
                          className={cn(
                            'px-3 py-2 text-center border-r border-slate-200 last:border-r-0 cursor-pointer transition-colors relative',
                            'hover:bg-blue-50/60',
                            isDropdownOpen && 'bg-blue-50'
                          )}
                          onClick={(e) => handleCellClick(e, dateStr, col.key, rowIdx, colIdx + 2)}
                        >
                          <div className="flex items-center justify-center min-h-[28px]">
                            {status === 'done' && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 border border-green-200">
                                <Check className="h-3.5 w-3.5" />
                              </span>
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

      {/* Load More button */}
      <div className="flex justify-center mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={loadMore}
          className="text-slate-600"
        >
          Tampilkan lebih banyak
        </Button>
      </div>

      {/* Dropdown menu */}
      {dropdown && (
        <DropdownMenuContent
          ref={tableContainerRef}
          tanggal={dropdown.tanggal}
          sholatKey={dropdown.sholatKey}
          sholatMap={sholatMap}
          onSelect={handleSelectStatus}
          onClear={handleClearStatus}
          onClose={() => setDropdown(null)}
        />
      )}
    </div>
  )
}
