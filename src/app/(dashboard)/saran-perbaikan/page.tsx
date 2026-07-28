"use client"

import { useState } from 'react'
import { format, subDays, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, RotateCcw, Lightbulb, Plus, Edit, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSaranPerbaikan, useSaranPerbaikanRange, useUpsertSaranPerbaikan, useUpdateSaranPerbaikanStatus, useDeleteSaranPerbaikan } from '@/hooks/useSaranPerbaikan'
import { useSaranPerbaikanRealtime } from '@/hooks/useRealtime'

interface SaranData {
  id: string
  tanggal: string
  hari: string
  saran: string
  keterangan: string | null
  status: 'belum' | 'proses' | 'selesai'
  created_at: string
}

export default function SaranPerbaikanPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SaranData | null>(null)

  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  // Get single date data for today's form
  const { data: todayData, isLoading, error, refetch } = useSaranPerbaikan(dateKey)
  // Get weekly data for stats and list
  const weekStart = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const { data: saranList = [], isLoading: isLoadingWeekly } = useSaranPerbaikanRange(weekStart, weekEnd)

  const upsertSaran = useUpsertSaranPerbaikan()
  const updateSaranStatus = useUpdateSaranPerbaikanStatus()
  const deleteSaran = useDeleteSaranPerbaikan()

  // Subscribe to realtime updates - use saran_perbaikan (table name) for queryKey
  useSaranPerbaikanRealtime([['saran_perbaikan']])

  const filteredList = saranList.filter((s: SaranData) => s.tanggal === dateKey)

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }
  const goToToday = () => setCurrentDate(new Date())

  const handleSubmit = async (data: { saran: string; keterangan: string; status: 'belum' | 'proses' | 'selesai' }) => {
    if (editingItem) {
      await upsertSaran.mutateAsync({
        ...data,
        tanggal: dateKey,
        hari: format(currentDate, 'EEEE', { locale: id }),
      })
    } else {
      await upsertSaran.mutateAsync({
        ...data,
        tanggal: dateKey,
        hari: format(currentDate, 'EEEE', { locale: id }),
      })
    }
    setIsFormOpen(false)
    setEditingItem(null)
    refetch()
  }

  const handleEdit = (item: SaranData) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus?')) {
      await deleteSaran.mutateAsync(id)
      refetch()
    }
  }

  const handleStatusChange = async (id: string, status: 'belum' | 'proses' | 'selesai') => {
    await updateSaranStatus.mutateAsync({ id, status })
    refetch()
  }

  const STATUS_LABELS = { belum: 'Belum', proses: 'Proses', selesai: 'Selesai' }
  const STATUS_COLORS = { belum: 'bg-gray-100 text-gray-800', proses: 'bg-yellow-100 text-yellow-800', selesai: 'bg-green-100 text-green-800' }
  const STATUS_ICONS = { belum: AlertTriangle, proses: Clock, selesai: CheckCircle2 }

  const getStatusIcon = (status: 'belum' | 'proses' | 'selesai') => {
    const Icon = STATUS_ICONS[status]
    return <Icon className="inline h-3 w-3 mr-1" />
  }

  return (
    <div className="space-y-6">
      {/* Removed duplicate header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Saran Perbaikan
          </h1>
          <p className="text-muted-foreground">Catat saran perbaikan dan lacak progresnya</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Saran
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Saran' : 'Tambah Saran Baru'}</DialogTitle>
              </DialogHeader>
              <SaranForm
                initialData={editingItem}
                onSubmit={handleSubmit}
                onCancel={() => { setIsFormOpen(false); setEditingItem(null); }}
              />
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium whitespace-nowrap">{format(currentDate, 'EEEE, d MMMM yyyy', { locale: id })}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateDay('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && <Button variant="ghost" size="icon" onClick={goToToday}><RotateCcw className="h-4 w-4" /></Button>}
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></CardContent></Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            <p>Gagal memuat data: {error.message}</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-2">Coba Lagi</Button>
          </CardContent>
        </Card>
      ) : filteredList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Belum ada saran perbaikan hari ini</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item: SaranData) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold">{item.saran}</h3>
                      <Badge variant="outline" className={cn(STATUS_COLORS[item.status])}>
                        {getStatusIcon(item.status)}
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </div>
                    {item.keterangan && <p className="text-sm text-muted-foreground mb-2">{item.keterangan}</p>}
                    <div className="flex items-center gap-2">
                      <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v as 'belum' | 'proses' | 'selesai')}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="belum">Belum</SelectItem>
                          <SelectItem value="proses">Proses</SelectItem>
                          <SelectItem value="selesai">Selesai</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <Card>
        <CardHeader><CardTitle>Statistik Minggu Ini</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 bg-green-500/10 rounded-xl">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{saranList.filter((s: SaranData) => s.status === 'selesai').length}</p>
              <p className="text-sm text-muted-foreground">Selesai</p>
            </div>
            <div className="text-center p-4 bg-yellow-500/10 rounded-xl">
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{saranList.filter((s: SaranData) => s.status === 'proses').length}</p>
              <p className="text-sm text-muted-foreground">Proses</p>
            </div>
            <div className="text-center p-4 bg-gray-500/10 rounded-xl">
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{saranList.filter((s: SaranData) => s.status === 'belum').length}</p>
              <p className="text-sm text-muted-foreground">Belum</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SaranForm({ initialData, onSubmit, onCancel }: { initialData: SaranData | null; onSubmit: (data: any) => void; onCancel: () => void }) {
  const [saran, setSaran] = useState(initialData?.saran || '')
  const [keterangan, setKeterangan] = useState(initialData?.keterangan || '')
  const [status, setStatus] = useState<'belum' | 'proses' | 'selesai'>(initialData?.status || 'belum')

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ saran, keterangan, status }); }} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="saran">Saran Perbaikan *</Label>
        <Textarea id="saran" placeholder="Tulis saran perbaikan..." value={saran} onChange={e => setSaran(e.target.value)} required rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="keterangan">Keterangan (opsional)</Label>
        <Textarea id="keterangan" placeholder="Detail langkah atau catatan..." value={keterangan} onChange={e => setKeterangan(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as 'belum' | 'proses' | 'selesai')}>
          <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="belum">Belum</SelectItem>
            <SelectItem value="proses">Proses</SelectItem>
            <SelectItem value="selesai">Selesai</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button type="submit">{initialData ? 'Update' : 'Simpan'}</Button>
      </div>
    </form>
  )
}