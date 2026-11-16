"use client"

import { Fragment, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn, formatRupiah } from '@/lib/utils'
import { usePencatatanKeuanganAll, useCreateKeuangan, useUpdateKeuangan, useDeleteKeuangan } from '@/hooks/usePencatatanKeuangan'
import type { KeuanganEntry, KeuanganStatus } from '@/app/actions/pencatatan-keuangan'
import { useRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'

const TABLE_BORDER = 'border-slate-900'

const STATUS_META: Record<KeuanganStatus, { label: string; badge: string; icon: typeof ArrowUpRight }> = {
  masuk: { label: 'Masuk', badge: 'bg-green-100 text-green-700 border-green-200', icon: ArrowDownLeft },
  keluar: { label: 'Keluar', badge: 'bg-red-100 text-red-700 border-red-200', icon: ArrowUpRight },
}

interface EditState {
  id: string | null // null = tambah baru
  jumlah: string
  status: KeuanganStatus
  alasan: string
}

export default function ArusKasPage() {
  // Arus Kas baru = pencatatan sederhana (tampil seluruh data, tanpa filter periode)
  const { data: logs = [], isLoading, error } = usePencatatanKeuanganAll()
  useRealtime({ table: 'pencatatan_keuangan', queryKeys: [['pencatatan-keuangan', 'all']] })

  const createKeuangan = useCreateKeuangan()
  const updateKeuangan = useUpdateKeuangan()
  const deleteKeuangan = useDeleteKeuangan()

  const [editState, setEditState] = useState<EditState | null>(null)

  const entries = useMemo(() => [...(logs as KeuanganEntry[])], [logs])

  const openAdd = () => setEditState({ id: null, jumlah: '', status: 'masuk', alasan: '' })

  // Tombol "Tambah" di header kanan atas (pola Refleksi)
  const { setHeaderAddAction } = useHeaderControls()
  useEffect(() => {
    setHeaderAddAction(() => openAdd)
    return () => setHeaderAddAction(null)
  }, [setHeaderAddAction])

  const openEdit = (e: KeuanganEntry) =>
    setEditState({ id: e.id, jumlah: String(e.jumlah ?? ''), status: e.status, alasan: e.alasan || '' })

  const handleSave = async () => {
    if (!editState) return
    const jumlah = Number(editState.jumlah)
    if (!Number.isFinite(jumlah) || jumlah < 0) return
    const payload = { jumlah, status: editState.status, alasan: editState.alasan.trim() }
    if (editState.id) {
      await updateKeuangan.mutateAsync({ id: editState.id, data: payload })
    } else {
      await createKeuangan.mutateAsync(payload)
    }
    setEditState(null)
  }

  const handleDeleteEntry = async (id: string) => {
    await deleteKeuangan.mutateAsync(id)
  }

  const handleDelete = async () => {
    if (!editState?.id) return
    await deleteKeuangan.mutateAsync(editState.id)
    setEditState(null)
  }

  return (
    <div className="max-w-[1440px] mx-auto py-4 sm:py-6 lg:pt-2 space-y-4">
      {/* Tabel: No | Jumlah Uang | Status (masuk/keluar) | Alasan | Aksi */}
      <div className={cn('relative overflow-x-auto rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className={cn('hidden sm:table-header-group sticky top-0 z-20 bg-white')}>
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[50px] sm:min-w-[70px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-emerald-500" />
                  No
                </div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[110px] sm:min-w-[140px]', TABLE_BORDER)}>
                Jumlah Uang
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[90px] sm:min-w-[110px]', TABLE_BORDER)}>
                Status
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px]', TABLE_BORDER)}>
                Alasan
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[120px] sm:min-w-[150px]', TABLE_BORDER)}>
                Aksi
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
                <td colSpan={5} className="text-center py-12 text-red-500 text-xs sm:text-sm">
                  Gagal memuat data (pastikan migrasi SQL 20261115000003 sudah dijalankan): {error.message}
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">Belum ada pencatatan keuangan.</td>
              </tr>
            ) : (
              entries.map((entry, rowIdx) => {
                const meta = STATUS_META[entry.status] || STATUS_META.masuk
                const Icon = meta.icon
                return (
                  <Fragment key={entry.id}>
                    {/* Mobile: kartu ringkas */}
                    <tr className={cn('sm:hidden border-b', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                      <td colSpan={5} className={cn('px-3 py-3', TABLE_BORDER)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border font-medium', meta.badge)}>
                                <Icon className="h-3 w-3" /> {meta.label}
                              </span>
                              <span className="text-sm font-bold text-slate-900 tabular-nums">{formatRupiah(entry.jumlah)}</span>
                            </div>
                            {entry.alasan && (
                              <p className="mt-1 text-xs text-slate-600 whitespace-normal break-words leading-snug">{entry.alasan}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" aria-label="Edit pencatatan" onClick={() => openEdit(entry)}
                              className="h-6 w-6 p-0 bg-slate-600 hover:bg-slate-700 text-white">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" aria-label="Hapus pencatatan" onClick={() => handleDeleteEntry(entry.id)}
                              className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* Desktop: tabel penuh */}
                    <tr className={cn('hidden sm:table-row border-b transition-colors', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30', 'hover:bg-emerald-50/40')}>
                      <td className={cn('px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>
                        {rowIdx + 1}
                      </td>
                      <td className={cn('px-2 sm:px-3 py-2 text-right border-r font-semibold tabular-nums text-slate-900', TABLE_BORDER)}>
                        {formatRupiah(entry.jumlah)}
                      </td>
                      <td className={cn('px-2 sm:px-3 py-2 text-center border-r', TABLE_BORDER)}>
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium', meta.badge)}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </span>
                      </td>
                      <td className={cn('px-2 sm:px-3 py-2 border-r', TABLE_BORDER)}>
                        <span className="text-slate-700 whitespace-normal break-words leading-snug">{entry.alasan || '—'}</span>
                      </td>
                      <td className={cn('px-2 sm:px-3 py-2', TABLE_BORDER)}>
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <Button size="sm" aria-label="Edit pencatatan" onClick={() => openEdit(entry)}
                            className="h-6 gap-1 bg-slate-600 hover:bg-slate-700 text-white text-[11px] px-1.5">
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button size="sm" aria-label="Hapus pencatatan" onClick={() => handleDeleteEntry(entry.id)}
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

      {/* Dialog tambah / edit */}
      <Dialog open={!!editState} onOpenChange={(open) => { if (!open) setEditState(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editState?.id ? 'Edit Pencatatan' : 'Tambah Pencatatan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ak-jumlah">Jumlah Uang</Label>
              <Input id="ak-jumlah" type="number" min="0" inputMode="numeric" placeholder="0"
                value={editState?.jumlah ?? ''}
                onChange={(e) => setEditState(prev => prev ? { ...prev, jumlah: e.target.value } : prev)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['masuk', 'keluar'] as KeuanganStatus[]).map((st) => {
                  const m = STATUS_META[st]
                  const Icon = m.icon
                  const active = editState?.status === st
                  return (
                    <button key={st} type="button"
                      onClick={() => setEditState(prev => prev ? { ...prev, status: st } : prev)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 h-9 rounded-md border text-sm font-medium transition-colors',
                        active ? m.badge : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}>
                      <Icon className="h-4 w-4" /> {m.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ak-alasan">Alasan</Label>
              <Textarea id="ak-alasan" rows={3} placeholder="mis. gaji bulanan, beli beras, ..."
                value={editState?.alasan ?? ''}
                onChange={(e) => setEditState(prev => prev ? { ...prev, alasan: e.target.value } : prev)} />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              {editState?.id ? (
                <Button variant="destructive" size="sm" onClick={handleDelete}>Hapus</Button>
              ) : <span />}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditState(null)}>Batal</Button>
                <Button size="sm" onClick={handleSave}
                  disabled={createKeuangan.isPending || updateKeuangan.isPending}>Simpan</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
