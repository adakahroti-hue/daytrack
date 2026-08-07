"use client"

import { useMemo, useState } from 'react'
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
import { Calendar, Lightbulb, Check, X, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSaranPerbaikanRange, useUpsertSaranPerbaikan, useDeleteSaranPerbaikan } from '@/hooks/useSaranPerbaikan'
import { useRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'

// ─── Constants ────────────────────────────────────

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

interface SaranEntry {
  id: string
  user_id: string
  tanggal: string
  hari: string
  saran: string
  keterangan: string | null
  status: 'belum' | 'proses' | 'selesai'
  created_at: string
}

interface EditState {
  tanggal: string
  saran: string
  tujuan: string
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ─── Main Component ────────────────────────────────

// Revisi 8 (batch 5): tab ini berganti nama menjadi "Masukan Daytrack"
export default function SaranPerbaikanPage() {
  // Periode & tanggal dari HeaderControls (toolbar di header)
  const { ibadahPeriod: period, ibadahDate: anchorDate } = useHeaderControls()

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

  const { data: logs = [], isLoading, error } = useSaranPerbaikanRange(startDate, endDate)
  useRealtime({
    table: 'saran_perbaikan',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['saran-perbaikan', 'range', startDate, endDate]],
  })

  const upsertSaranPerbaikan = useUpsertSaranPerbaikan()
  const deleteSaranPerbaikan = useDeleteSaranPerbaikan()

  const [editState, setEditState] = useState<EditState | null>(null)

  // Map tanggal -> entry
  const logMap = useMemo(() => {
    const map: Record<string, SaranEntry> = {}
    for (const l of logs as SaranEntry[]) map[l.tanggal] = l
    return map
  }, [logs])

  // Daftar tanggal dalam rentang (ascending — terbaru paling bawah)
  const dates = useMemo(() => {
    if (rangeEnd < rangeStart) return []
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(d => format(d, 'yyyy-MM-dd'))
  }, [rangeStart, rangeEnd])

  const openEdit = (dateStr: string) => {
    const entry = logMap[dateStr]
    setEditState({ tanggal: dateStr, saran: entry?.saran || '', tujuan: entry?.keterangan || '' })
  }

  const handleSave = async () => {
    if (!editState) return
    const date = new Date(editState.tanggal + 'T00:00:00')
    await upsertSaranPerbaikan.mutateAsync({
      tanggal: editState.tanggal,
      hari: format(date, 'EEEE', { locale: id }),
      saran: editState.saran.trim(),
      keterangan: editState.tujuan.trim() || undefined,
      status: logMap[editState.tanggal]?.status ?? 'belum',
    })
    setEditState(null)
  }

  const handleSetStatus = async (dateStr: string, done: boolean) => {
    const date = new Date(dateStr + 'T00:00:00')
    const entry = logMap[dateStr]
    await upsertSaranPerbaikan.mutateAsync({
      tanggal: dateStr,
      hari: format(date, 'EEEE', { locale: id }),
      saran: entry?.saran || '',
      keterangan: entry?.keterangan || undefined,
      status: done ? 'selesai' : 'belum',
    })
  }

  const handleClear = async (dateStr: string) => {
    const entry = logMap[dateStr]
    if (entry) await deleteSaranPerbaikan.mutateAsync(entry.id)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Tabel gaya Quran: Tanggal | Hari | Saran Perbaikan | Tujuan | Status */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('sticky left-0 z-30 bg-white px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[72px] sm:min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Tanggal
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[64px] sm:min-w-[90px]', TABLE_BORDER)}>
                Hari
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-left font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[220px]', TABLE_BORDER)}>
                <div className="flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Saran Perbaikan
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-left font-semibold text-slate-700 border-r min-w-[140px] sm:min-w-[200px]', TABLE_BORDER)}>
                Tujuan
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[96px] sm:min-w-[110px]', TABLE_BORDER)}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
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
                const isDone = entry?.status === 'selesai'
                const hasEntry = !!entry

                return (
                  <tr
                    key={dateStr}
                    className={cn('border-b transition-colors', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30', 'hover:bg-blue-50/40')}
                  >
                    <td className={cn('sticky left-0 z-10 bg-inherit px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>
                      <span className="sm:hidden">{format(date, 'd MMM', { locale: id })}</span>
                      <span className="hidden sm:inline">{dateDisplay}</span>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r', TABLE_BORDER)}>
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs border font-medium', DAY_BADGE_COLORS[dayName] || 'bg-slate-100 text-slate-700 border-slate-200')}>
                        {dayName}
                      </span>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 border-r', TABLE_BORDER)}>
                      <button type="button" onClick={() => openEdit(dateStr)} className="w-full text-left group">
                        {entry?.saran ? (
                          <span className="text-slate-800 whitespace-normal break-words leading-snug group-hover:text-blue-700">{entry.saran}</span>
                        ) : (
                          <span className="text-slate-400 italic">Tulis masukan untuk Daytrack…</span>
                        )}
                        <Pencil className="inline-block h-3 w-3 ml-1.5 text-slate-300 group-hover:text-blue-500 align-middle" />
                      </button>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 border-r', TABLE_BORDER)}>
                      <button type="button" onClick={() => openEdit(dateStr)} className="w-full text-left">
                        {entry?.keterangan ? (
                          <span className="text-slate-700 whitespace-normal break-words leading-snug">{entry.keterangan}</span>
                        ) : (
                          <span className="text-slate-400 italic">Tujuan…</span>
                        )}
                      </button>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center', TABLE_BORDER)}>
                      <div className="flex items-center justify-center min-h-[36px]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                'inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer whitespace-normal leading-tight text-center',
                                isDone
                                  ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                  : hasEntry
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                    : 'text-slate-400 border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-600'
                              )}
                            >
                              {isDone && <Check className="h-3.5 w-3.5 shrink-0" />}
                              {isDone ? 'Sudah' : 'Belum'}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-36">
                            <DropdownMenuItem onClick={() => handleSetStatus(dateStr, false)} className="flex items-center gap-2">
                              <X className="h-4 w-4 text-amber-500" /> Belum
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSetStatus(dateStr, true)} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" /> Sudah
                            </DropdownMenuItem>
                            {entry && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleClear(dateStr)} className="flex items-center gap-2 text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4" /> Hapus
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

      {/* Dialog edit masukan */}
      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Masukan Daytrack — {editState ? format(new Date(editState.tanggal + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id }) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="saran-teks">Saran Perbaikan</Label>
              <Textarea
                id="saran-teks"
                placeholder="Tulis masukan atau saran perbaikan…"
                value={editState?.saran ?? ''}
                onChange={(e) => setEditState(prev => prev ? { ...prev, saran: e.target.value } : prev)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="saran-tujuan">Tujuan</Label>
              <Textarea
                id="saran-tujuan"
                placeholder="Apa tujuan dari masukan ini? (opsional)"
                value={editState?.tujuan ?? ''}
                onChange={(e) => setEditState(prev => prev ? { ...prev, tujuan: e.target.value } : prev)}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditState(null)}>Batal</Button>
              <Button onClick={handleSave}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
