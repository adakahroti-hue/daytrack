"use client"

import { useMemo, useState } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns'
import { id } from 'date-fns/locale'
import { Calendar, Shield, Trash2, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useTableLock } from '@/components/ui/table-lock'
import { useMasalahLogRange, useUpsertMasalahLog, useUpdateMasalahLog, useDeleteMasalahLog } from '@/hooks/useMasalahLogs'
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

interface MasalahLogEntry {
  id: string
  user_id: string
  tanggal: string
  masalah: string
  kategori: string | null
  solusi: string | null
  status: 'belum' | 'proses' | 'selesai'
  prioritas: string | null
  catatan: string | null
  created_at: string
  updated_at: string
}

interface EditState {
  id: string | null // null = tambah baru
  tanggal: string
  masalah: string
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ─── Main Component ────────────────────────────────

export default function MasalahPage() {
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

  const { data: logs = [], isLoading, error } = useMasalahLogRange(startDate, endDate)
  useRealtime({
    table: 'masalah_logs',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['masalah_logs', 'range', startDate, endDate]],
  })

  const upsertMasalahLog = useUpsertMasalahLog()
  const updateMasalahLog = useUpdateMasalahLog()
  const deleteMasalahLog = useDeleteMasalahLog()

  const [editState, setEditState] = useState<EditState | null>(null)

  // Urutkan entri: terbaru di atas
  const entries = useMemo(() => {
    return [...(logs as MasalahLogEntry[])].sort((a, b) => b.tanggal.localeCompare(a.tanggal))
  }, [logs])

  const openAdd = () => setEditState({ id: null, tanggal: todayStr, masalah: '' })
  const openEdit = (e: MasalahLogEntry) => setEditState({ id: e.id, tanggal: e.tanggal, masalah: e.masalah })

  const handleSave = async () => {
    if (!editState) return
    if (!editState.masalah.trim()) return
    if (editState.id) {
      await updateMasalahLog.mutateAsync({
        id: editState.id,
        data: { tanggal: editState.tanggal, masalah: editState.masalah.trim() },
      })
    } else {
      await upsertMasalahLog.mutateAsync({
        tanggal: editState.tanggal,
        masalah: editState.masalah.trim(),
        status: 'belum',
        prioritas: 'sedang',
      })
    }
    setEditState(null)
  }

  const handleDelete = async () => {
    if (!editState?.id) return
    await deleteMasalahLog.mutateAsync(editState.id)
    setEditState(null)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">

      {/* Tabel gaya Quran: Tanggal | Hari | Refleksi | Status | Solusi */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('dt-col-stick sticky left-0 z-30 bg-white px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[72px] sm:min-w-[100px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  Tanggal
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[64px] sm:min-w-[90px]', TABLE_BORDER)}>
                Hari
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-left font-semibold text-slate-700 min-w-[160px] sm:min-w-[220px]', TABLE_BORDER)}>
                <div className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-slate-500" />
                  Refleksi
                </div>
              </th>
            </tr>
          </thead>
          <tbody className={cn(effectiveLocked && 'pointer-events-none select-none')}>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-slate-400 text-sm">Belum ada refleksi tercatat pada periode ini.</td>
              </tr>
            ) : (
              entries.map((entry, rowIdx) => {
                const date = new Date(entry.tanggal + 'T00:00:00')
                const dayName = format(date, 'EEEE', { locale: id })
                const dateDisplay = format(date, 'd MMMM', { locale: id })

                return (
                  <tr
                    key={entry.id}
                    className={cn('border-b transition-colors', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30', 'hover:bg-blue-50/40')}
                  >
                    <td className={cn('dt-col-stick sticky left-0 z-10 bg-inherit px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>
                      <span className="sm:hidden">{format(date, 'd MMM', { locale: id })}</span>
                      <span className="hidden sm:inline">{dateDisplay}</span>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r', TABLE_BORDER)}>
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs border font-medium', DAY_BADGE_COLORS[dayName] || 'bg-slate-100 text-slate-700 border-slate-200')}>
                        {dayName}
                      </span>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 border-r', TABLE_BORDER)}>
                      <button type="button" onClick={() => openEdit(entry)} className="w-full text-left group">
                        <span className="text-slate-800 whitespace-normal break-words leading-snug group-hover:text-blue-700">{entry.masalah}</span>
                        <Pencil className="inline-block h-3 w-3 ml-1.5 text-slate-300 group-hover:text-blue-500 align-middle" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {lockControl}

      {/* Revisi 8: tombol tambah floating seperti tab Semua */}
      <Button
        onClick={openAdd}
        size="icon"
        aria-label="Tambah Refleksi"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialog tambah/edit masalah */}
      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editState?.id ? 'Edit Refleksi' : 'Tambah Refleksi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="masalah-tanggal">Tanggal</Label>
              <Input
                id="masalah-tanggal"
                type="date"
                value={editState?.tanggal ?? todayStr}
                onChange={(e) => setEditState(prev => prev ? { ...prev, tanggal: e.target.value } : prev)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="masalah-teks">Refleksi</Label>
              <Textarea
                id="masalah-teks"
                placeholder="Tulis masalah yang sedang dihadapi…"
                value={editState?.masalah ?? ''}
                onChange={(e) => setEditState(prev => prev ? { ...prev, masalah: e.target.value } : prev)}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div>
                {editState?.id && (
                  <Button variant="ghost" onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 mr-1.5" /> Hapus
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditState(null)}>Batal</Button>
                <Button onClick={handleSave} disabled={!editState?.masalah.trim()}>Simpan</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
