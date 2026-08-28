"use client"

import { Fragment, useMemo, useState } from 'react'
import {
  format,
} from 'date-fns'
import { id } from 'date-fns/locale'
import { Shield, Trash2, Plus, Pencil, Wrench, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useMentalBlockAll, useUpsertMentalBlock, useUpdateMentalBlock, useDeleteMentalBlock } from "@/hooks/useMentalBlock"
import { useRealtime } from "@/hooks/useRealtime"

const TABLE_BORDER = 'border-slate-900'

interface MentalBlockEntry {
  id: string
  user_id: string
  tanggal: string
  masalah: string
  created_at: string
  updated_at: string
}

interface EditState {
  id: string | null // null = tambah baru
  tanggal: string
  masalah: string
}

// ─── Main Component ────────────────────────────────

export default function MentalBlockPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Mental Block = journal: tampilkan SELURUH entri, tidak dibatasi periode tanggal.
  const { data: logs = [], isLoading, error } = useMentalBlockAll()
  useRealtime({ table: 'mental_block', queryKeys: [['mental_block', 'all']] })

  const upsertMentalBlock = useUpsertMentalBlock()
  const updateMentalBlock = useUpdateMentalBlock()
  const deleteMentalBlock = useDeleteMentalBlock()

  const [editState, setEditState] = useState<EditState | null>(null)

  // Urutkan entri: terbaru (tanggal besar) di atas
  const entries = useMemo(() => {
    return [...(logs as MentalBlockEntry[])].sort((a, b) =>
      b.tanggal.localeCompare(a.tanggal) || (b.created_at || '').localeCompare(a.created_at || ''))
  }, [logs])

  const openAdd = () => setEditState({ id: null, tanggal: todayStr, masalah: '' })
  const openEdit = (e: MentalBlockEntry) => setEditState({ id: e.id, tanggal: e.tanggal, masalah: e.masalah })

  const handleSave = async () => {
    if (!editState) return
    if (!editState.masalah.trim()) return
    if (editState.id) {
      await updateMentalBlock.mutateAsync({
        id: editState.id,
        data: { tanggal: editState.tanggal, masalah: editState.masalah.trim() },
      })
    } else {
      await upsertMentalBlock.mutateAsync({
        tanggal: editState.tanggal,
        masalah: editState.masalah.trim(),
      })
    }
    setEditState(null)
  }

  const handleDeleteEntry = async (id: string) => {
    await deleteMentalBlock.mutateAsync(id)
  }

  const handleDelete = async () => {
    if (!editState?.id) return
    await deleteMentalBlock.mutateAsync(editState.id)
    setEditState(null)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">

      {/* Tabel gaya Quran: Tanggal | Mental Block (tanpa status) */}
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
                  Mental Block
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
                <td colSpan={3} className="text-center py-12 text-slate-400 text-sm">Belum ada mental block tercatat.</td>
              </tr>
            ) : (
              entries.map((entry, rowIdx) => {
                return (
                  <Fragment key={entry.id}>
                    {/* ── Mobile: kartu ringkas (sm:hidden) ── */}
                    <tr className={cn('sm:hidden border-b', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                      <td colSpan={3} className={cn('px-3 py-3', TABLE_BORDER)}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-slate-800 whitespace-normal break-words leading-snug flex-1">{entry.masalah}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" aria-label="Edit mental block" onClick={() => openEdit(entry)}
                              className="h-6 w-6 p-0 bg-slate-600 hover:bg-slate-700 text-white">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" aria-label="Hapus mental block" onClick={() => handleDeleteEntry(entry.id)}
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
                      <td className={cn('px-2 sm:px-3 py-2', TABLE_BORDER)}>
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <Button size="sm" aria-label="Edit mental block" onClick={() => openEdit(entry)}
                            className="h-6 gap-1 bg-slate-600 hover:bg-slate-700 text-white text-[11px] px-1.5">
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button size="sm" aria-label="Hapus mental block" onClick={() => handleDeleteEntry(entry.id)}
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

      {/* Tombol tambah floating */}
      <Button
        onClick={openAdd}
        size="icon"
        aria-label="Tambah Mental Block"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialog tambah/edit mental block */}
      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editState?.id ? 'Edit Mental Block' : 'Tambah Mental Block'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mental-block-teks">Mental Block</Label>
              <Textarea
                id="mental-block-teks"
                placeholder="Tulis mental block yang sedang dihadapi..."
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
