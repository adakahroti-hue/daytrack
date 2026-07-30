"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Check, X, RotateCcw, BookOpen, Plus, Edit2, Trash2, Target, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useQuranLog, useQuranLogRange, useQuranDailySummary, useUpsertQuranLog, useDeleteQuranLog } from '@/hooks/useQuranLogs'
import { useQuranLogRealtime } from '@/hooks/useRealtime'

const WAKTU_BACA = [
  { key: 'setelah_subuh', label: 'Setelah Subuh', short: 'Subuh', time: '05:45 - 07:00' },
  { key: 'setelah_dzuhur', label: 'Setelah Dzuhur', short: 'Dzuhur', time: '13:15 - 15:00' },
  { key: 'setelah_ashar', label: 'Setelah Ashar', short: 'Ashar', time: '16:30 - 18:00' },
  { key: 'setelah_maghrib', label: 'Setelah Maghrib', short: 'Maghrib', time: '19:15 - 19:30' },
  { key: 'setelah_isya', label: 'Setelah Isya', short: 'Isya', time: '21:00 - 22:00' },
] as const

const REFLEKSI_OPTIONS = [
  { value: 'sibuk', label: 'Sibuk' },
  { value: 'lupa', label: 'Lupa' },
  { value: 'tidak_sempat', label: 'Tidak Sempat' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

type WaktuBacaKey = typeof WAKTU_BACA[number]['key']
type RefleksiKey = typeof REFLEKSI_OPTIONS[number]['value']

interface QuranLogEntry {
  id: string
  user_id: string
  tanggal: string
  waktu_baca: WaktuBacaKey
  surat: string | null
  juz: number | null
  halaman_mulai: number | null
  halaman_selesai: number | null
  jumlah_halaman: number | null
  catatan: string | null
  created_at: string
  updated_at: string
}

export default function QuranPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editDialog, setEditDialog] = useState<{ open: boolean; entry: QuranLogEntry | null }>({ open: false, entry: null })
  const [refleksiDialog, setRefleksiDialog] = useState<{ open: boolean; waktuBaca: WaktuBacaKey } | null>(null)
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: quranLogs = [], isLoading, error, refetch } = useQuranLog(dateKey)
  const { data: dailySummary } = useQuranDailySummary(dateKey)
  const { data: weeklyLogs = [] } = useQuranLogRange(
    format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const upsertQuranLog = useUpsertQuranLog()
  const deleteQuranLog = useDeleteQuranLog()

  useQuranLogRealtime(dateKey)

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const getWaktuBacaLogs = (waktu: WaktuBacaKey) => {
    return quranLogs.filter(log => log.waktu_baca === waktu)
  }

  const hasReading = (waktu: WaktuBacaKey) => {
    return getWaktuBacaLogs(waktu).length > 0
  }

  const handleOpenEdit = (entry: QuranLogEntry | null, waktuBaca?: WaktuBacaKey) => {
    if (entry) {
      setEditDialog({ open: true, entry })
    } else if (waktuBaca) {
      setEditDialog({ 
        open: true, 
        entry: {
          id: '',
          user_id: '',
          tanggal: dateKey,
          waktu_baca: waktuBaca,
          surat: '',
          juz: null,
          halaman_mulai: null,
          halaman_selesai: null,
          jumlah_halaman: null,
          catatan: '',
          created_at: '',
          updated_at: '',
        } as QuranLogEntry
      })
    }
  }

  const handleEditSubmit = async (data: any) => {
    const { entry, ...formData } = data
    await upsertQuranLog.mutateAsync({
      tanggal: dateKey,
      waktu_baca: formData.waktu_baca || entry.waktu_baca,
      surat: formData.surat || undefined,
      juz: formData.juz || undefined,
      halaman_mulai: formData.halaman_mulai || undefined,
      halaman_selesai: formData.halaman_selesai || undefined,
      catatan: formData.catatan || undefined,
    })
    setEditDialog({ open: false, entry: null })
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus catatan ini?')) {
      await deleteQuranLog.mutateAsync(id)
      refetch()
    }
  }

  const handleRefleksiSubmit = async (refleksi: RefleksiKey) => {
    if (!refleksiDialog) return
    await upsertQuranLog.mutateAsync({
      tanggal: dateKey,
      waktu_baca: refleksiDialog.waktuBaca,
      catatan: `Tidak membaca: ${REFLEKSI_OPTIONS.find(r => r.value === refleksi)?.label}`,
    })
    setRefleksiDialog(null)
    refetch()
  }

  const totalHalamanHariIni = dailySummary?.totalHalaman || 0
  const targetHalaman = 10
  const progressPersen = Math.min(Math.round((totalHalamanHariIni / targetHalaman) * 100), 100)

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0
    const sortedDates = [...new Set(weeklyLogs.map(log => log.tanggal))].sort((a, b) => b.localeCompare(a))
    for (const date of sortedDates) {
      const dayLogs = weeklyLogs.filter(log => log.tanggal === date)
      if (dayLogs.length > 0) streak++
      else break
    }
    return streak
  }

  const streak = calculateStreak()

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Quran</h1>
          <p className="text-sm text-muted-foreground">Baca dan catat progres Quran harian Anda</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button variant="outline" size="icon" onClick={() => navigateDay('prev')} aria-label="Hari sebelumnya" className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday} className="px-3 h-9" disabled={isToday}>
            <Calendar className="h-4 w-4 mr-2" /> {format(currentDate, 'd MMM yyyy', { locale: id })}
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDay('next')} aria-label="Hari berikutnya" className="h-9 w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Compact Card */}
      <Card className="border-[#E5E7EB] dark:border-[#374151] rounded-xl">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quran Hari Ini</p>
                <p className="text-2xl font-bold">{totalHalamanHariIni} / {targetHalaman} halaman</p>
              </div>
            </div>
            <div className="w-full sm:w-72 space-y-2">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Target harian</span>
                  <span className="font-semibold text-green-600">{progressPersen}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progressPersen}%` }} />
                </div>
              </div>
              {/* Streak */}
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 rounded-lg border border-orange-200/50">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span className="font-semibold text-orange-600">{streak}</span>
                  <span className="text-muted-foreground">hari streak</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracker Bacaan - Compact List */}
      <Card className="border-[#E5E7EB] dark:border-[#374151] rounded-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-8 px-4">
              <p>Gagal memuat data: {error.message}</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                <RotateCcw className="h-4 w-4 mr-2" /> Coba Lagi
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#374151]">
              {WAKTU_BACA.map((waktu) => {
                const logs = getWaktuBacaLogs(waktu.key)
                const hasLog = logs.length > 0
                const firstLog = logs[0]

                return (
                  <div
                    key={waktu.key}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    style={{ minHeight: '64px' }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        hasLog ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
                      )}>
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{waktu.label}</p>
                        <p className="text-xs text-muted-foreground">{waktu.time}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasLog ? (
                        <>
                          <div className="hidden sm:flex flex-col items-end gap-1 text-right">
                            {firstLog.surat && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30 text-xs px-2 py-0.5">
                                {firstLog.surat}
                              </Badge>
                            )}
                            {firstLog.jumlah_halaman && (
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                +{firstLog.jumlah_halaman} halaman
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEdit(firstLog)}
                            aria-label="Edit catatan"
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(firstLog.id)}
                            aria-label="Hapus catatan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(null, waktu.key)}
                            className="gap-1.5 text-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Catat</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setRefleksiDialog({ open: true, waktuBaca: waktu.key })}
                            aria-label="Tidak membaca"
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Entry Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, entry: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.entry?.id ? 'Edit Catatan Quran' : 'Tambah Catatan Bacaan'}</DialogTitle>
            <DialogDescription>
              Isi detail bacaan Quran Anda
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select
              value={editDialog.entry?.waktu_baca || ''}
              onValueChange={(value) => setEditDialog({ 
                open: true, 
                entry: editDialog.entry ? { ...editDialog.entry, waktu_baca: value as WaktuBacaKey } : null 
              })}
            >
              <SelectTrigger><SelectValue placeholder="Pilih waktu bacaan" /></SelectTrigger>
              <SelectContent>
                {WAKTU_BACA.map(w => (
                  <SelectItem key={w.key} value={w.key}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>Surat</Label>
                <Input
                  value={editDialog.entry?.surat || ''}
                  onChange={(e) => setEditDialog({ 
                    open: true, 
                    entry: editDialog.entry ? { ...editDialog.entry, surat: e.target.value } : null 
                  })}
                  placeholder="Contoh: Al-Baqarah"
                />
              </div>
              <div>
                <Label>Juz</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={editDialog.entry?.juz || ''}
                  onChange={(e) => setEditDialog({ 
                    open: true, 
                    entry: editDialog.entry ? { ...editDialog.entry, juz: parseInt(e.target.value) || null } : null 
                  })}
                  placeholder="1-30"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>Halaman Mulai</Label>
                <Input
                  type="number"
                  min={1}
                  max={604}
                  value={editDialog.entry?.halaman_mulai || ''}
                  onChange={(e) => setEditDialog({ 
                    open: true, 
                    entry: editDialog.entry ? { ...editDialog.entry, halaman_mulai: parseInt(e.target.value) || null } : null 
                  })}
                  placeholder="1-604"
                />
              </div>
              <div>
                <Label>Halaman Selesai</Label>
                <Input
                  type="number"
                  min={1}
                  max={604}
                  value={editDialog.entry?.halaman_selesai || ''}
                  onChange={(e) => setEditDialog({ 
                    open: true, 
                    entry: editDialog.entry ? { ...editDialog.entry, halaman_selesai: parseInt(e.target.value) || null } : null 
                  })}
                  placeholder="1-604"
                />
              </div>
            </div>

            <div>
              <Label>Catatan (opsional)</Label>
              <Textarea
                value={editDialog.entry?.catatan || ''}
                onChange={(e) => setEditDialog({ 
                  open: true, 
                  entry: editDialog.entry ? { ...editDialog.entry, catatan: e.target.value } : null 
                })}
                placeholder="Tulis refleksi, ayat favorit, dll."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, entry: null })}>Batal</Button>
              <Button onClick={() => handleEditSubmit(editDialog.entry)}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refleksi Dialog */}
      <Dialog open={!!refleksiDialog} onOpenChange={(open) => !open && setRefleksiDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tidak Membaca Quran</DialogTitle>
            <DialogDescription>
              Pilih alasan mengapa tidak membaca pada {WAKTU_BACA.find(w => w.key === refleksiDialog?.waktuBaca)?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {REFLEKSI_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleRefleksiSubmit(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Riwayat Minggu Ini - Compact List */}
      <Card className="border-[#E5E7EB] dark:border-[#374151] rounded-xl">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-green-500" />
            Riwayat Minggu Ini
          </p>
          <div className="space-y-1.5">
            {Array.from({ length: 7 }, (_, i) => {
              const date = subDays(endOfWeek(currentDate, { weekStartsOn: 1 }), i)
              const dateStr = format(date, 'yyyy-MM-dd')
              const dayLogs = weeklyLogs.filter(log => log.tanggal === dateStr)
              const dayTotal = dayLogs.reduce((sum, log) => sum + (log.jumlah_halaman || 0), 0)
              const hasData = dayLogs.length > 0
              const isTodayWeek = isSameDay(date, new Date())

              // Build session summary
              const sessionSummary = WAKTU_BACA.map(w => {
                const sessionLogs = dayLogs.filter(l => l.waktu_baca === w.key)
                if (sessionLogs.length === 0) return null
                const totalHalaman = sessionLogs.reduce((sum, l) => sum + (l.jumlah_halaman || 0), 0)
                return `${w.short}: ${totalHalaman}h`
              }).filter(Boolean).join(', ')

              return (
                <div key={dateStr} className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                  hasData ? 'bg-green-500/5 border border-green-200/50' : 'bg-muted/30 border border-[#E5E7EB] dark:border-[#374151]',
                  isTodayWeek && 'ring-1 ring-primary/30'
                )}>
                  <div className="w-20 shrink-0">
                    <p className="font-medium text-sm">{format(date, 'd MMM', { locale: id })}</p>
                    <p className="text-xs text-muted-foreground">{format(date, 'EEE', { locale: id })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    {hasData ? (
                      <p className="text-sm text-muted-foreground truncate">{sessionSummary || `${dayTotal} halaman`}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Belum ada catatan</p>
                    )}
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className={cn(
                      'text-sm font-semibold',
                      hasData ? 'text-green-600' : 'text-muted-foreground'
                    )}>
                      {hasData ? `${dayTotal}h` : '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}