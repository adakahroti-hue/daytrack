"use client"

import { useState, useEffect } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Shield, CheckCircle2, AlertTriangle, Flame, Zap, Plus, Edit2, Trash2, Trophy, Target, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { usePmoLog, usePmoLogRange, useUpsertPmoLog, useDeletePmoLog } from '@/hooks/usePmoLogs'
import { usePmoLogRealtime } from '@/hooks/useRealtime'

const TRIGGER_OPTIONS = [
  { value: 'stres', label: 'Stres', icon: '😰' },
  { value: 'kebosanan', label: 'Kebosanan', icon: '😴' },
  { value: 'media', label: 'Media/Ponsel', icon: '📱' },
  { value: 'perasaan', label: 'Perasaan Negatif', icon: '😔' },
  { value: 'lingkungan', label: 'Lingkungan', icon: '🏠' },
  { value: 'lainnya', label: 'Lainnya', icon: '❓' },
] as const

type TriggerKey = typeof TRIGGER_OPTIONS[number]['value']

interface PmoLogEntry {
  id: string
  user_id: string
  tanggal: string
  hari_ke: number
  status: 'berhasil' | 'relapse'
  trigger: TriggerKey | null
  strategi: string | null
  catatan: string | null
  created_at: string
  updated_at: string
}

export default function PMOPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editDialog, setEditDialog] = useState<{ open: boolean; entry: PmoLogEntry | null }>({ open: false, entry: null })
  const [mounted, setMounted] = useState(false)
  
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  useEffect(() => setMounted(true), [])

  const { data: pmoLog, isLoading, error, refetch } = usePmoLog(dateKey)
  const { data: weeklyLogs = [] } = usePmoLogRange(
    format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const upsertPmoLog = useUpsertPmoLog()
  const deletePmoLog = useDeletePmoLog()

  usePmoLogRealtime(dateKey)

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleOpenEdit = (entry: PmoLogEntry | null) => {
    if (entry) {
      setEditDialog({ open: true, entry })
    } else {
      const lastLog = weeklyLogs[weeklyLogs.length - 1]
      const nextHariKe = lastLog ? lastLog.hari_ke + 1 : 1
      setEditDialog({ 
        open: true, 
        entry: {
          id: '',
          user_id: '',
          tanggal: dateKey,
          hari_ke: nextHariKe,
          status: 'berhasil',
          trigger: null,
          strategi: '',
          catatan: '',
          created_at: '',
          updated_at: '',
        } as PmoLogEntry
      })
    }
  }

  const handleEditSubmit = async (data: any) => {
    await upsertPmoLog.mutateAsync({
      tanggal: dateKey,
      hari_ke: data.hari_ke,
      status: data.status,
      trigger: data.trigger || undefined,
      strategi: data.strategi || undefined,
      catatan: data.catatan || undefined,
    })
    setEditDialog({ open: false, entry: null })
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus catatan PMO ini?')) {
      await deletePmoLog.mutateAsync(id)
      refetch()
    }
  }

  if (!mounted) {
    return <div className="space-y-6"><div className="h-8 bg-muted animate-pulse rounded w-1/4" /></div>
  }

  const isDone = !!pmoLog

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0
    for (let i = weeklyLogs.length - 1; i >= 0; i--) {
      if (weeklyLogs[i].status === 'berhasil') streak++
      else break
    }
    return streak
  }

  const currentStreak = calculateStreak()
  const maxStreak = Math.max(...weeklyLogs.filter(l => l.status === 'berhasil').map(l => l.hari_ke), 0)
  const totalBerhasil = weeklyLogs.filter(l => l.status === 'berhasil').length
  const totalRelapse = weeklyLogs.filter(l => l.status === 'relapse').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">PMO</h1>
          <p className="text-sm text-muted-foreground">Pantau progres dan bangun konsistensi diri</p>
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

      {/* Recovery Summary Card */}
      <Card>
        <CardContent className="p-6">
          {isDone && pmoLog ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center',
                  pmoLog.status === 'berhasil' ? 'bg-green-500/10' : 'bg-red-500/10'
                )}>
                  {pmoLog.status === 'berhasil' ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hari ke-{pmoLog.hari_ke}</p>
                  <p className="text-3xl font-bold capitalize">
                    {pmoLog.status === 'berhasil' ? 'Berhasil' : 'Relapse'}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-80 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-500/10 rounded-xl">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalBerhasil}</p>
                    <p className="text-xs text-muted-foreground">Hari Berhasil</p>
                  </div>
                  <div className="text-center p-3 bg-red-500/10 rounded-xl">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalRelapse}</p>
                    <p className="text-xs text-muted-foreground">Relapse</p>
                  </div>
                  <div className="text-center p-3 bg-purple-500/10 rounded-xl">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{currentStreak}</p>
                    <p className="text-xs text-muted-foreground">Streak Saat Ini</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Streak Terbaik</span>
                    <span className="font-semibold">{maxStreak} hari</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${maxStreak > 0 ? Math.min(Math.round((currentStreak / maxStreak) * 100), 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">Belum ada catatan PMO hari ini</p>
              <p className="text-sm text-muted-foreground mt-1">Mulai catat status hari ini untuk membangun streak</p>
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

      {/* Calendar Streak View */}
      {weeklyLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Kalender Streak 7 Hari
              <span className="text-sm font-normal text-muted-foreground">
                {format(currentDate, 'MMMM yyyy', { locale: id })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 7 }, (_, i) => {
                const date = subDays(endOfWeek(currentDate, { weekStartsOn: 1 }), i)
                const dateStr = format(date, 'yyyy-MM-dd')
                const dayLog = weeklyLogs.find(log => log.tanggal === dateStr)
                const dayNum = format(date, 'd')
                const dayName = format(date, 'E', { locale: id })
                
                let colorClass = 'bg-muted'
                let icon = null
                if (dayLog) {
                  if (dayLog.status === 'berhasil') {
                    colorClass = 'bg-green-500'
                    icon = <CheckCircle2 className="h-4 w-4" />
                  } else {
                    colorClass = 'bg-red-500'
                    icon = <AlertTriangle className="h-4 w-4" />
                  }
                }
                
                return (
                  <div key={dateStr} className="flex-shrink-0 flex flex-col items-center gap-1 w-16">
                    <span className="text-xs text-muted-foreground">{dayName}</span>
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white transition-all',
                      colorClass
                    )}>
                      {icon || dayNum}
                    </div>
                    {dayLog?.hari_ke && (
                      <span className="text-xs text-muted-foreground">Hari {dayLog.hari_ke}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today Detail Card */}
      {isDone && pmoLog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Detail Hari Ini
              <span className="text-sm font-normal text-muted-foreground capitalize">
                {format(currentDate, 'EEEE', { locale: id })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={pmoLog.status === 'berhasil' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handleEditSubmit({ ...pmoLog, status: 'berhasil' })}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Berhasil
              </Button>
              <Button
                variant={pmoLog.status === 'relapse' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => handleEditSubmit({ ...pmoLog, status: 'relapse' })}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Relapse
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Hari ke-</Label>
              <Select value={pmoLog.hari_ke.toString()} onValueChange={(v) => handleEditSubmit({ ...pmoLog, hari_ke: parseInt(v) })}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Hari ke" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pmoLog.status === 'relapse' && (
              <div>
                <Label>Trigger / Penyebab</Label>
                <Select value={pmoLog.trigger || 'stres'} onValueChange={(v) => handleEditSubmit({ ...pmoLog, trigger: v as TriggerKey })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih trigger" /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.icon} {opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Strategi Perbaikan</Label>
              <Textarea
                value={pmoLog.strategi || ''}
                onChange={(e) => handleEditSubmit({ ...pmoLog, strategi: e.target.value })}
                placeholder="Apa yang akan dilakukan berbeda besok? (misal: taruh HP jauh dari tempat tidur, baca buku sebelum tidur...)"
                rows={3}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={pmoLog.catatan || ''}
                onChange={(e) => handleEditSubmit({ ...pmoLog, catatan: e.target.value })}
                placeholder="Perasaan, tantangan, motivasi..."
                rows={2}
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => handleDelete(pmoLog.id)} className="text-destructive hover:bg-destructive/10">
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
            <CardTitle>Tambah Catatan PMO</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="default" 
              className="w-full gap-2 py-4"
              onClick={() => handleOpenEdit(null)}
            >
              <Plus className="h-5 w-5" />
              <span>Mulai Mencatat Hari Ini</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, entry: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.entry?.id ? 'Edit Catatan PMO' : 'Tambah Catatan PMO'}</DialogTitle>
            <DialogDescription>
              Catat status hari ini untuk membangun konsistensi
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Hari ke-</Label>
              <Select
                value={editDialog.entry?.hari_ke?.toString() || '1'}
                onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, hari_ke: parseInt(value) } : null })}
              >
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Hari ke" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 100 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant={editDialog.entry?.status === 'berhasil' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, status: 'berhasil' } : null })}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Berhasil
              </Button>
              <Button
                variant={editDialog.entry?.status === 'relapse' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, status: 'relapse' } : null })}
              >
                <AlertTriangle className="mr-2 h-4 w-4" /> Relapse
              </Button>
            </div>

            {(editDialog.entry?.status || 'berhasil') === 'relapse' && (
              <Select
                value={editDialog.entry?.trigger || 'stres'}
                onValueChange={(value) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, trigger: value as TriggerKey } : null })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Trigger / Penyebab" /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.icon} {opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <div className="space-y-2">
              <Label>Strategi Perbaikan</Label>
              <Textarea
                value={editDialog.entry?.strategi || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, strategi: e.target.value } : null })}
                placeholder="Apa yang akan dilakukan berbeda besok?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={editDialog.entry?.catatan || ''}
                onChange={(e) => setEditDialog({ open: true, entry: editDialog.entry ? { ...editDialog.entry, catatan: e.target.value } : null })}
                placeholder="Perasaan, motivasi, tantangan..."
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

      {/* Weekly Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statistik Minggu Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="text-center p-4 bg-green-500/10 rounded-xl">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalBerhasil}</p>
              <p className="text-sm text-muted-foreground">Berhasil</p>
            </div>
            <div className="text-center p-4 bg-red-500/10 rounded-xl">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{totalRelapse}</p>
              <p className="text-sm text-muted-foreground">Relapse</p>
            </div>
            <div className="text-center p-4 bg-purple-500/10 rounded-xl">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{currentStreak}</p>
              <p className="text-sm text-muted-foreground">Streak Sekarang</p>
            </div>
            <div className="text-center p-4 bg-amber-500/10 rounded-xl">
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{maxStreak}</p>
              <p className="text-sm text-muted-foreground">Streak Terbaik</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}