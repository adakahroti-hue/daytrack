"use client"

import { useState, useEffect } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Plus, Edit2, Trash2, Lightbulb, Hammer, Target, CheckCircle2, Flag, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useImprovements, useUpsertImprovement, useUpdateImprovementStatus, useDeleteImprovement } from '@/hooks/useImprovementBacklog'
import { useImprovementBacklogRealtime } from '@/hooks/useRealtime'

const CATEGORY_OPTIONS = [
  { value: 'ibadah', label: 'Ibadah', icon: '🕌' },
  { value: 'mental', label: 'Mental', icon: '🧠' },
  { value: 'kesehatan', label: 'Kesehatan', icon: '🏥' },
  { value: 'produktivitas', label: 'Produktivitas', icon: '⚡' },
  { value: 'finansial', label: 'Finansial', icon: '💰' },
  { value: 'lingkungan', label: 'Lingkungan', icon: '🌱' },
  { value: 'hubungan', label: 'Hubungan', icon: '🤝' },
  { value: 'lainnya', label: 'Lainnya', icon: '📝' },
] as const

const STATUS_OPTIONS = [
  { value: 'ide_baru', label: 'Ide Baru', color: 'bg-gray-500/10 text-gray-700 border-gray-500/30', icon: Lightbulb },
  { value: 'diprioritaskan', label: 'Diprioritaskan', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30', icon: Flag },
  { value: 'sedang_diperbaiki', label: 'Sedang Diperbaiki', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30', icon: Hammer },
  { value: 'menjadi_kebiasaan', label: 'Menjadi Kebiasaan', color: 'bg-green-500/10 text-green-700 border-green-500/30', icon: CheckCircle2 },
] as const

const PRIORITY_OPTIONS = [
  { value: 'rendah', label: 'Rendah', color: 'bg-gray-500/10 text-gray-700 border-gray-500/30' },
  { value: 'sedang', label: 'Sedang', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { value: 'tinggi', label: 'Tinggi', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/10 text-red-700 border-red-500/30' },
] as const

type StatusKey = 'ide_baru' | 'diprioritaskan' | 'sedang_diperbaiki' | 'menjadi_kebiasaan'
type PriorityKey = 'rendah' | 'sedang' | 'tinggi' | 'urgent'
type CategoryKey = 'ibadah' | 'mental' | 'kesehatan' | 'produktivitas' | 'finansial' | 'lingkungan' | 'hubungan' | 'lainnya'

interface ImprovementEntry {
  id: string
  user_id: string
  title: string
  category: CategoryKey
  priority: PriorityKey
  reason: string | null
  status: StatusKey
  target_date: string | null
  started_at: string | null
  completed_at: string | null
  progress: number
  created_at: string
  updated_at: string
}

export default function SaranPerbaikanPage() {
  const [editDialog, setEditDialog] = useState<{ open: boolean; entry: ImprovementEntry | null }>({ open: false, entry: null })
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [focusWeekOpen, setFocusWeekOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const { data: improvements = [], isLoading, error, refetch } = useImprovements(
    filterCategory === 'all' ? undefined : filterCategory,
    filterStatus === 'all' ? undefined : filterStatus
  )
  const upsertImprovement = useUpsertImprovement()
  const updateImprovementStatus = useUpdateImprovementStatus()
  const deleteImprovement = useDeleteImprovement()

  useImprovementBacklogRealtime()

  const handleOpenEdit = (entry: ImprovementEntry | null) => {
    if (entry) {
      setEditDialog({ open: true, entry })
    } else {
      setEditDialog({ 
        open: true, 
        entry: {
          id: '',
          user_id: '',
          title: '',
          category: 'lainnya',
          priority: 'sedang',
          reason: '',
          status: 'ide_baru',
          target_date: null,
          started_at: null,
          completed_at: null,
          progress: 0,
          created_at: '',
          updated_at: '',
        } as ImprovementEntry
      })
    }
  }

  const handleEditSubmit = async (data: any) => {
    await upsertImprovement.mutateAsync({
      title: data.title,
      category: data.category,
      priority: data.priority,
      reason: data.reason || undefined,
      status: data.status,
      target_date: data.target_date || undefined,
      progress: data.progress || 0,
    })
    setEditDialog({ open: false, entry: null })
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus saran perbaikan ini?')) {
      await deleteImprovement.mutateAsync(id)
      refetch()
    }
  }

  const handleStatusChange = async (id: string, status: StatusKey, progress?: number) => {
    await updateImprovementStatus.mutateAsync({ id, status, progress })
    refetch()
  }

  const stats = {
    total: improvements.length,
    ide: improvements.filter(l => l.status === 'ide_baru').length,
    diprioritaskan: improvements.filter(l => l.status === 'diprioritaskan').length,
    diperbaiki: improvements.filter(l => l.status === 'sedang_diperbaiki').length,
    kebiasaan: improvements.filter(l => l.status === 'menjadi_kebiasaan').length,
    tinggi: improvements.filter(l => l.priority === 'tinggi' || l.priority === 'urgent').length,
  }

  const focusWeekItems = improvements
    .filter(l => l.status === 'diprioritaskan' || l.status === 'sedang_diperbaiki')
    .slice(0, 3)

  if (!mounted) {
    return <div className="space-y-6"><div className="h-8 bg-muted animate-pulse rounded w-1/4" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Hammer className="h-5 w-5 text-amber-500" />
            Saran Perbaikan
          </h1>
          <p className="text-sm text-muted-foreground">Catat hal yang ingin diperbaiki dan bangun versi diri yang lebih baik</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFocusWeekOpen(true)}>
            <Target className="mr-2 h-4 w-4" /> Fokus Minggu Ini
          </Button>
          <Button variant="default" onClick={() => handleOpenEdit(null)} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Perbaikan
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Perbaikan</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sedang Dikerjakan</p>
                <p className="text-2xl font-bold text-blue-600">{stats.diperbaiki}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Hammer className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Menjadi Kebiasaan</p>
                <p className="text-2xl font-bold text-green-600">{stats.kebiasaan}</p>
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
                <p className="text-2xl font-bold text-amber-600">{stats.tinggi}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Flag className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fokus Minggu Ini */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" />
            Fokus Minggu Ini
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setFocusWeekOpen(true)} aria-label="Lihat semua">
            <ArrowUp className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {focusWeekItems.length === 0 ? (
            <div className="text-center py-6">
              <Target className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada fokus minggu ini</p>
              <p className="text-xs text-muted-foreground">Pilih perbaikan dengan status "Diprioritaskan" atau "Sedang Diperbaiki"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {focusWeekItems.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{item.title}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                        <Badge variant="outline" className={cn('text-xs', STATUS_OPTIONS.find(s => s.value === item.status)?.color)}>
                          {(() => { const s = STATUS_OPTIONS.find(s => s.value === item.status); return s?.icon ? <s.icon className="inline h-2.5 w-2.5 mr-1" /> : null })()}
                          {STATUS_OPTIONS.find(s => s.value === item.status)?.label}
                        </Badge>
                        <Badge variant="outline" className={cn('text-xs', CATEGORY_OPTIONS.find(c => c.value === item.category)?.icon ? '' : '')}>
                          {CATEGORY_OPTIONS.find(c => c.value === item.category)?.icon} {CATEGORY_OPTIONS.find(c => c.value === item.category)?.label}
                        </Badge>
                        <Badge variant="outline" className={cn('text-xs', PRIORITY_OPTIONS.find(p => p.value === item.priority)?.color)}>
                          {PRIORITY_OPTIONS.find(p => p.value === item.priority)?.label}
                        </Badge>
                      </div>
                      {item.target_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Flag className="inline h-3 w-3 mr-1" /> Target: {format(new Date(item.target_date), 'd MMM', { locale: id })}
                        </p>
                      )}
                    </div>
                    {item.status === 'sedang_diperbaiki' && item.progress > 0 && (
                      <div className="w-24 ml-4">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground text-right">{item.progress}%</p>
                      </div>
                    )}
                    {item.status === 'diprioritaskan' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStatusChange(item.id, 'sedang_diperbaiki', 10)}
                        className="text-xs"
                      >
                        <Hammer className="mr-1 h-3 w-3" /> Mulai
                      </Button>
                    )}
                    {item.status === 'sedang_diperbaiki' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(item.id, 'menjadi_kebiasaan', 100)}
                        className="text-xs"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Selesai
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Button variant={filterStatus === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('all')}>Semua</Button>
          {STATUS_OPTIONS.map(s => (
            <Button key={s.value} variant={filterStatus === s.value ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s.value)}>
              <s.icon className="mr-1 h-3 w-3" /> {s.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Kategori:</span>
          <Button variant={filterCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory('all')}>Semua</Button>
          {CATEGORY_OPTIONS.map(c => (
            <Button key={c.value} variant={filterCategory === c.value ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory(c.value)}>
              {c.icon} {c.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Improvement List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Daftar Perbaikan
            <span className="text-sm font-normal text-muted-foreground">{improvements.length} item</span>
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
          ) : improvements.length === 0 ? (
            <div className="text-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada saran perbaikan</p>
              <p className="text-sm text-muted-foreground mt-1">Mulai catat hal yang ingin Anda perbaiki</p>
              <Button variant="default" className="mt-4 gap-2" onClick={() => handleOpenEdit(null)}>
                <Plus className="h-4 w-4" />
                Tambah Perbaikan Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {STATUS_OPTIONS.map(({ value, label, color, icon: StatusIcon }) => {
                const items = improvements.filter(l => l.status === value)
                if (items.length === 0) return null

                return (
                  <div key={value} className="space-y-3">
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
                                <h4 className="font-semibold truncate">{item.title}</h4>
                                <div className="flex items-center gap-1">
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
                                  {CATEGORY_OPTIONS.find(c => c.value === item.category)?.icon} {CATEGORY_OPTIONS.find(c => c.value === item.category)?.label}
                                </Badge>
                                <Badge variant="outline" className={cn('text-xs', PRIORITY_OPTIONS.find(p => p.value === item.priority)?.color)}>
                                  {PRIORITY_OPTIONS.find(p => p.value === item.priority)?.label}
                                </Badge>
                                {item.target_date && (
                                  <Badge variant="outline" className="text-xs">
                                    <Flag className="h-3 w-3 mr-1" />
                                    {format(new Date(item.target_date), 'd MMM', { locale: id })}
                                  </Badge>
                                )}
                              </div>
                              {item.reason && (
                                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                                  <Lightbulb className="h-3 w-3" />
                                  <span>Alasan: {item.reason}</span>
                                </p>
                              )}
                              {item.status === 'sedang_diperbaiki' && item.progress > 0 && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span>Progress</span>
                                    <span>{item.progress}%</span>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                                  </div>
                                </div>
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
            <DialogTitle>{editDialog.entry?.id ? 'Edit Perbaikan' : 'Tambah Perbaikan Baru'}</DialogTitle>
            <DialogDescription>
              Catat hal yang ingin diperbaiki dan bangun kebiasaan baru
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Judul Perbaikan *</Label>
              <Input
                id="title"
                placeholder="Contoh: Bangun pagi tanpa snooze, kurangi media sosial, olahraga 3x seminggu..."
                value={editDialog.entry?.title || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, title: e.target.value } : null })}
                required
              />
            </div>

            <Select
              value={editDialog.entry?.category || 'lainnya'}
              onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, category: value as CategoryKey } : null })}
            >
              <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={editDialog.entry?.priority || 'sedang'}
              onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, priority: value as PriorityKey } : null })}
            >
              <SelectTrigger><SelectValue placeholder="Prioritas" /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={editDialog.entry?.status || 'ide_baru'}
              onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, status: value as StatusKey } : null })}
            >
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}><s.icon className="mr-2 h-4 w-4" /> {s.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <Label htmlFor="reason">Alasan / Motivasi</Label>
              <Textarea
                id="reason"
                placeholder="Mengapa ini penting untuk Anda? (opsional)"
                value={editDialog.entry?.reason || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, reason: e.target.value } : null })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_date">Target Tanggal (opsional)</Label>
              <Input
                id="target_date"
                type="date"
                value={editDialog.entry?.target_date || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, target_date: e.target.value } : null })}
              />
            </div>

            {(editDialog.entry?.status === 'sedang_diperbaiki' || editDialog.entry?.status === 'diprioritaskan') && (
              <div className="space-y-2">
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={editDialog.entry?.progress?.toString() || '0'}
                  onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, progress: parseInt(e.target.value) || 0 } : null })}
                  className="w-[100px]"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, entry: null })}>Batal</Button>
              <Button onClick={() => handleEditSubmit(editDialog.entry)}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Focus Week Dialog */}
      <Dialog open={focusWeekOpen} onOpenChange={(open) => setFocusWeekOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              Fokus Minggu Ini
            </DialogTitle>
            <DialogDescription>
              Pilih 3 perbaikan utama yang akan dikerjakan minggu ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {improvements.filter(l => l.status === 'ide_baru').length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Belum ada ide baru untuk dipilih</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {improvements.filter(l => l.status === 'ide_baru').map((item) => (
                  <div key={item.id} className="p-3 rounded-xl border border-muted/50 hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => handleStatusChange(item.id, 'diprioritaskan', 0)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.title}</h4>
                        <div className="flex flex-wrap gap-1.5 mt-1 text-xs">
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_OPTIONS.find(c => c.value === item.category)?.icon} {CATEGORY_OPTIONS.find(c => c.value === item.category)?.label}
                          </Badge>
                          <Badge variant="outline" className={cn('text-xs', PRIORITY_OPTIONS.find(p => p.value === item.priority)?.color)}>
                            {PRIORITY_OPTIONS.find(p => p.value === item.priority)?.label}
                          </Badge>
                        </div>
                      </div>
                      <ArrowUp className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {focusWeekItems.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Sudah dipilih ({focusWeekItems.length}/3):</h4>
                <div className="space-y-2">
                  {focusWeekItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.title}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStatusChange(item.id, 'ide_baru', 0)}>
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}