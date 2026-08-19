"use client"

import { Fragment, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Hash, Lightbulb, Trash2, Plus, Pencil, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSaranPerbaikanRange, useAllSaranPerbaikan, useCreateSaranPerbaikan, useUpdateSaranPerbaikan, useDeleteSaranPerbaikan } from '@/hooks/useSaranPerbaikan'
import { useRealtime } from '@/hooks/useRealtime'

// ─── Constants ────────────────────────────────────

const TABLE_BORDER = 'border-slate-900'

interface SaranEntry {
  id: string
  user_id: string
  tanggal: string
  hari: string
  saran: string
  created_at: string
}

interface EditState {
  id: string | null // null = tambah baru
  tanggal: string
  saran: string
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ─── Main Component ────────────────────────────────

// Revisi 1 (batch 7): model entri seperti tab Masalah — tabel kosong sampai ada inputan,
// tanggal mengikuti inputan (bukan grid semua tanggal). Tab ini bernama "Masukan".
export default function SaranPerbaikanPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const { data: logs = [], isLoading, error } = useAllSaranPerbaikan()
  useRealtime({
    table: 'saran_perbaikan',
    queryKeys: [['saran-perbaikan', 'all']],
  })

  const createSaranPerbaikan = useCreateSaranPerbaikan()
  const updateSaranPerbaikan = useUpdateSaranPerbaikan()
  const deleteSaranPerbaikan = useDeleteSaranPerbaikan()

  const [editState, setEditState] = useState<EditState | null>(null)

  // Urutkan entri: terlama di atas, terbaru di bawah (tanggal baru di bagian bawah)
  const entries = useMemo(() => {
    return [...(logs as SaranEntry[])].sort((a, b) =>
      a.tanggal.localeCompare(b.tanggal) || (a.created_at || '').localeCompare(b.created_at || ''))
  }, [logs])

  const openAdd = () => setEditState({ id: null, tanggal: todayStr, saran: '' })
  const openEdit = (e: SaranEntry) => setEditState({ id: e.id, tanggal: e.tanggal, saran: e.saran })

  const handleSave = async () => {
    if (!editState) return
    if (!editState.saran.trim()) return
    const hari = format(new Date(editState.tanggal + 'T00:00:00'), 'EEEE', { locale: id })
    if (editState.id) {
      await updateSaranPerbaikan.mutateAsync({
        id: editState.id,
        data: { tanggal: editState.tanggal, hari, saran: editState.saran.trim() },
      })
    } else {
      await createSaranPerbaikan.mutateAsync({
        tanggal: editState.tanggal,
        hari,
        saran: editState.saran.trim(),
      })
    }
    setEditState(null)
  }

  const handleDeleteEntry = async (id: string) => {
    await deleteSaranPerbaikan.mutateAsync(id)
  }

  const handleDelete = async () => {
    if (!editState?.id) return
    await deleteSaranPerbaikan.mutateAsync(editState.id)
    setEditState(null)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {/* Tabel: No | Saran Perbaikan | Aksi — tanpa kolom tanggal & hari */}
      <div className={cn('relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] landscape:max-lg:max-h-none rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className={cn('hidden sm:table-header-group sticky top-0 z-20 bg-white')}>
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('dt-col-stick sticky left-0 z-30 bg-white px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[48px] sm:min-w-[64px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-blue-500" />
                  No
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[220px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Saran Perbaikan
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[96px] sm:min-w-[110px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Wrench className="h-3.5 w-3.5 text-amber-500" />
                  Aksi
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
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
                <td colSpan={3} className="text-center py-12 text-slate-400 text-sm">
                  Belum ada masukan. Tekan tombol + untuk menambah.
                </td>
              </tr>
            ) : (
              entries.map((entry, rowIdx) => {
                return (
                  <Fragment key={entry.id}>
                    {/* ── Mobile: kartu ringkas (sm:hidden) ── */}
                    <tr className={cn('sm:hidden border-b', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                      <td colSpan={3} className={cn('px-3 py-3', TABLE_BORDER)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="inline-block text-[11px] font-semibold text-slate-400 tabular-nums">No. {rowIdx + 1}</span>
                            <p className="text-sm text-slate-800 whitespace-normal break-words leading-snug">{entry.saran}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" aria-label="Edit masukan" onClick={() => openEdit(entry)}
                              className="h-6 w-6 p-0 bg-slate-600 hover:bg-slate-700 text-white">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" aria-label="Hapus masukan" onClick={() => handleDeleteEntry(entry.id)}
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
                        <span className="text-slate-800 whitespace-normal break-words leading-snug">{entry.saran}</span>
                      </td>
                      <td className={cn('px-2 sm:px-3 py-2', TABLE_BORDER)}>
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <Button
                            size="sm"
                            aria-label="Edit masukan"
                            onClick={() => openEdit(entry)}
                            className="h-6 gap-1 bg-slate-600 hover:bg-slate-700 text-white text-[11px] px-1.5"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            aria-label="Hapus masukan"
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="h-6 gap-1 bg-red-600 hover:bg-red-700 text-white text-[11px] px-1.5"
                          >
                            <Trash2 className="h-3 w-3" />
                            Hapus
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
        aria-label="Tambah Masukan"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialog tambah/edit masukan */}
      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editState?.id ? 'Edit Masukan' : 'Tambah Masukan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="saran-teks">Saran Perbaikan</Label>
              <Textarea
                id="saran-teks"
                placeholder="Tulis masukan atau saran perbaikan..."
                value={editState?.saran ?? ''}
                onChange={(e) => setEditState(prev => prev ? { ...prev, saran: e.target.value } : prev)}
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
                <Button onClick={handleSave} disabled={!editState?.saran.trim()}>Simpan</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
