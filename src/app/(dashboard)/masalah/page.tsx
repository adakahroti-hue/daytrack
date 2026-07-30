"use client"

import { useState, useEffect } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, CheckCircle2, Plus, Edit2, Trash2, HelpCircle, Clock, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useMasalahLog, useMasalahLogRange, useUpsertMasalahLog, useDeleteMasalahLog } from '@/hooks/useMasalahLogs'
import { useMasalahLogRealtime } from '@/hooks/useRealtime'

const KATEGORI_OPTIONS = [
  { value: 'pekerjaan', label: 'Pekerjaan', icon: '💼' },
  { value: 'personal', label: 'Personal', icon: '👤' },
  { value: 'kesehatan', label: 'Kesehatan', icon: '🏥' },
  { value: 'keuangan', label: 'Keuangan', icon: '💰' },
  { value: 'hubungan', label: 'Hubungan', icon: '🤝' },
  { value: 'lainnya', label: 'Lainnya', icon: '📝' },
] as const

const PRIORITAS_OPTIONS = [
  { value: 'rendah', label: 'Rendah', color: 'bg-gray-500/10 text-gray-700 border-gray-500/30' },
  { value: 'sedang', label: 'Sedang', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { value: 'tinggi', label: 'Tinggi', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
] as const

const STATUS_OPTIONS = [
  { value: 'belum', label: 'Belum', color: 'bg-gray-500/10 text-gray-700 border-gray-500/30', icon: AlertTriangle },
  { value: 'proses', label: 'Proses', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30', icon: Clock },
  { value: 'selesai', label: 'Selesai', color: 'bg-green-500/10 text-green-700 border-green-500/30', icon: CheckCircle2 },
] as const

type StatusKey = 'belum' | 'proses' | 'selesai'
type PrioritasKey = 'rendah' | 'sedang' | 'tinggi'
type KategoriKey = 'pekerjaan' | 'personal' | 'kesehatan' | 'keuangan' | 'hubungan' | 'lainnya'

interface MasalahLogEntry {
  id: string
  user_id: string
  tanggal: string
  masalah: string
  kategori: KategoriKey | null
  solusi: string | null
  status: StatusKey
  prioritas: PrioritasKey
  catatan: string | null
  created_at: string
  updated_at: string
}

export default function MasalahPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editDialog, setEditDialog] = useState<{ open: boolean; entry: MasalahLogEntry | null }>({ open: false, entry: null })
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const { data: masalahLogs = [], isLoading, error, refetch } = useMasalahLog(dateKey)
  const { data: weeklyLogs = [] } = useMasalahLogRange(
    format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const upsertMasalahLog = useUpsertMasalahLog()
  const deleteMasalahLog = useDeleteMasalahLog()

  useMasalahLogRealtime(dateKey)

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleOpenEdit = (entry: MasalahLogEntry | null) => {
    if (entry) {
      setEditDialog({ open: true, entry })
    } else {
      setEditDialog({ 
        open: true, 
        entry: {
          id: '',
          user_id: '',
          tanggal: dateKey,
          masalah: '',
          kategori: 'personal',
          solusi: '',
          status: 'belum',
          prioritas: 'sedang',
          catatan: '',
          created_at: '',
          updated_at: '',
        } as MasalahLogEntry
      })
    }
  }

  const handleEditSubmit = async (data: any) => {
    await upsertMasalahLog.mutateAsync({
      tanggal: dateKey,
      masalah: data.masalah,
      kategori: data.kategori,
      solusi: data.solusi || undefined,
      status: data.status,
      prioritas: data.prioritas,
      catatan: data.catatan || undefined,
    })
    setEditDialog({ open: false, entry: null })
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus catatan masalah ini?')) {
      await deleteMasalahLog.mutateAsync(id)
      refetch()
    }
  }

  const handleStatusChange = async (id: string, status: StatusKey) => {
    const existing = masalahLogs.find(l => l.id === id)
    await upsertMasalahLog.mutateAsync({
      tanggal: dateKey,
      masalah: existing?.masalah || '',
      kategori: existing?.kategori || 'personal',
      solusi: existing?.solusi || undefined,
      status,
      prioritas: existing?.prioritas || 'sedang',
      catatan: existing?.catatan || undefined,
    })
    refetch()
  }

  if (!mounted) {
    return <div className="space-y-6"><div className="h-8 bg-muted animate-pulse rounded w-1/4" /></div>
  }

  // Group by status
  const groupedLogs = {
    belum: masalahLogs.filter(l => l.status === 'belum'),
    proses: masalahLogs.filter(l => l.status === 'proses'),
    selesai: masalahLogs.filter(l => l.status === 'selesai'),
  }

  const totalBelum = groupedLogs.belum.length
  const totalProses = groupedLogs.proses.length
  const totalSelesai = groupedLogs.selesai.length
  const totalTinggi = masalahLogs.filter(l => l.prioritas === 'tinggi').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Masalah</h1>
          <p className="text-sm text-muted-foreground">Catat tantangan dan temukan solusi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDay('prev')} aria-label="Hari sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday} className="px-3" disabled={isToday}>
            <Calendar className="h-4 w-4 mr-2" /> {format(currentDate, 'd MMMM yyyy', { locale: id })}
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDay('next')} aria-label="Hari berikutnya">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Belum Diselesaikan</p>
                <p className="text-2xl font-bold text-red-600">{totalBelum}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sedang Diproses</p>
                <p className="text-2xl font-bold text-yellow-600">{totalProses}</p>
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
                <p className="text-sm text-muted-foreground">Sudah Selesai</p>
                <p className="text-2xl font-bold text-green-600">{totalSelesai}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prioritas Tinggi</p>
                <p className="text-2xl font-bold text-amber-600">{totalTinggi}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Flag className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Masalah List by Status */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Masalah Hari Ini</CardTitle>
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
          ) : masalahLogs.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada masalah hari ini</p>
              <p className="text-sm text-muted-foreground mt-1">Tambahkan masalah untuk mulai melacak solusi</p>
              <Button variant="default" className="mt-4 gap-2" onClick={() => handleOpenEdit(null)}>
                <Plus className="h-4 w-4" />
                Tambah Masalah
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {STATUS_OPTIONS.map(({ value, label, color, icon: StatusIcon }) => {
                const logs = groupedLogs[value as StatusKey]
                if (logs.length === 0) return null

                return (
                  <div key={value} className="space-y-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <StatusIcon className="h-4 w-4" />
                      {label} ({logs.length})
                    </h3>
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div key={log.id} className={cn('p-4 rounded-xl border', color, 'border-l-4')}>
                          <div className="flex gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-semibold truncate">{log.masalah}</h4>
                                <div className="flex items-center gap-1">
                                  {log.prioritas === 'tinggi' && (
                                    <Flag className="h-3 w-3 text-amber-600" />
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(log)} aria-label="Edit">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(log.id)} aria-label="Hapus">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className={cn('text-xs', log.kategori ? color : '')}>
                                  {KATEGORI_OPTIONS.find(k => k.value === log.kategori)?.icon} {KATEGORI_OPTIONS.find(k => k.value === log.kategori)?.label || log.kategori}
                                </Badge>
                                <Badge variant="outline" className="text-xs">{PRIORITAS_OPTIONS.find(p => p.value === log.prioritas)?.label}</Badge>
                              </div>
                              {log.solusi && (
                                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  <span>Solusi: {log.solusi}</span>
                                </p>
                              )}
                              {log.catatan && (
                                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                  <HelpCircle className="h-3 w-3" />
                                  <span>{log.catatan}</span>
                                </p>
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

      {/* Weekly History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Minggu Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Tanggal</th>
                  <th className="pb-2 font-medium">Masalah</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                  <th className="pb-2 font-medium">Kategori</th>
                  <th className="pb-2 font-medium">Prioritas</th>
                  <th className="pb-2 font-medium">Solusi</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 7 }, (_, i) => {
                  const date = subDays(endOfWeek(currentDate, { weekStartsOn: 1 }), i)
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const dayLogs = weeklyLogs.filter(log => log.tanggal === dateStr)
                  
                  return (
                    <tr key={dateStr} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 font-medium">{format(date, 'd MMM', { locale: id })}</td>
                      <td className="py-2 max-w-xs truncate">
                        {dayLogs.map(l => <span key={l.id} className="block truncate">{l.masalah}</span>).join(', ') || '—'}
                      </td>
                      <td className="py-2 text-center">
                        {dayLogs.length > 0 ? (
                          <div className="flex justify-center gap-1">
                            {dayLogs.map(l => {
                              const statusConfig = STATUS_OPTIONS.find(s => s.value === l.status)
                              if (!statusConfig) return null
                              return (
                                <Badge key={l.id} variant="outline" className={cn('text-xs', statusConfig.color)}>
                                  <statusConfig.icon className="inline h-2.5 w-2.5 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        {dayLogs[0]?.kategori ? (
                          <Badge variant="outline" className="text-xs">
                            {KATEGORI_OPTIONS.find(k => k.value === dayLogs[0].kategori)?.icon} {KATEGORI_OPTIONS.find(k => k.value === dayLogs[0].kategori)?.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        {dayLogs[0]?.prioritas && (
                          <Badge variant="outline" className={cn('text-xs', PRIORITAS_OPTIONS.find(p => p.value === dayLogs[0].prioritas)?.color)}>
                            {PRIORITAS_OPTIONS.find(p => p.value === dayLogs[0].prioritas)?.label}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground max-w-xs truncate">
                        {dayLogs.find(l => l.solusi)?.solusi || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, entry: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.entry?.id ? 'Edit Masalah' : 'Tambah Masalah Baru'}</DialogTitle>
            <DialogDescription>
              Catat tantangan dan rencanakan solusinya
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="masalah">Masalah *</Label>
              <Textarea
                id="masalah"
                placeholder="Tulis masalah yang Anda hadapi..."
                value={editDialog.entry?.masalah || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, masalah: e.target.value } : null })}
                required
                rows={3}
              />
            </div>

            <Select
              value={editDialog.entry?.kategori || 'personal'}
              onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, kategori: value as KategoriKey } : null })}
            >
              <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>
                {KATEGORI_OPTIONS.map(k => (
                  <SelectItem key={k.value} value={k.value}>{k.icon} {k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={editDialog.entry?.prioritas || 'sedang'}
              onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, prioritas: value as PrioritasKey } : null })}
            >
              <SelectTrigger><SelectValue placeholder="Prioritas" /></SelectTrigger>
              <SelectContent>
                {PRIORITAS_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={editDialog.entry?.status || 'belum'}
              onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, status: value as StatusKey } : null })}
            >
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <Label htmlFor="solusi">Solusi / Rencana Tindakan</Label>
              <Textarea
                id="solusi"
                placeholder="Tulis solusi atau langkah yang akan diambil..."
                value={editDialog.entry?.solusi || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, solusi: e.target.value } : null })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catatan">Catatan Tambahan (opsional)</Label>
              <Textarea
                id="catatan"
                placeholder="Detail tambahan, perasaan, atau hal lain..."
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