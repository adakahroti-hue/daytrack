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
import { Hash, Smile, Check, X, Trash2, Plus, Pencil, Wrench, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useKesenanganRange, useCreateKesenangan, useUpdateKesenangan, useDeleteKesenangan } from '@/hooks/useKesenangan'
import { useRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'

// ─── Constants ────────────────────────────────────

const TABLE_BORDER = 'border-slate-900'

interface KesenanganEntry {
  id: string
  user_id: string
  tanggal: string
  hari: string
  kesenangan: string
  status: 'belum' | 'sudah' | null
  created_at: string
}

interface EditState {
  id: string | null // null = tambah baru
  tanggal: string
  kesenangan: string
  status: 'belum' | 'sudah'
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ─── Main Component ────────────────────────────────

// Revisi 1 (batch 7): model entri seperti tab Masalah — tabel kosong sampai ada inputan,
// tanggal mengikuti inputan (bukan grid semua tanggal).
export default function KesenanganPage() {
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

  const { data: logs = [], isLoading, error } = useKesenanganRange(startDate, endDate)
  useRealtime({
    table: 'senang',
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [['senang', 'range', startDate, endDate]],
  })

  const createKesenangan = useCreateKesenangan()
  const updateKesenangan = useUpdateKesenangan()
  const deleteKesenangan = useDeleteKesenangan()

  const [editState, setEditState] = useState<EditState | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Urutkan entri: terlama di atas, terbaru di bawah (tanggal baru di bagian bawah)
  const entries = useMemo(() => {
    return [...(logs as KesenanganEntry[])].sort((a, b) =>
      a.tanggal.localeCompare(b.tanggal) || (a.created_at || '').localeCompare(b.created_at || ''))
  }, [logs])

  const openAdd = () => setEditState({ id: null, tanggal: todayStr, kesenangan: '', status: 'belum' })
  const openEdit = (e: KesenanganEntry) => setEditState({ id: e.id, tanggal: e.tanggal, kesenangan: e.kesenangan, status: (e.status === 'sudah' ? 'sudah' : 'belum') })

  const handleSave = async () => {
    if (!editState) return
    if (!editState.kesenangan.trim()) return
    const hari = format(new Date(editState.tanggal + 'T00:00:00'), 'EEEE', { locale: id })
    if (editState.id) {
      await updateKesenangan.mutateAsync({
        id: editState.id,
        data: { tanggal: editState.tanggal, hari, kesenangan: editState.kesenangan.trim(), status: editState.status },
      })
    } else {
      await createKesenangan.mutateAsync({
        tanggal: editState.tanggal,
        hari,
        kesenangan: editState.kesenangan.trim(),
        status: editState.status,
      })
    }
    setEditState(null)
  }

  const handleDeleteEntry = async (id: string) => {
    await deleteKesenangan.mutateAsync(id)
  }

  const handleDelete = async () => {
    if (!editState?.id) return
    await deleteKesenangan.mutateAsync(editState.id)
    setEditState(null)
  }

  const handleSetStatus = async (entry: KesenanganEntry, done: boolean) => {
    await updateKesenangan.mutateAsync({ id: entry.id, data: { status: done ? 'sudah' : 'belum' } })
  }

  // Salin teks "Kesenangan yang Ditunda" ke clipboard, beri feedback "Tersalin" 1.5 dtk.
  const handleCopy = async (entry: KesenanganEntry) => {
    try {
      await navigator.clipboard.writeText(entry.kesenangan)
      setCopiedId(entry.id)
      setTimeout(() => setCopiedId((cur) => (cur === entry.id ? null : cur)), 1500)
    } catch {
      /* clipboard tidak tersedia — abaikan */
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {/* Tabel: No | Kesenangan yang Ditunda | Status | Aksi — tanpa kolom tanggal & hari */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className={cn('hidden sm:table-header-group sticky top-0 z-20 bg-white')}>
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('dt-col-stick sticky left-0 z-30 bg-white px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[48px] sm:min-w-[64px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-purple-500" />
                  No
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[170px] sm:min-w-[240px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Smile className="h-3.5 w-3.5 text-purple-500" />
                  Link Video
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[96px] sm:min-w-[110px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Check className="h-3.5 w-3.5 text-purple-500" />
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
                <td colSpan={4} className="text-center py-12 text-slate-400 text-sm">
                  Belum ada kesenangan yang ditunda. Tekan tombol + untuk menambah.
                </td>
              </tr>
            ) : (
              entries.map((entry, rowIdx) => {
                const isDone = entry.status === 'sudah'
                return (
                  <Fragment key={entry.id}>
                    {/* ── Mobile: kartu ringkas (sm:hidden) ── */}
                    <tr className={cn('sm:hidden border-b', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                      <td colSpan={4} className={cn('px-3 py-3', TABLE_BORDER)}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-slate-800 whitespace-normal break-words leading-snug flex-1">{entry.kesenangan}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-semibold text-slate-400 tabular-nums">No. {rowIdx + 1}</span>
                              <button type="button" onClick={() => handleSetStatus(entry, !isDone)}
                                className={cn('inline-flex items-center justify-center gap-1 rounded-md text-[11px] font-medium border px-2 py-1',
                                  isDone ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                                {isDone ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {isDone ? 'Sudah' : 'Belum'}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-1 pt-0.5">
                            <Button size="icon" aria-label="Edit kesenangan" onClick={() => openEdit(entry)}
                              className="h-6 w-6 p-0 bg-slate-600 hover:bg-slate-700 text-white">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" aria-label="Hapus kesenangan" onClick={() => handleDeleteEntry(entry.id)}
                              className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* ── Desktop: tabel penuh (hidden sm:table-row) ── */}
                    <tr key={entry.id} className={cn('hidden sm:table-row border-b transition-colors', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30', 'hover:bg-blue-50/40')}>
                      <td className={cn('dt-col-stick sticky left-0 z-10 bg-inherit px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>
                        {rowIdx + 1}
                      </td>
                      <td className={cn('px-2 sm:px-3 py-2 border-r', TABLE_BORDER)}>
                        <span className="text-slate-800 whitespace-normal break-words leading-snug">{entry.kesenangan}</span>
                      </td>
                      <td className={cn('px-2 sm:px-3 py-2 text-center border-r', TABLE_BORDER)}>
                        <div className="flex items-center justify-center min-h-[36px]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  'inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer whitespace-normal leading-tight text-center',
                                  isDone
                                    ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                )}>
                              {isDone && <Check className="h-3.5 w-3.5 shrink-0" />}
                              {isDone ? 'Sudah' : 'Belum'}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-36">
                            <DropdownMenuItem onClick={() => handleSetStatus(entry, false)} className="flex items-center gap-2">
                              <X className="h-4 w-4 text-amber-500" /> Belum
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSetStatus(entry, true)} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-600" /> Sudah
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(entry)} className="flex items-center gap-2">
                              <Pencil className="h-4 w-4 text-slate-500" /> Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2', TABLE_BORDER)}>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <Button size="sm" aria-label="Edit kesenangan" onClick={() => openEdit(entry)}
                          className="h-6 gap-1 bg-slate-600 hover:bg-slate-700 text-white text-[11px] px-1.5">
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button size="sm" aria-label="Hapus kesenangan" onClick={() => handleDeleteEntry(entry.id)}
                          className="h-6 gap-1 bg-red-600 hover:bg-red-700 text-white text-[11px] px-1.5">
                          <Trash2 className="h-3 w-3" /> Hapus
                        </Button>
                        <Button size="sm" aria-label="Salin teks kesenangan" onClick={() => handleCopy(entry)}
                          className={cn('h-6 gap-1 text-[11px] px-1.5', copiedId === entry.id ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-purple-600 hover:bg-purple-700 text-white')}>
                          {copiedId === entry.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedId === entry.id ? 'Tersalin' : 'Copy'}
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

      {/* Revisi 8 (batch 6): tombol tambah floating seperti tab Semua */}
      <Button
        onClick={openAdd}
        size="icon"
        aria-label="Tambah Kesenangan"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialog tambah/edit kesenangan */}
      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editState?.id ? 'Edit Kesenangan' : 'Tambah Kesenangan yang Ditunda'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kesenangan-teks">Kesenangan yang Ditunda</Label>
              <Textarea
                id="kesenangan-teks"
                placeholder="Contoh: nonton film, main game, jalan-jalan…"
                value={editState?.kesenangan ?? ''}
                onChange={(e) => setEditState(prev => prev ? { ...prev, kesenangan: e.target.value } : prev)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kesenangan-status">Status</Label>
              <select
                id="kesenangan-status"
                value={editState?.status ?? 'belum'}
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
                <Button onClick={handleSave} disabled={!editState?.kesenangan.trim()}>Simpan</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
