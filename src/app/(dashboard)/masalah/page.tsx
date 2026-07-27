"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, RotateCcw, AlertTriangle, CheckCircle2, Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useMasalah, useMasalahRange, useUpsertMasalah, useUpdateMasalahStatus, useDeleteMasalah } from '@/hooks/useMasalah'
import { useMasalahRealtime } from '@/hooks/useRealtime'

interface MasalahData {
  id: string
  user_id: string
  tanggal: string
  hari: string
  masalah: string
  solusi: string | null
  status: 'belum' | 'sudah'
  created_at: string
  updated_at: string
}

export default function MasalahPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MasalahData | null>(null)

  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: masalahData, isLoading, error, refetch } = useMasalah(dateKey)
  const upsertMasalah = useUpsertMasalah()
  const updateMasalahStatus = useUpdateMasalahStatus()
  const deleteMasalah = useDeleteMasalah()

  // Subscribe to realtime updates
  useMasalahRealtime([['masalah', dateKey]])

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }
  const goToToday = () => setCurrentDate(new Date())

  const handleSubmit = async (data: { masalah: string; solusi: string; status: 'belum' | 'sudah' }) => {
    if (editingItem) {
      // Update existing - use upsert
      await upsertMasalah.mutateAsync({
        tanggal: dateKey,
        hari: format(currentDate, 'EEEE', { locale: id }),
        ...data,
      })
    } else {
      // Create new - use upsert
      await upsertMasalah.mutateAsync({
        tanggal: dateKey,
        hari: format(currentDate, 'EEEE', { locale: id }),
        ...data,
      })
    }
    setIsFormOpen(false)
    setEditingItem(null)
    refetch()
  }

  const handleEdit = (item: MasalahData) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus?')) {
      await deleteMasalah.mutateAsync(id)
      refetch()
    }
  }

  const handleStatusChange = async (id: string, status: 'belum' | 'sudah') => {
    await updateMasalahStatus.mutateAsync({ id, status })
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Masalah & Solusi
          </h1>
          <p className="text-muted-foreground">Catat masalah dan solusi harian</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Masalah' : 'Tambah Masalah'}</DialogTitle>
              </DialogHeader>
              <MasalahForm
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
      ) : !masalahData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Belum ada masalah hari ini</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold">{masalahData.masalah}</h3>
                  <Badge variant={masalahData.status === 'sudah' ? 'default' : 'outline'} className={cn(masalahData.status === 'sudah' && 'bg-green-500')}>
                    {masalahData.status === 'sudah' ? 'Sudah' : 'Belum'}
                  </Badge>
                </div>
                {masalahData.solusi && <p className="text-sm text-muted-foreground mb-2">Solusi: {masalahData.solusi}</p>}
                <div className="flex items-center gap-2">
                  <Select value={masalahData.status} onValueChange={(v) => handleStatusChange(masalahData.id, v as 'belum' | 'sudah')}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="belum">Belum</SelectItem>
                      <SelectItem value="sudah">Sudah</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(masalahData)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(masalahData.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MasalahForm({ initialData, onSubmit, onCancel }: { initialData: MasalahData | null; onSubmit: (data: any) => void; onCancel: () => void }) {
  const [masalah, setMasalah] = useState(initialData?.masalah || '')
  const [solusi, setSolusi] = useState(initialData?.solusi || '')
  const [status, setStatus] = useState<'belum' | 'sudah'>(initialData?.status || 'belum')

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ masalah, solusi, status }); }} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="masalah">Masalah *</Label>
        <Textarea id="masalah" placeholder="Tulis masalah Anda..." value={masalah} onChange={e => setMasalah(e.target.value)} required rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="solusi">Solusi</Label>
        <Textarea id="solusi" placeholder="Tulis solusi atau rencana tindakan..." value={solusi} onChange={e => setSolusi(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as 'belum' | 'sudah')}>
          <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="belum">Belum</SelectItem>
            <SelectItem value="sudah">Sudah</SelectItem>
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