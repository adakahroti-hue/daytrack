"use client"

import { useState, useEffect } from 'react'
import { format, subDays, addDays, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Plus, Edit2, Trash2, Star, Clock, CheckCircle2, Sparkles, Trophy, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useFunQueue, useUpsertFunQueue, useUpdateFunQueueStatus, useDeleteFunQueue } from '@/hooks/useFunQueue'
import { useFunQueueRealtime } from '@/hooks/useRealtime'

const KATEGORI_OPTIONS = [
  { value: 'hiburan', label: 'Hiburan', icon: '🎮' },
  { value: 'hobi', label: 'Hobi', icon: '🎨' },
  { value: 'makanan', label: 'Makanan', icon: '🍜' },
  { value: 'sosial', label: 'Sosial', icon: '👥' },
  { value: 'belanja', label: 'Belanja', icon: '🛍️' },
  { value: 'wisata', label: 'Wisata', icon: '✈️' },
  { value: 'istirahat', label: 'Istirahat', icon: '🛏️' },
  { value: 'lainnya', label: 'Lainnya', icon: '✨' },
] as const

const STATUS_OPTIONS = [
  { value: 'ditunda', label: 'Ditunda', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30', icon: Clock },
  { value: 'siap_dinikmati', label: 'Siap Dinikmati', color: 'bg-green-500/10 text-green-700 border-green-500/30', icon: Sparkles },
  { value: 'sedang_dilakukan', label: 'Sedang Dilakukan', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30', icon: Star },
  { value: 'selesai', label: 'Selesai', color: 'bg-gray-500/10 text-gray-700 border-gray-500/30', icon: CheckCircle2 },
] as const

const PRIORITAS_OPTIONS = [
  { value: 'rendah', label: 'Rendah', color: 'bg-gray-500/10 text-gray-700 border-gray-500/30' },
  { value: 'sedang', label: 'Sedang', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { value: 'tinggi', label: 'Tinggi', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
] as const

type StatusKey = 'ditunda' | 'siap_dinikmati' | 'sedang_dilakukan' | 'selesai'
type PrioritasKey = 'rendah' | 'sedang' | 'tinggi'
type KategoriKey = 'hiburan' | 'hobi' | 'makanan' | 'sosial' | 'belanja' | 'wisata' | 'istirahat' | 'lainnya'

interface FunQueueEntry {
  id: string
  user_id: string
  nama_kesenangan: string
  kategori: KategoriKey
  prioritas: PrioritasKey
  status: StatusKey
  target_selesai: string | null
  tanggal_dilakukan: string | null
  catatan: string | null
  syarat_claim: string | null
  created_at: string
  updated_at: string
}

export default function KesenanganPage() {
  const [editDialog, setEditDialog] = useState<{ open: boolean; entry: FunQueueEntry | null }>({ open: false, entry: null })
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const { data: funQueue = [], isLoading, error, refetch } = useFunQueue(filterStatus === 'all' ? undefined : filterStatus)
  const upsertFunQueue = useUpsertFunQueue()
  const updateFunQueueStatus = useUpdateFunQueueStatus()
  const deleteFunQueue = useDeleteFunQueue()

  useFunQueueRealtime()

  const handleOpenEdit = (entry: FunQueueEntry | null) => {
    if (entry) {
      setEditDialog({ open: true, entry })
    } else {
      setEditDialog({ 
        open: true, 
        entry: {
          id: '',
          user_id: '',
          nama_kesenangan: '',
          kategori: 'hiburan',
          prioritas: 'sedang',
          status: 'ditunda',
          target_selesai: null,
          tanggal_dilakukan: null,
          catatan: '',
          syarat_claim: '',
          created_at: '',
          updated_at: '',
        } as FunQueueEntry
      })
    }
  }

  const handleEditSubmit = async (data: any) => {
    await upsertFunQueue.mutateAsync({
      nama_kesenangan: data.nama_kesenangan,
      kategori: data.kategori,
      prioritas: data.prioritas,
      status: data.status,
      target_selesai: data.target_selesai || undefined,
      catatan: data.catatan || undefined,
      syarat_claim: data.syarat_claim || undefined,
    })
    setEditDialog({ open: false, entry: null })
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus kesenangan ini?')) {
      await deleteFunQueue.mutateAsync(id)
      refetch()
    }
  }

  const handleStatusChange = async (id: string, status: StatusKey) => {
    await updateFunQueueStatus.mutateAsync({ id, status })
    refetch()
  }

  const stats = {
    total: funQueue.length,
    ditunda: funQueue.filter(l => l.status === 'ditunda').length,
    siap: funQueue.filter(l => l.status === 'siap_dinikmati').length,
    sedang: funQueue.filter(l => l.status === 'sedang_dilakukan').length,
    selesai: funQueue.filter(l => l.status === 'selesai').length,
  }

  if (!mounted) {
    return <div className="space-y-6"><div className="h-8 bg-muted animate-pulse rounded w-1/4" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Kesenangan
          </h1>
          <p className="text-sm text-muted-foreground">Simpan hal menyenangkan untuk reward setelah prioritas selesai</p>
        </div>
        <Button variant="default" onClick={() => handleOpenEdit(null)} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Reward
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tersimpan</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Menunggu</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.ditunda}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Siap Dinikmati</p>
                <p className="text-2xl font-bold text-green-600">{stats.siap}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selesai</p>
                <p className="text-2xl font-bold text-gray-600">{stats.selesai}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button variant={filterStatus === 'all' ? 'default' : 'outline'} onClick={() => setFilterStatus('all')}>Semua</Button>
        <Button variant={filterStatus === 'ditunda' ? 'default' : 'outline'} onClick={() => setFilterStatus('ditunda')}>Ditunda</Button>
        <Button variant={filterStatus === 'siap_dinikmati' ? 'default' : 'outline'} onClick={() => setFilterStatus('siap_dinikmati')}>Siap</Button>
        <Button variant={filterStatus === 'sedang_dilakukan' ? 'default' : 'outline'} onClick={() => setFilterStatus('sedang_dilakukan')}>Sedang</Button>
        <Button variant={filterStatus === 'selesai' ? 'default' : 'outline'} onClick={() => setFilterStatus('selesai')}>Selesai</Button>
      </div>

      {/* Reward List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Daftar Reward
            <span className="text-sm font-normal text-muted-foreground">{funQueue.length} item</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-8">
              <p>Gagal memuat data: {error.message}</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">Coba Lagi</Button>
            </div>
          ) : funQueue.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada kesenangan tersimpan</p>
              <p className="text-sm text-muted-foreground mt-1">Tambahkan reward untuk dimiliki setelah pekerjaan selesai</p>
              <Button variant="default" className="mt-4 gap-2" onClick={() => handleOpenEdit(null)}>
                <Plus className="h-4 w-4" />
                Tambah Reward Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {STATUS_OPTIONS.map(({ value, label, color, icon: StatusIcon }) => {
                const items = funQueue.filter(l => l.status === value)
                if (items.length === 0) return null

                return (
                  <div key={value} className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <StatusIcon className="h-4 w-4" />
                      {label} ({items.length})
                    </h3>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className={cn('p-4 rounded-xl border', color, 'border-l-4')}>
                          <div className="flex gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-semibold truncate">{item.nama_kesenangan}</h4>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className={cn('text-xs', PRIORITAS_OPTIONS.find(p => p.value === item.prioritas)?.color)}>
                                    {PRIORITAS_OPTIONS.find(p => p.value === item.prioritas)?.label}
                                  </Badge>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(item)} aria-label="Edit">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)} aria-label="Hapus">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {KATEGORI_OPTIONS.find(k => k.value === item.kategori)?.icon} {KATEGORI_OPTIONS.find(k => k.value === item.kategori)?.label}
                                </Badge>
                                {item.target_selesai && (
                                  <Badge variant="outline" className="text-xs">
                                    <Flag className="h-3 w-3 mr-1" />
                                    Target: {format(new Date(item.target_selesai), 'd MMM', { locale: id })}
                                  </Badge>
                                )}
                                {item.syarat_claim && (
                                  <Badge variant="outline" className="text-xs max-w-xs truncate">
                                    <Star className="h-3 w-3 mr-1" />
                                    Syarat: {item.syarat_claim}
                                  </Badge>
                                )}
                              </div>
                              {item.catatan && (
                                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                  {item.catatan}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {value !== 'selesai' && value !== 'sedang_dilakukan' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(item.id, 'siap_dinikmati')}
                                  className="text-xs"
                                >
                                  <Sparkles className="mr-1 h-3 w-3" /> Siap
                                </Button>
                              )}
                              {value === 'siap_dinikmati' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleStatusChange(item.id, 'sedang_dilakukan')}
                                  className="text-xs"
                                >
                                  <Star className="mr-1 h-3 w-3" /> Mulai
                                </Button>
                              )}
                              {value === 'sedang_dilakukan' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleStatusChange(item.id, 'selesai')}
                                  className="text-xs"
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Selesai
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, entry: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.entry?.id ? 'Edit Reward' : 'Tambah Reward Baru'}</DialogTitle>
            <DialogDescription>
              Simpan hal menyenangkan untuk dinikmati setelah tugas selesai
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nama_kesenangan">Nama Kesenangan *</Label>
              <Input
                id="nama_kesenangan"
                placeholder="Contoh: Nonton film bioskop, makan di resto favorit, beli game baru..."
                value={editDialog.entry?.nama_kesenangan || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, nama_kesenangan: e.target.value } : null })}
                required
              />
            </div>

            <Select
              value={editDialog.entry?.kategori || 'hiburan'}
              onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, kategori: value as KategoriKey } : null })}
            >
              <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>
                {KATEGORI_OPTIONS.map(k => <SelectItem key={k.value} value={k.value}>{k.icon} {k.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={editDialog.entry?.prioritas || 'sedang'}
              onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, prioritas: value as PrioritasKey } : null })}
            >
              <SelectTrigger><SelectValue placeholder="Prioritas" /></SelectTrigger>
              <SelectContent>
                {PRIORITAS_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={editDialog.entry?.status || 'ditunda'}
              onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, status: value as StatusKey } : null })}
            >
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}><s.icon className="mr-2 h-4 w-4" /> {s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <Label htmlFor="target_selesai">Target Selesai (opsional)</Label>
              <Input
                id="target_selesai"
                type="date"
                value={editDialog.entry?.target_selesai || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, target_selesai: e.target.value } : null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="syarat_claim">Syarat Claim (opsional)</Label>
              <Input
                id="syarat_claim"
                placeholder="Contoh: Selesai 5 tugas P1, selesai laporan bulanan, streak sholat 7 hari..."
                value={editDialog.entry?.syarat_claim || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, syarat_claim: e.target.value } : null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catatan">Catatan (opsional)</Label>
              <Textarea
                id="catatan"
                placeholder="Detail tambahan, motivasi, atau hal lain..."
                value={editDialog.entry?.catatan || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, catatan: e.target.value } : null })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, entry: null })}>Batal</Button>
              <Button onClick={() => handleEditSubmit(editDialog.entry)}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}