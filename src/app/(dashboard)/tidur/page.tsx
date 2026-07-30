"use client"

import { useState, useEffect } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Moon, Sun, CheckCircle2, AlertTriangle, Plus, Edit2, Trash2, Flame, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useTidurLog, useTidurLogRange, useTidurStats, useUpsertTidurLog, useDeleteTidurLog } from '@/hooks/useTidurLogs'
import { useTidurLogRealtime } from '@/hooks/useRealtime'

const STATUS_OPTIONS = [
  { value: 'tepat', label: 'Tepat Waktu', icon: Moon },
  { value: 'begadang', label: 'Begadang', icon: Zap },
] as const

const KUALITAS_LABELS = ['', 'Sangat Kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat Baik']
const ALASAN_OPTIONS = [
  { value: 'sibuk', label: 'Sibuk' },
  { value: 'insomnia', label: 'Insomnia' },
  { value: 'malam_minggu', label: 'Malam Minggu' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

type StatusKey = 'tepat' | 'begadang'
type AlasanKey = 'sibuk' | 'insomnia' | 'malam_minggu' | 'lainnya'

interface TidurLogEntry {
  id: string
  user_id: string
  tanggal: string
  status: StatusKey
  jam_tidur: string | null
  jam_bangun: string | null
  durasi_jam: number | null
  kualitas: number | null
  catatan: string | null
  alasan_tidak: AlasanKey | null
  created_at: string
  updated_at: string
}

export default function TidurPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editDialog, setEditDialog] = useState<{ open: boolean; entry: TidurLogEntry | null }>({ open: false, entry: null })
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const { data: tidurLog, isLoading, error, refetch } = useTidurLog(dateKey)
  const { data: weeklyLogs = [] } = useTidurLogRange(
    format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const { data: stats } = useTidurStats(
    format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const upsertTidurLog = useUpsertTidurLog()
  const deleteTidurLog = useDeleteTidurLog()

  useTidurLogRealtime(dateKey)

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleOpenEdit = (entry: TidurLogEntry | null) => {
    if (entry) {
      setEditDialog({ open: true, entry })
    } else {
      setEditDialog({ 
        open: true, 
        entry: {
          id: '',
          user_id: '',
          tanggal: dateKey,
          status: 'tepat',
          jam_tidur: '22:00',
          jam_bangun: '05:00',
          durasi_jam: null,
          kualitas: null,
          catatan: '',
          alasan_tidak: null,
          created_at: '',
          updated_at: '',
        } as TidurLogEntry
      })
    }
  }

  const handleEditSubmit = async (data: any) => {
    const jamTidur = data.status === 'tepat' ? data.jam_tidur : undefined
    const jamBangun = data.status === 'tepat' ? data.jam_bangun : undefined
    
    await upsertTidurLog.mutateAsync({
      tanggal: dateKey,
      status: data.status,
      jam_tidur: jamTidur,
      jam_bangun: jamBangun,
      kualitas: data.kualitas || undefined,
      catatan: data.catatan || undefined,
      alasan_tidak: data.alasan_tidak || undefined,
    })
    setEditDialog({ open: false, entry: null })
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus catatan tidur ini?')) {
      await deleteTidurLog.mutateAsync(id)
      refetch()
    }
  }

  if (!mounted) {
    return <div className="space-y-6"><div className="h-8 bg-muted animate-pulse rounded w-1/4" /></div>
  }

  const isDone = !!tidurLog

  const calculateStreak = () => {
    let streak = 0
    const sortedDates = [...new Set(weeklyLogs.map(log => log.tanggal))].sort((a, b) => b.localeCompare(a))
    for (const date of sortedDates) {
      const dayLog = weeklyLogs.find(log => log.tanggal === date)
      if (dayLog?.status === 'tepat') streak++
      else break
    }
    return streak
  }

  const streak = calculateStreak()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Tidur</h1>
          <p className="text-sm text-muted-foreground">Pantau pola tidur Anda</p>
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

      {/* Sleep Summary Card */}
      <Card>
        <CardContent className="p-6">
          {isDone && tidurLog ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center',
                  tidurLog.status === 'tepat' ? 'bg-green-500/10' : 'bg-amber-500/10'
                )}>
                  {tidurLog.status === 'tepat' ? (
                    <Moon className="h-8 w-8 text-green-600" />
                  ) : (
                    <Zap className="h-8 w-8 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tidur hari ini</p>
                  <p className="text-3xl font-bold capitalize">{tidurLog.status === 'tepat' ? 'Tepat Waktu' : 'Begadang'}</p>
                </div>
              </div>
              <div className="w-full sm:w-80 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-2xl font-bold">{tidurLog.jam_tidur ? `${tidurLog.jam_tidur} - ${tidurLog.jam_bangun}` : '—'}</p>
                    <p className="text-xs text-muted-foreground">Jam Tidur</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-2xl font-bold">{tidurLog.durasi_jam ? `${tidurLog.durasi_jam} jam` : '—'}</p>
                    <p className="text-xs text-muted-foreground">Durasi</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-2xl font-bold">{tidurLog.kualitas ? KUALITAS_LABELS[tidurLog.kualitas] : '—'}</p>
                    <p className="text-xs text-muted-foreground">Kualitas</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Streak Tepat Waktu</span>
                    <span className="font-semibold">{streak} hari</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(streak * 10, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Moon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">Belum ada catatan tidur hari ini</p>
              <p className="text-sm text-muted-foreground mt-1">Catat jam tidur untuk melihat pola Anda</p>
              <Button 
                variant="default" 
                className="mt-4 gap-2"
                onClick={() => handleOpenEdit(null)}
              >
                <Plus className="h-4 w-4" />
                Mulai Mencatat
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sleep Detail Card */}
      {isDone && tidurLog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Detail Tidur
              <span className="text-sm font-normal text-muted-foreground capitalize">
                {format(currentDate, 'EEEE', { locale: id })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Badge 
                  variant={tidurLog.status === 'tepat' ? 'default' : 'outline'} 
                  className={cn(
                    'w-full py-3 text-base',
                    tidurLog.status === 'tepat' ? 'bg-green-500 text-green-foreground' : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                  )}
                >
                  {tidurLog.status === 'tepat' ? <Moon className="mr-1 h-3 w-3" /> : <Zap className="mr-1 h-3 w-3" />}
                  {tidurLog.status === 'tepat' ? 'Tepat Waktu' : 'Begadang'}
                </Badge>
              </div>
              <div>
                <Label>Kualitas Tidur</Label>
                <Select value={tidurLog.kualitas?.toString() || '1'} onValueChange={(v) => handleEditSubmit({ ...tidurLog, kualitas: parseInt(v) })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kualitas" /></SelectTrigger>
                  <SelectContent>
                    {KUALITAS_LABELS.slice(1).map((label, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1} - {label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tidurLog.status === 'tepat' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Jam Tidur</Label>
                  <Input type="time" value={tidurLog.jam_tidur || '22:00'} onChange={(e) => handleEditSubmit({ ...tidurLog, jam_tidur: e.target.value })} />
                </div>
                <div>
                  <Label>Jam Bangun</Label>
                  <Input type="time" value={tidurLog.jam_bangun || '05:00'} onChange={(e) => handleEditSubmit({ ...tidurLog, jam_bangun: e.target.value })} />
                </div>
              </div>
            )}

            {tidurLog.status === 'begadang' && (
              <div>
                <Label>Alasan Begadang</Label>
                <Select value={tidurLog.alasan_tidak || 'sibuk'} onValueChange={(v) => handleEditSubmit({ ...tidurLog, alasan_tidak: v as AlasanKey })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih alasan" /></SelectTrigger>
                  <SelectContent>
                    {ALASAN_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Catatan</Label>
              <Textarea
                value={tidurLog.catatan || ''}
                onChange={(e) => handleEditSubmit({ ...tidurLog, catatan: e.target.value })}
                placeholder="Catatan: perasaan pagi ini, mimpi, gangguan tidur..."
                rows={3}
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => handleDelete(tidurLog.id)} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Entry Card (when not done) */}
      {!isDone && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Catatan Tidur</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="default" 
              className="w-full gap-2 py-4"
              onClick={() => handleOpenEdit(null)}
            >
              <Plus className="h-5 w-5" />
              <span>Mulai Mencatat Tidur</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, entry: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.entry?.id ? 'Edit Catatan Tidur' : 'Tambah Catatan Tidur'}</DialogTitle>
            <DialogDescription>
              Catat jam tidur dan bangun untuk melacak pola tidur Anda
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select
              value={editDialog.entry?.status || 'tepat'}
              onValueChange={(value) => setEditDialog({ 
                open: true, 
                entry: editDialog.entry ? { ...editDialog.entry, status: value as StatusKey } : null 
              })}
            >
              <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tepat"><Moon className="mr-2 h-4 w-4" /> Tepat Waktu</SelectItem>
                <SelectItem value="begadang"><Zap className="mr-2 h-4 w-4" /> Begadang</SelectItem>
              </SelectContent>
            </Select>

            {(editDialog.entry?.status || 'tepat') === 'tepat' && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label>Jam Tidur</Label>
                    <Input type="time" value={editDialog.entry?.jam_tidur || '22:00'} onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, jam_tidur: e.target.value } : null })} />
                  </div>
                  <div>
                    <Label>Jam Bangun</Label>
                    <Input type="time" value={editDialog.entry?.jam_bangun || '05:00'} onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, jam_bangun: e.target.value } : null })} />
                  </div>
                </div>
                <Select
                  value={editDialog.entry?.kualitas?.toString() || '3'}
                  onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, kualitas: parseInt(value) } : null })}
                >
                  <SelectTrigger><SelectValue placeholder="Kualitas tidur" /></SelectTrigger>
                  <SelectContent>
                    {KUALITAS_LABELS.slice(1).map((label, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1} - {label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}

            {(editDialog.entry?.status || 'tepat') === 'begadang' && (
              <Select
                value={editDialog.entry?.alasan_tidak || 'sibuk'}
                onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, alasan_tidak: value as AlasanKey } : null })}
              >
                <SelectTrigger><SelectValue placeholder="Alasan begadang" /></SelectTrigger>
                <SelectContent>
                  {ALASAN_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <div>
              <Label>Catatan (opsional)</Label>
              <Textarea
                value={editDialog.entry?.catatan || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, catatan: e.target.value } : null })}
                placeholder="Perasaan pagi ini, mimpi, gangguan tidur..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, entry: null })}>Batal</Button>
              <Button onClick={() => handleEditSubmit(editDialog.entry)}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <th className="pb-2 font-medium text-center">Status</th>
                  <th className="pb-2 font-medium">Jam Tidur</th>
                  <th className="pb-2 font-medium">Durasi</th>
                  <th className="pb-2 font-medium">Kualitas</th>
                  <th className="pb-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 7 }, (_, i) => {
                  const date = subDays(endOfWeek(currentDate, { weekStartsOn: 1 }), i)
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const dayLog = weeklyLogs.find(log => log.tanggal === dateStr)
                  
                  return (
                    <tr key={dateStr} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 font-medium">{format(date, 'd MMM', { locale: id })}</td>
                      <td className="py-2 text-center">
                        {dayLog ? (
                          <Badge 
                            variant={dayLog.status === 'tepat' ? 'default' : 'outline'} 
                            className={cn(
                              dayLog.status === 'tepat' ? 'bg-green-500/10 text-green-700 border-green-500/30' : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                            )}
                          >
                            {dayLog.status === 'tepat' ? <Moon className="mr-1 h-3 w-3" /> : <Zap className="mr-1 h-3 w-3" />}
                            {dayLog.status === 'tepat' ? 'Tepat' : 'Begadang'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2">{dayLog?.jam_tidur && dayLog?.jam_bangun ? `${dayLog.jam_tidur} - ${dayLog.jam_bangun}` : '—'}</td>
                      <td className="py-2">{dayLog?.durasi_jam ? `${dayLog.durasi_jam} jam` : '—'}</td>
                      <td className="py-2">{dayLog?.kualitas ? KUALITAS_LABELS[dayLog.kualitas] : '—'}</td>
                      <td className="py-2 text-muted-foreground max-w-xs truncate">{dayLog?.catatan || dayLog?.alasan_tidak ? ALASAN_OPTIONS.find(a => a.value === dayLog.alasan_tidak)?.label : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Weekly Stats */}
          {stats && (
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <div className="text-center p-4 bg-green-500/10 rounded-xl">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.tepat}</p>
                <p className="text-sm text-muted-foreground">Tepat Waktu</p>
              </div>
              <div className="text-center p-4 bg-amber-500/10 rounded-xl">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.begadang}</p>
                <p className="text-sm text-muted-foreground">Begadang</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-xl">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.avgDurasi} jam</p>
                <p className="text-sm text-muted-foreground">Rata-rata Durasi</p>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-xl">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.avgKualitas}/5</p>
                <p className="text-sm text-muted-foreground">Rata-rata Kualitas</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}