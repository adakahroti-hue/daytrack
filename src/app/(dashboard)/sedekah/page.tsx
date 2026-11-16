"use client"

import { Fragment, useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, Hash, Plus, X, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn, formatRupiah } from '@/lib/utils'
import { useCatatanSedekahAll, useSaveSedekah, useDeleteSedekah } from '@/hooks/useCatatanSedekah'
import type { SedekahEntry, JenisSedekah } from '@/app/actions/catatan-sedekah'
import { useRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'

const TABLE_BORDER = 'border-slate-900'

const JENIS_LABEL: Record<JenisSedekah, string> = {
  subuh: 'Sedekah Subuh',
  jumat: 'Sedekah Jumat',
  rutin: 'Rutin',
  spontan: 'Spontan',
  lainnya: 'Lainnya',
}

const JENIS_BADGE: Record<JenisSedekah, string> = {
  subuh: 'bg-blue-100 text-blue-700 border-blue-200',
  jumat: 'bg-purple-100 text-purple-700 border-purple-200',
  rutin: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  spontan: 'bg-amber-100 text-amber-700 border-amber-200',
  lainnya: 'bg-slate-100 text-slate-600 border-slate-200',
}

const JENIS_OPTIONS: JenisSedekah[] = ['subuh', 'jumat', 'rutin', 'spontan', 'lainnya']

interface BenefitDraft {
  benefit: string
  tanggal_benefit: string
}

interface EditState {
  id: string | null // null = tambah baru
  tanggal_sedekah: string
  jenis: JenisSedekah
  penerima: string
  keterangan: string
  nominal: string
  cerita: string
  benefits: BenefitDraft[]
}

const fmtTanggal = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SedekahPage() {
  // Sedekah = journal: tampilkan seluruh entri, tanpa filter periode
  const { data: logs = [], isLoading, error } = useCatatanSedekahAll()
  useRealtime({ table: 'catatan_sedekah', queryKeys: [['catatan-sedekah', 'all']] })

  const saveSedekah = useSaveSedekah()
  const deleteSedekah = useDeleteSedekah()

  const [editState, setEditState] = useState<EditState | null>(null)

  const entries = useMemo(() => [...(logs as SedekahEntry[])], [logs])

  const todayISO = () => new Date().toISOString().slice(0, 10)
  const openAdd = () =>
    setEditState({ id: null, tanggal_sedekah: todayISO(), jenis: 'rutin', penerima: '', keterangan: '', nominal: '', cerita: '', benefits: [] })

  // Tombol "Tambah" di header kanan atas
  const { setHeaderAddAction } = useHeaderControls()
  useEffect(() => {
    setHeaderAddAction(() => openAdd)
    return () => setHeaderAddAction(null)
  }, [setHeaderAddAction])

  const openEdit = (e: SedekahEntry) =>
    setEditState({
      id: e.id,
      tanggal_sedekah: (e.tanggal_sedekah || todayISO()).slice(0, 10),
      jenis: (JENIS_OPTIONS.includes(e.jenis) ? e.jenis : 'lainnya') as JenisSedekah,
      penerima: e.penerima || '',
      keterangan: e.keterangan || '',
      nominal: String(e.nominal ?? ''),
      cerita: e.cerita || '',
      benefits: (e.benefits || []).map((b) => ({ benefit: b.benefit, tanggal_benefit: (b.tanggal_benefit || '').slice(0, 10) })),
    })

  const setBenefit = (idx: number, patch: Partial<BenefitDraft>) =>
    setEditState(prev => prev ? {
      ...prev,
      benefits: prev.benefits.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    } : prev)

  const addBenefit = () =>
    setEditState(prev => prev ? { ...prev, benefits: [...prev.benefits, { benefit: '', tanggal_benefit: todayISO() }] } : prev)

  const removeBenefit = (idx: number) =>
    setEditState(prev => prev ? { ...prev, benefits: prev.benefits.filter((_, i) => i !== idx) } : prev)

  const handleSave = async () => {
    if (!editState) return
    const nominal = Number(editState.nominal || 0)
    if (!Number.isFinite(nominal) || nominal < 0) return
    if (!editState.tanggal_sedekah) return
    const payload = {
      tanggal_sedekah: editState.tanggal_sedekah,
      jenis: editState.jenis,
      penerima: editState.penerima.trim(),
      keterangan: editState.keterangan.trim(),
      nominal,
      cerita: editState.cerita.trim(),
      benefits: editState.benefits
        .map((b) => ({ benefit: b.benefit.trim(), tanggal_benefit: b.tanggal_benefit }))
        .filter((b) => b.benefit.length > 0),
    }
    await saveSedekah.mutateAsync({ id: editState.id, data: payload })
    setEditState(null)
  }

  const handleDeleteEntry = async (id: string) => {
    await deleteSedekah.mutateAsync(id)
  }

  const handleDelete = async () => {
    if (!editState?.id) return
    await deleteSedekah.mutateAsync(editState.id)
    setEditState(null)
  }

  const BenefitChips = ({ list }: { list?: { id?: string; benefit: string; tanggal_benefit?: string | null }[] }) => {
    if (!list || list.length === 0) return <span className="text-slate-400">—</span>
    return (
      <ul className="space-y-1">
        {list.map((b, i) => (
          <li key={b.id || i} className="inline-flex flex-col items-start mr-1 mb-1 px-2 py-0.5 rounded-full text-[11px] border bg-emerald-50 text-emerald-800 border-emerald-200 whitespace-normal">
            <span>{b.benefit}</span>
            {b.tanggal_benefit && <span className="text-[10px] text-emerald-600">{fmtTanggal(b.tanggal_benefit)}</span>}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto py-4 sm:py-6 lg:pt-2 space-y-4">
      <div className={cn('relative overflow-x-auto rounded-lg border bg-white', TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className={cn('hidden sm:table-header-group sticky top-0 z-20 bg-white')}>
            <tr className={cn('border-b', TABLE_BORDER)}>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[46px] sm:min-w-[56px]', TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Hash className="h-3.5 w-3.5 text-emerald-500" />No</div>
              </th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[96px]', TABLE_BORDER)}>ID</th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[96px]', TABLE_BORDER)}>Tanggal Sedekah</th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[96px]', TABLE_BORDER)}>Jenis</th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[110px]', TABLE_BORDER)}>Penerima</th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px]', TABLE_BORDER)}>Keterangan</th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[96px]', TABLE_BORDER)}>Nominal</th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[150px]', TABLE_BORDER)}>Benefit</th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[140px]', TABLE_BORDER)}>Cerita / Pengalaman</th>
              <th className={cn('px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[110px]', TABLE_BORDER)}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-red-500 text-xs sm:text-sm">
                  Gagal memuat data (pastikan migrasi SQL 20261115000003 sudah dijalankan): {error.message}
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-slate-400 text-sm">Belum ada pencatatan sedekah.</td>
              </tr>
            ) : (
              entries.map((entry, rowIdx) => (
                <Fragment key={entry.id}>
                  {/* Mobile: kartu ringkas */}
                  <tr className={cn('sm:hidden border-b', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                    <td colSpan={10} className={cn('px-3 py-3', TABLE_BORDER)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="text-[11px] font-mono text-slate-500">{entry.kode}</span>
                            <span className={cn('px-2 py-0.5 rounded-full text-[11px] border font-medium', JENIS_BADGE[entry.jenis] || JENIS_BADGE.lainnya)}>
                              {JENIS_LABEL[entry.jenis] || entry.jenis}
                            </span>
                            <span className="text-sm font-bold text-slate-900 tabular-nums">{formatRupiah(entry.nominal)}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{fmtTanggal(entry.tanggal_sedekah)}{entry.penerima ? ` · ke ${entry.penerima}` : ''}</p>
                          {entry.keterangan && <p className="mt-1 text-xs text-slate-600">{entry.keterangan}</p>}
                          {entry.benefits && entry.benefits.length > 0 && (
                            <div className="mt-1.5"><BenefitChips list={entry.benefits} /></div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" aria-label="Edit sedekah" onClick={() => openEdit(entry)}
                            className="h-6 w-6 p-0 bg-slate-600 hover:bg-slate-700 text-white">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" aria-label="Hapus sedekah" onClick={() => handleDeleteEntry(entry.id)}
                            className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* Desktop: tabel penuh */}
                  <tr className={cn('hidden sm:table-row border-b transition-colors', TABLE_BORDER, rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30', 'hover:bg-emerald-50/40')}>
                    <td className={cn('px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums', TABLE_BORDER)}>{rowIdx + 1}</td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r font-mono text-[11px] text-slate-600', TABLE_BORDER)}>{entry.kode}</td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r text-slate-700 whitespace-nowrap', TABLE_BORDER)}>{fmtTanggal(entry.tanggal_sedekah)}</td>
                    <td className={cn('px-2 sm:px-3 py-2 text-center border-r', TABLE_BORDER)}>
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-[11px] border font-medium whitespace-nowrap', JENIS_BADGE[entry.jenis] || JENIS_BADGE.lainnya)}>
                        {JENIS_LABEL[entry.jenis] || entry.jenis}
                      </span>
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 border-r text-slate-700 break-words', TABLE_BORDER)}>{entry.penerima || '—'}</td>
                    <td className={cn('px-2 sm:px-3 py-2 border-r text-slate-600 break-words leading-snug', TABLE_BORDER)}>{entry.keterangan || '—'}</td>
                    <td className={cn('px-2 sm:px-3 py-2 text-right border-r font-semibold tabular-nums text-slate-900', TABLE_BORDER)}>{formatRupiah(entry.nominal)}</td>
                    <td className={cn('px-2 sm:px-3 py-2 border-r', TABLE_BORDER)}><BenefitChips list={entry.benefits} /></td>
                    <td className={cn('px-2 sm:px-3 py-2 border-r text-slate-600 break-words leading-snug', TABLE_BORDER)}>{entry.cerita || '—'}</td>
                    <td className={cn('px-2 sm:px-3 py-2', TABLE_BORDER)}>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <Button size="sm" aria-label="Edit sedekah" onClick={() => openEdit(entry)}
                          className="h-6 gap-1 bg-slate-600 hover:bg-slate-700 text-white text-[11px] px-1.5">
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button size="sm" aria-label="Hapus sedekah" onClick={() => handleDeleteEntry(entry.id)}
                          className="h-6 gap-1 bg-red-600 hover:bg-red-700 text-white text-[11px] px-1.5">
                          <Trash2 className="h-3 w-3" /> Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog tambah / edit */}
      <Dialog open={!!editState} onOpenChange={(open) => { if (!open) setEditState(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editState?.id ? 'Edit Sedekah' : 'Tambah Sedekah'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sd-tanggal">Tanggal Sedekah</Label>
                <Input id="sd-tanggal" type="date"
                  value={editState?.tanggal_sedekah ?? ''}
                  onChange={(e) => setEditState(prev => prev ? { ...prev, tanggal_sedekah: e.target.value } : prev)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sd-jenis">Jenis Sedekah</Label>
                <select id="sd-jenis"
                  value={editState?.jenis ?? 'rutin'}
                  onChange={(e) => setEditState(prev => prev ? { ...prev, jenis: e.target.value as JenisSedekah } : prev)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{JENIS_LABEL[j]}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sd-penerima">Penerima</Label>
                <Input id="sd-penerima" placeholder="mis. Masjid Al-Ikhlas, Bu Siti, ..."
                  value={editState?.penerima ?? ''}
                  onChange={(e) => setEditState(prev => prev ? { ...prev, penerima: e.target.value } : prev)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sd-nominal">Nominal</Label>
                <Input id="sd-nominal" type="number" min="0" inputMode="numeric" placeholder="0"
                  value={editState?.nominal ?? ''}
                  onChange={(e) => setEditState(prev => prev ? { ...prev, nominal: e.target.value } : prev)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sd-keterangan">Keterangan (deskripsi / tujuan)</Label>
              <Input id="sd-keterangan" placeholder="mis. untuk anak yatim di panti asuhan"
                value={editState?.keterangan ?? ''}
                onChange={(e) => setEditState(prev => prev ? { ...prev, keterangan: e.target.value } : prev)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sd-cerita">Cerita / Pengalaman</Label>
              <Textarea id="sd-cerita" rows={3} placeholder="Ceritakan pengalaman atau kejadian yang dirasakan..."
                value={editState?.cerita ?? ''}
                onChange={(e) => setEditState(prev => prev ? { ...prev, cerita: e.target.value } : prev)} />
            </div>

            {/* Benefit: bisa lebih dari satu, masing-masing ada tanggal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5"><Gift className="h-3.5 w-3.5 text-emerald-600" /> Benefit (boleh lebih dari satu)</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={addBenefit}>
                  <Plus className="h-3 w-3" /> Tambah benefit
                </Button>
              </div>
              {(editState?.benefits ?? []).length === 0 && (
                <p className="text-xs text-slate-400">Belum ada benefit.</p>
              )}
              {(editState?.benefits ?? []).map((b, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50/60 p-2">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Input placeholder="mis. hati lebih tenang, dapat pahala jariyah"
                      value={b.benefit}
                      onChange={(e) => setBenefit(i, { benefit: e.target.value })} />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 shrink-0">Tanggal benefit</span>
                      <Input type="date" className="h-8" value={b.tanggal_benefit || ''}
                        onChange={(e) => setBenefit(i, { tanggal_benefit: e.target.value })} />
                    </div>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-slate-500 hover:text-red-600"
                    aria-label="Hapus benefit" onClick={() => removeBenefit(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {editState?.id ? (
                <Button variant="destructive" size="sm" onClick={handleDelete}>Hapus</Button>
              ) : <span />}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditState(null)}>Batal</Button>
                <Button size="sm" onClick={handleSave} disabled={saveSedekah.isPending}>Simpan</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
