"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Check, X, RotateCcw, Sparkles, Plus, Edit2, Trash2, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useSyukurLog, useSyukurLogRange, useSyukurDailySummary, useUpsertSyukurLog, useDeleteSyukurLog } from '@/hooks/useSyukurLogs'
import { useSyukurLogRealtime } from '@/hooks/useRealtime'

const KATEGORI_OPTIONS = [
  { key: 'kesehatan', label: 'Kesehatan', icon: '💚' },
  { key: 'keluarga', label: 'Keluarga', icon: '👨‍👩‍👧‍👦' },
  { key: 'rezeki', label: 'Rezeki', icon: '💰' },
  { key: 'pekerjaan', label: 'Pekerjaan', icon: '💼' },
  { key: 'ilmu', label: 'Ilmu', icon: '📚' },
  { key: 'hal_kecil', label: 'Hal Kecil', icon: '✨' },
  { key: 'lainnya', label: 'Lainnya', icon: '🌈' },
] as const

const ALASAN_OPTIONS = [
  { value: 'lupa', label: 'Lupa' },
  { value: 'sibuk', label: 'Sibuk' },
  { value: 'tidak_terpikir', label: 'Tidak Terpikir' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

type KategoriKey = typeof KATEGORI_OPTIONS[number]['key']
type AlasanKey = typeof ALASAN_OPTIONS[number]['value']

interface SyukurLogEntry {
  id: string
  user_id: string
  tanggal: string
  status: 'sudah' | 'belum'
  isi_syukur: string | null
  kategori: KategoriKey | null
  catatan: string | null
  alasan_tidak: AlasanKey | null
  created_at: string
  updated_at: string
}

export default function SyukurPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [editDialog, setEditDialog] = useState<{ open: boolean; entry: SyukurLogEntry | null }>({ open: false, entry: null })
  const [alasanDialog, setAlasanDialog] = useState<{ open: boolean; entry: SyukurLogEntry | null } | null>(null)
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: syukurLogs = [], isLoading, error, refetch } = useSyukurLog(dateKey)
  const { data: dailySummary } = useSyukurDailySummary(dateKey)
  const { data: weeklyLogs = [] } = useSyukurLogRange(
    format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const upsertSyukurLog = useUpsertSyukurLog()
  const deleteSyukurLog = useDeleteSyukurLog()

  // Subscribe to realtime updates
  useSyukurLogRealtime(dateKey)

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const getLog = () => {
    return syukurLogs[0] || null
  }

  const handleOpenEdit = (entry: SyukurLogEntry | null) => {
    if (entry) {
      setEditDialog({ open: true, entry })
    } else {
      setEditDialog({ 
        open: true, 
        entry: {
          id: '',
          user_id: '',
          tanggal: dateKey,
          status: 'sudah',
          isi_syukur: '',
          kategori: 'hal_kecil',
          catatan: '',
          alasan_tidak: null,
          created_at: '',
          updated_at: '',
        } as SyukurLogEntry
      })
    }
  }

  const handleEditSubmit = async (data: any) => {
    const { entry, ...formData } = data
    await upsertSyukurLog.mutateAsync({
      tanggal: dateKey,
      status: formData.status,
      isi_syukur: formData.isi_syukur || undefined,
      kategori: formData.kategori || undefined,
      catatan: formData.catatan || undefined,
      alasan_tidak: formData.alasan_tidak || undefined,
    })
    setEditDialog({ open: false, entry: null })
    refetch()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus catatan syukur ini?')) {
      await deleteSyukurLog.mutateAsync(id)
      refetch()
    }
  }

  const handleOpenAlasan = (entry: SyukurLogEntry | null) => {
    setAlasanDialog({ open: true, entry: entry || {
      id: '',
      user_id: '',
      tanggal: dateKey,
      status: 'belum',
      isi_syukur: '',
      kategori: null,
      catatan: '',
      alasan_tidak: null,
      created_at: '',
      updated_at: '',
    } as SyukurLogEntry })
  }

  const handleAlasanSubmit = async (alasan: AlasanKey) => {
    if (!alasanDialog) return
    await upsertSyukurLog.mutateAsync({
      tanggal: dateKey,
      status: 'belum',
      alasan_tidak: alasan,
    })
    setAlasanDialog(null)
    refetch()
  }

  const log = getLog()
  const isDone = log?.status === 'sudah'

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0
    const sortedDates = [...new Set(weeklyLogs.map(log => log.tanggal))].sort((a, b) => b.localeCompare(a))
    for (const date of sortedDates) {
      const dayLogs = weeklyLogs.filter(log => log.tanggal === date)
      const hasSudah = dayLogs.some(log => log.status === 'sudah')
      if (hasSudah) streak++
      else break
    }
    return streak
  }

  const streak = calculateStreak()
  const totalSyukur = weeklyLogs.filter(log => log.status === 'sudah').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Syukur</h1>
          <p className="text-sm text-muted-foreground">Catat rasa syukur hari ini</p>
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

      {/* Daily Summary Card */}
      <Card>
        <CardContent className="p-6">
          {isDone && log ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Syukur Hari Ini</p>
                  <p className="text-3xl font-bold">{log.isi_syukur || 'Sudah mencatat'}</p>
                </div>
              </div>
              <div className="w-full sm:w-80 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Streak</span>
                    <span className="font-semibold">{streak} hari</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(streak * 10, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-200/50">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-semibold text-amber-600">{totalSyukur}</span>
                    <span className="text-muted-foreground">total catatan</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">Belum ada catatan syukur hari ini</p>
              <p className="text-sm text-muted-foreground mt-1">Tuliskan satu hal kecil yang membuat hari ini berarti</p>
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

      {/* Syukur Entry Card */}
      {isDone && log && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Catatan Syukur
              <span className="text-sm font-normal text-muted-foreground">
                {format(currentDate, 'EEEE', { locale: id })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                {KATEGORI_OPTIONS.find(k => k.key === log.kategori)?.icon || '✨'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">{log.isi_syukur}</p>
                <div className="flex items-center gap-2 mt-1">
                  {log.kategori && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full text-xs">
                      {KATEGORI_OPTIONS.find(k => k.key === log.kategori)?.label}
                    </span>
                  )}
                </div>
                {log.catatan && (
                  <p className="text-sm text-muted-foreground mt-2">{log.catatan}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleOpenEdit(log)}
                  aria-label="Edit catatan"
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(log.id)}
                  aria-label="Hapus catatan"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Entry Card (when not done) */}
      {!isDone && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Catatan Syukur</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="default" 
              className="w-full gap-2 py-4"
              onClick={() => handleOpenEdit(null)}
            >
              <Plus className="h-5 w-5" />
              <span>Mulai Mencatat Syukur</span>
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-3">
              Atau klik tombol di atas jika belum beruntung hari ini
            </p>
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => handleOpenAlasan(null)}
            >
              <X className="h-4 w-4" />
              <span>Belum Mencatat Hari Ini</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit/Add Entry Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, entry: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.entry?.id ? 'Edit Catatan Syukur' : 'Tambah Catatan Syukur'}</DialogTitle>
            <DialogDescription>
              Tuliskan hal yang membuat hari ini berarti
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select
              value={editDialog.entry?.status || 'sudah'}
              onValueChange={(value) => setEditDialog({ 
                open: true, 
                entry: editDialog.entry ? { ...editDialog.entry, status: value as 'sudah' | 'belum' } : null 
              })}
            >
              <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sudah">Sudah Bersyukur</SelectItem>
                <SelectItem value="belum">Belum Mencatat</SelectItem>
              </SelectContent>
            </Select>

            {(editDialog.entry?.status || 'sudah') === 'sudah' && (
              <>
                <div>
                  <Label>Hal yang Disyukuri</Label>
                  <Textarea
                    value={editDialog.entry?.isi_syukur || ''}
                    onChange={(e) => setEditDialog({ 
                      open: true, 
                      entry: editDialog.entry ? { ...editDialog.entry, isi_syukur: e.target.value } : null 
                    })}
                    placeholder="Contoh: Bisa bangun pagi dengan sehat, makan enak, teman yang mendengarkan..."
                    rows={3}
                  />
                </div>

                <Select
                  value={editDialog.entry?.kategori || 'hal_kecil'}
                  onValueChange={(value) => setEditDialog({ 
                    open: true, 
                    entry: editDialog.entry ? { ...editDialog.entry, kategori: value as KategoriKey } : null 
                  })}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {KATEGORI_OPTIONS.map(k => (
                      <SelectItem key={k.key} value={k.key}>{k.icon} {k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div>
                  <Label>Catatan Tambahan (opsional)</Label>
                  <Textarea
                    value={editDialog.entry?.catatan || ''}
                    onChange={(e) => setEditDialog({ 
                      open: true, 
                      entry: editDialog.entry ? { ...editDialog.entry, catatan: e.target.value } : null 
                    })}
                    placeholder="Refleksi lebih dalam, detail peristiwa..."
                    rows={2}
                  />
                </div>
              </>
            )}

            {(editDialog.entry?.status || 'sudah') === 'belum' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center py-4">
                  Pilih alasan tidak mencatat syukur akan diisi setelah submit
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialog({ open: false, entry: null })}>Batal</Button>
              <Button onClick={() => handleEditSubmit(editDialog.entry)}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alasan Dialog */}
      <Dialog open={!!alasanDialog} onOpenChange={(open) => !open && setAlasanDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Belum Mencatat Syukur</DialogTitle>
            <DialogDescription>
              Pilih alasan mengapa belum sempat mencatat
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {ALASAN_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAlasanSubmit(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
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
                  <th className="pb-2 font-medium">Hal yang Disyukuri</th>
                  <th className="pb-2 font-medium">Kategori</th>
                  <th className="pb-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 7 }, (_, i) => {
                  const date = subDays(endOfWeek(currentDate, { weekStartsOn: 1 }), i)
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const dayLogs = weeklyLogs.filter(log => log.tanggal === dateStr)
                  const hasData = dayLogs.length > 0
                  const sudahLogs = dayLogs.filter(l => l.status === 'sudah')
                  const belumLogs = dayLogs.filter(l => l.status === 'belum')
                  
                  return (
                    <tr key={dateStr} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 font-medium">{format(date, 'd MMM', { locale: id })}</td>
                      <td className="py-2 text-center">
                        {hasData ? (
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            sudahLogs.length > 0 
                              ? 'bg-green-500/10 text-green-700 dark:text-green-300' 
                              : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
                          )}>
                            {sudahLogs.length > 0 ? (
                              <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Sudah</span>
                            ) : (
                              <span className="flex items-center gap-1"><X className="h-3 w-3" /> Belum</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 max-w-xs truncate">
                        {sudahLogs[0]?.isi_syukur || belumLogs[0]?.alasan_tidak ? ALASAN_OPTIONS.find(a => a.value === belumLogs[0]?.alasan_tidak)?.label : '—'}
                      </td>
                      <td className="py-2">
                        {sudahLogs[0]?.kategori ? (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                            {KATEGORI_OPTIONS.find(k => k.key === sudahLogs[0]?.kategori)?.label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground max-w-xs truncate">
                        {sudahLogs[0]?.catatan || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}