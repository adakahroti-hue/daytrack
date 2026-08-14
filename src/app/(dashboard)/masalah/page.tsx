"use client"

import { Fragment, useMemo, useState } from 'react'
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
import { Calendar, CalendarDays, Shield, Trash2, Plus, Pencil, Wrench, CheckCircle2, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
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

const STATUS_LABEL: Record<string, string> = {
  belum: 'Belum',
  sudah: 'Sudah',
}

const STATUS_BADGE: Record<string, string> = {
  belum: 'bg-slate-100 text-slate-600 border-slate-200',
  sudah: 'bg-green-100 text-green-700 border-green-200',
}

const TABLE_BORDER = 'border-slate-900'

interface MasalahLogEntry {
  id: string
  user_id: string
  tanggal: string
  masalah: string
  status: 'belum' | 'sudah'
  created_at: string
  updated_at: string
}

interface EditState {
  id: string | null // null = tambah baru
  tanggal: string
  masalah: string
  status: 'belum' | 'sudah'
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ─── Main Component ────────────────────────────────

export default function MasalahPage() {
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
    table: 'refleksi',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['refleksi', 'range', startDate, endDate]],
  })

  const upsertMasalahLog = useUpsertMasalahLog()
  const updateMasalahLog = useUpdateMasalahLog()
  const deleteMasalahLog = useDeleteMasalahLog()

  const [editState, setEditState] = useState<EditState | null>(null)

  // Urutkan entri: terlama di atas, terbaru di bawah (tanggal baru di bagian bawah)
  const entries = useMemo(() => {
    return [...(logs as MasalahLogEntry[])].sort((a, b) =>
      a.tanggal.localeCompare(b.tanggal) || (a.created_at || '').localeCompare(b.created_at || ''))
  }, [logs])

  const openAdd = () => setEditState({ id: null, tanggal: todayStr, masalah: '', status: 'belum' })
  const openEdit = (e: MasalahLogEntry) => setEditState({ id: e.id, tanggal: e.tanggal, masalah: e.masalah, status: e.status })

  const handleSave = async () => {
    if (!editState) return
    if (!editState.masalah.trim()) return
    if (editState.id) {
      await updateMasalahLog.mutateAsync({
        id: editState.id,
        data: { tanggal: editState.tanggal, masalah: editState.masalah.trim(), status: editState.status },
      })
    } else {
      await upsertMasalahLog.mutateAsync({
        tanggal: editState.tanggal,
        masalah: editState.masalah.trim(),
        status: editState.status,
      })
    }
    setEditState(null)
  }

  const handleDeleteEntry = async (id: string) => {
    await deleteMasalahLog.mutateAsync(id)
  }

  const handleDelete = async () => {
    if (!editState?.id) return
    await deleteMasalahLog.mutateAsync(editState.id)
    setEditState(null)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">

      {/* Tabel gaya Quran: Tanggal | Hari | Refleksi */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className={cn('hidden sm:table-header-group sticky top-0 z-20 bg-white')}>
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[50px] sm:min-w-[70px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-purple-500" />
                  No
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[220px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-purple-500" />
                  Refleksi
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[96px] sm:min-w-[120px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-500" />
                  Status
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[120px] sm:min-w-[160px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Wrench className="h-3.5 w-3.5 text-purple-500" />
                  Aksi
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
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400 text-sm">Belum ada refleksi tercatat pada periode ini.</td>
              </tr>
            ) : (
              entries.map((entry, rowIdx) => {
                const date = new Date(entry.tanggal + 'T00:00:00')
                const dayName = format(date, 'EEEE', { locale: id })
                const dateDisplay = format(date, 'd MMMM', { locale: id })
                return (
                  <Fragment key={entry.id}>
                    {/* ── Mobile: kartu ringkas (sm:hidden) ── */}
                    <tr className={cn('sm:hidden border-b', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                      <td colSpan={4} className={cn('px-3 py-3', TABLE_BORDER)}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-slate-800 whitespace-normal break-words leading-snug flex-1">{entry.masalah}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" aria-label="Edit refleksi" onClick={() => openEdit(entry)}
                              className="h-6 w-6 p-0 bg-slate-600 hover:bg-slate-700 text-white">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" aria-label="Hapus refleksi" onClick={() => handleDeleteEntry(entry.id)}
                              className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* ── Desktop: tabel penuh (hidden sm:table-row) ── */}
                    <tr key={entry.id} className={cn('hidden sm:table-row border-b transition-colors', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30', 'hover:bg-blue-50/40')}>
                      <td className={cn('px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>
                        {rowIdx + 1}
                      </td>
                      <td className={cn('px-2 sm:px-3 py-2 border-r', TABLE_BORDER)}>
                        <span className="text-slate-800 whitespace-normal break-words leading-snug">{entry.masalah}</span>
                      </td>
                      <td className={cn('px-2 sm:px-3 py-2 border-r', TABLE_BORDER)}>
                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs border font-medium', STATUS_BADGE[entry.status] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                          {STATUS_LABEL[entry.status] || 'Belum'}
                        </span>
                      </td>
                      <td className={cn('px-2 sm:px-3 py-2', TABLE_BORDER)}>
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <Button size="sm" aria-label="Edit refleksi" onClick={() => openEdit(entry)}
                            className="h-6 gap-1 bg-slate-600 hover:bg-slate-700 text-white text-[11px] px-1.5">
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button size="sm" aria-label="Hapus refleksi" onClick={() => handleDeleteEntry(entry.id)}
                            className="h-6 gap-1 bg-red-600 hover:bg-red-700 text-white text-[11px] px-1.5">
                            <Trash2 className="h-3 w-3" /> Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

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
              <Label htmlFor="masalah-teks">Refleksi</Label>
              <Textarea
                id="masalah-teks"
                placeholder="Tulis masalah yang sedang dihadapi..."
                value={editState?.masalah ?? ''}
                onChange={(e) => setEditState(prev => prev ? { ...prev, masalah: e.target.value } : prev)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="masalah-status">Status</Label>
              <select
                id="masalah-status"
                value={editState?.status === 'sudah' ? 'sudah' : 'belum'}
                onChange={(e) => setEditState(prev => prev ? { ...prev, status: e.target.value as 'belum' | 'sudah' } : prev)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-2"
              >
                <option value="belum">Belum</option>
                <option value="sudah">Sudah</option>
              </select>
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
