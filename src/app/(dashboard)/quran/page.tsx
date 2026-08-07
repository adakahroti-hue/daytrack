"use client"

import { useState, useMemo } from 'react'
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
  addYears,
  subYears,
} from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, BookOpen, Check, Sun, CloudSun, Sunset, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useQuranLogRange, useUpsertQuranLog, useDeleteQuranLog } from '@/hooks/useQuranLogs'
import { useRealtime } from '@/hooks/useRealtime'

// ─── Constants ────────────────────────────────────

type WaktuBacaKey = 'setelah_subuh' | 'setelah_dzuhur' | 'setelah_ashar' | 'setelah_maghrib' | 'setelah_isya'

const WAKTU_BACA: { key: WaktuBacaKey; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: 'setelah_subuh', label: 'Subuh', icon: Sun, color: 'text-amber-500' },
  { key: 'setelah_dzuhur', label: 'Dzuhur', icon: Sun, color: 'text-yellow-500' },
  { key: 'setelah_ashar', label: 'Ashar', icon: CloudSun, color: 'text-sky-500' },
  { key: 'setelah_maghrib', label: 'Maghrib', icon: Sunset, color: 'text-rose-500' },
  { key: 'setelah_isya', label: 'Isya', icon: Moon, color: 'text-indigo-500' },
]

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

type PeriodMode = 'weekly' | 'monthly' | 'yearly'
const PERIOD_OPTIONS: { value: PeriodMode; label: string }[] = [
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

// ─── Main Component ────────────────────────────────

export default function QuranPage() {
  const [period, setPeriod] = useState<PeriodMode>('weekly')
  const [anchorDate, setAnchorDate] = useState<Date>(new Date())
  const [editState, setEditState] = useState<EditState>(null)

  const { rangeStart, rangeEnd, periodLabel, isCurrentPeriod } = useMemo(() => {
    const today = new Date()
    let start: Date
    let end: Date
    if (period === 'weekly') {
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
    if (period === 'weekly') {
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

  const dates = useMemo(() => {
    if (rangeEnd < rangeStart) return []
    return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).reverse().map(d => format(d, 'yyyy-MM-dd'))
  }, [rangeStart, rangeEnd])

  // Total halaman dalam rentang (untuk ringkasan di toolbar)
  const totalHalaman = useMemo(
    () => (quranLogs as QuranLogEntry[]).reduce((sum, l) => sum + (l.jumlah_halaman || 0), 0),
    [quranLogs]
  )

  const navigatePeriod = (direction: 'prev' | 'next') => {
    setAnchorDate(prev => {
      if (period === 'weekly') return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
      if (period === 'monthly') return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
      return direction === 'prev' ? subYears(prev, 1) : addYears(prev, 1)
    })
  }
  const goToToday = () => setAnchorDate(new Date())
  const changePeriod = (p: PeriodMode) => { setPeriod(p); setAnchorDate(new Date()) }

  const openEdit = (tanggal: string, waktuBaca: WaktuBacaKey) => {
    const existing = logMap[tanggal]?.[waktuBaca] || null
    setEditState({ open: true, tanggal, waktuBaca, entry: existing })
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
      {/* Toolbar — toggle periode + navigasi rentang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border w-fit">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => changePeriod(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                period === opt.value ? 'bg-[#0F172A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <BookOpen className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-semibold text-green-700">{totalHalaman}</span>
            <span className="text-[10px] text-green-600/70">halaman</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigatePeriod('prev')} aria-label="Periode sebelumnya" className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border min-w-[180px] justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium whitespace-nowrap">{periodLabel}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigatePeriod('next')} aria-label="Periode berikutnya" className="h-9 w-9" disabled={isCurrentPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentPeriod && (
            <Button variant="outline" onClick={goToToday} className="h-9 px-3">Hari Ini</Button>
          )}
        </div>
      </div>

      {/* Table — gaya seperti tab sholat */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('sticky left-0 z-30 bg-white px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Tanggal
                </div>
              </th>
              <th className={cn('sticky left-[100px] z-30 bg-white px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[90px]', TABLE_BORDER)}>
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
          <tbody>
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
                    <td className={cn('sticky left-0 z-10 bg-inherit px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>
                      {dateDisplay}
                    </td>
                    <td className={cn('sticky left-[100px] z-10 bg-inherit px-3 py-2 text-center border-r', TABLE_BORDER)}>
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs border font-medium', DAY_BADGE_COLORS[dayName] || 'bg-slate-100 text-slate-700 border-slate-200')}>
                        {dayName}
                      </span>
                    </td>
                    {WAKTU_BACA.map(col => {
                      const entry = logMap[dateStr]?.[col.key]
                      const hasLog = !!entry
                      return (
                        <td
                          key={col.key}
                          className={cn('px-3 py-2 text-center border-r last:border-r-0 cursor-pointer transition-colors', TABLE_BORDER, 'hover:bg-green-50/60')}
                          onClick={() => openEdit(dateStr, col.key)}
                        >
                          <div className="flex flex-col items-center justify-center gap-1 min-h-[32px]">
                            {hasLog ? (
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
                            ) : (
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

      {/* Edit/Add Dialog */}
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
