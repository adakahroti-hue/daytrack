"use client"

import { useState, useMemo } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Plus, Edit2, Trash2, Flame, Check, X, MoreHorizontal, Heart, Search, Filter, CalendarDays, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useDoaLog, useDoaLogRange, useUpsertDoaLog, useDeleteDoaLog } from '@/hooks/useDoaLogs'
import { useDoaLogRealtime } from '@/hooks/useRealtime'
import { Suspense } from 'react'

type DoaEntry = {
  id: string
  user_id: string
  tanggal: string
  status: 'sudah' | 'belum'
  untuk_siapa: string | null
  keterangan: string | null
  created_at: string
  updated_at: string
}

type DoaFormData = {
  tanggal: string
  status: 'sudah' | 'belum'
  untuk_siapa: string
  keterangan: string
}

type EditingDoa = DoaFormData & { id: string }
type ViewMode = 'table' | 'calendar' | 'list'
type FilterPeriod = 'all' | 'week' | 'month' | 'this_week'

const STATUS_OPTIONS = [
  { value: 'sudah', label: 'Sudah', color: 'bg-green-500/10 text-green-700 border-green-500/30' },
  { value: 'belum', label: 'Belum', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  { value: 'terlewat', label: 'Terlewat', color: 'bg-red-500/10 text-red-700 border-red-500/30' },
] as const

const UNTUK_SIAPA_OPTIONS = [
  'Ibu', 'Ayah', 'Keluarga', 'Saudara', 'Teman', 'Pasangan', 'Anak', 'Guru', 'Tetangga', 'Umum', 'Palestina', 'Sesama', 'Lainnya'
]

export default function DoaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDoa, setEditingDoa] = useState<EditingDoa | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('this_week')
  const [searchQuery, setSearchQuery] = useState('')
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: doaLogs = [], isLoading, error, refetch } = useDoaLog(dateKey)
  const { data: weeklyLogs = [] } = useDoaLogRange(
    format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const upsertDoaLog = useUpsertDoaLog()
  const deleteDoaLog = useDeleteDoaLog()

  useDoaLogRealtime(dateKey)

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  // Filter logs based on period
  const getFilteredLogs = () => {
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    return doaLogs.filter(log => {
      const logDate = new Date(log.tanggal)
      if (filterPeriod === 'week') return logDate >= weekStart && logDate <= weekEnd
      if (filterPeriod === 'month') return logDate >= monthStart && logDate <= monthEnd
      if (filterPeriod === 'this_week') return logDate >= weekStart && logDate <= weekEnd
      return true
    })
  }

  const filteredLogs = useMemo(() => {
    let logs = getFilteredLogs()
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      logs = logs.filter(log => 
        (log.untuk_siapa?.toLowerCase().includes(query)) ||
        (log.keterangan?.toLowerCase().includes(query))
      )
    }
    return logs.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
  }, [doaLogs, filterPeriod, searchQuery])

  // Calculate stats
  const stats = useMemo(() => {
    const todayLogs = doaLogs.filter(log => log.tanggal === dateKey)
    const todayStatus = todayLogs.length > 0 ? todayLogs[0].status : 'belum'
    
    // Streak calculation
    let streak = 0
    const sortedDates = [...new Set(doaLogs.map(log => log.tanggal))].sort((a, b) => b.localeCompare(a))
    for (const date of sortedDates) {
      const dayLogs = doaLogs.filter(log => log.tanggal === date)
      if (dayLogs.some(l => l.status === 'sudah')) streak++
      else break
    }

    // This week count
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
    const thisWeekLogs = doaLogs.filter(log => {
      const d = new Date(log.tanggal)
      return d >= weekStart && d <= weekEnd && log.status === 'sudah'
    })
    const uniqueDaysThisWeek = [...new Set(thisWeekLogs.map(l => l.tanggal))].length

    return {
      todayStatus,
      streak,
      thisWeekCount: uniqueDaysThisWeek,
      totalEntries: doaLogs.length
    }
  }, [doaLogs, dateKey])

  const handleEdit = (entry: DoaEntry) => {
    setEditingDoa({
      id: entry.id,
      tanggal: entry.tanggal,
      status: entry.status,
      untuk_siapa: entry.untuk_siapa || '',
      keterangan: entry.keterangan || '',
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus catatan doa ini?')) {
      await deleteDoaLog.mutateAsync(id)
      refetch()
    }
  }

  const handleSubmit = async (data: DoaFormData) => {
    const taskData = { ...data }
    await upsertDoaLog.mutateAsync({
      tanggal: taskData.tanggal,
      status: taskData.status,
      untuk_siapa: taskData.untuk_siapa || undefined,
      keterangan: taskData.keterangan || undefined,
    })
    setIsFormOpen(false)
    setEditingDoa(null)
    refetch()
  }

  const handleQuickAdd = () => {
    setEditingDoa({
      id: '',
      tanggal: dateKey,
      status: 'sudah',
      untuk_siapa: '',
      keterangan: '',
    })
    setIsFormOpen(true)
  }

  const updateEditingDoa = (updates: Partial<EditingDoa>) => {
    if (editingDoa) {
      setEditingDoa({ ...editingDoa, ...updates })
    }
  }

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Doa
          </h1>
          <p className="text-sm text-muted-foreground">Catat kebiasaan mendoakan orang lain setiap hari</p>
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

      {/* Summary Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-[#E5E7EB] dark:border-[#374151] rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Heart className="h-4.5 w-4.5 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Hari Ini</p>
                <p className="font-semibold text-base capitalize">{stats.todayStatus === 'sudah' ? 'Sudah' : 'Belum'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] dark:border-[#374151] rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Flame className="h-4.5 w-4.5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Streak</p>
                <p className="font-semibold text-base">{stats.streak} hari</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] dark:border-[#374151] rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CalendarDays className="h-4.5 w-4.5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Minggu Ini</p>
                <p className="font-semibold text-base">{stats.thisWeekCount}/7 hari</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Search + Filter + View + Add */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari untuk siapa, keterangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')} aria-label="Hapus pencarian">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as FilterPeriod)}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Periode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this_week">Minggu Ini</SelectItem>
              <SelectItem value="week">7 Hari Terakhir</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="all">Semua</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Tampilan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="table">Tabel</SelectItem>
              <SelectItem value="list">Daftar</SelectItem>
              <SelectItem value="calendar">Kalender</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 ml-auto sm:ml-0"><Plus className="h-4 w-4" />Tambah Catatan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingDoa?.id ? 'Edit Catatan Doa' : 'Tambah Catatan Doa'}</DialogTitle>
                <DialogDescription>Catat untuk siapa Anda mendoakan hari ini</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Select
                  value={editingDoa?.status || 'sudah'}
                  onValueChange={(value) => updateEditingDoa({ status: value as 'sudah' | 'belum' })}
                >
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sudah">Sudah Mendoakan</SelectItem>
                    <SelectItem value="belum">Belum Mendoakan</SelectItem>
                  </SelectContent>
                </Select>

                <div>
                  <Label>Untuk Siapa</Label>
                  <Input
                    value={editingDoa?.untuk_siapa || ''}
                    onChange={(e) => updateEditingDoa({ untuk_siapa: e.target.value })}
                    placeholder="Contoh: Ibu, Teman, Keluarga, Palestina..."
                    list="untuk-siapa-suggestions"
                  />
                  <datalist id="untuk-siapa-suggestions">
                    {UNTUK_SIAPA_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                  </datalist>
                </div>

                <div>
                  <Label>Keterangan / Doa</Label>
                  <Textarea
                    value={editingDoa?.keterangan || ''}
                    onChange={(e) => updateEditingDoa({ keterangan: e.target.value })}
                    placeholder="Contoh: Mendoakan ibu agar sehat, Doa untuk teman yang ujian..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingDoa(null) }}>Batal</Button>
                  <Button onClick={() => handleSubmit(editingDoa!)}>Simpan</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-[#E5E7EB] dark:border-[#374151] rounded-xl overflow-hidden">
        {isLoading ? (
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </CardContent>
        ) : error ? (
          <CardContent className="py-12 text-center text-destructive">
            <p>Gagal memuat data: {error.message}</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-2">
              <RotateCcw className="h-4 w-4 mr-2" /> Coba Lagi
            </Button>
          </CardContent>
        ) : filteredLogs.length === 0 ? (
          <CardContent className="py-16 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">Belum ada catatan doa</p>
            <p className="text-sm text-muted-foreground mt-1">Mulai dengan menuliskan siapa yang ingin Anda doakan</p>
            <Button variant="outline" onClick={handleQuickAdd} className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" /> Tambah Catatan Pertama
            </Button>
          </CardContent>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_80px_1fr_60px] px-4 py-3 bg-muted/30 border-b border-[#E5E7EB] dark:border-[#374151] text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:grid">
              <div>Tanggal</div>
              <div>Hari</div>
              <div className="text-center">Status</div>
              <div>Untuk Siapa</div>
              <div>Keterangan</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#374151]">
              {filteredLogs.map((entry, index) => {
                const entryDate = new Date(entry.tanggal)
                const isTodayEntry = isSameDay(entryDate, new Date())
                const isOverdue = entry.status === 'belum' && entryDate < new Date() && !isTodayEntry
                const displayStatus = isOverdue ? 'terlewat' : entry.status
                const statusConfig = STATUS_OPTIONS.find(s => s.value === displayStatus) || STATUS_OPTIONS[1]

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'grid grid-cols-[auto_1fr_80px_1fr_60px] gap-3 px-4 py-3 items-center transition-colors',
                      'hover:bg-muted/30',
                      isTodayEntry && 'bg-primary/5 ring-1 ring-primary/20',
                      index % 2 === 1 && 'bg-muted/20'
                    )}
                  >
                    <div className="w-24 shrink-0">
                      <p className="font-medium text-sm">{format(entryDate, 'd MMM', { locale: id })}</p>
                      <p className="text-xs text-muted-foreground">{format(entryDate, 'EEE', { locale: id })}</p>
                    </div>
                    <div className="hidden sm:block text-sm text-muted-foreground">{format(entryDate, 'EEEE', { locale: id })}</div>
                    <div className="text-center">
                      <Badge variant="outline" className={cn('text-xs px-2 py-1', statusConfig.color)}>
                        {displayStatus === 'sudah' && <Check className="h-3 w-3 mr-1" />}
                        {displayStatus === 'belum' && <X className="h-3 w-3 mr-1" />}
                        {displayStatus === 'terlewat' && <X className="h-3 w-3 mr-1" />}
                        {STATUS_OPTIONS.find(s => s.value === displayStatus)?.label}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{entry.untuk_siapa || '—'}</p>
                    </div>
                    <div className="min-w-0 pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" aria-label="Menu">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => handleEdit(entry)} className="flex items-center gap-2" inset={false}>
                            <Edit2 className="h-3.5 w-3.5" />Edit
                          </DropdownMenuItem>
                          {entry.status === 'belum' && (
                            <DropdownMenuItem 
                              onClick={() => upsertDoaLog.mutateAsync({ ...entry, status: 'sudah' })} 
                              className="flex items-center gap-2" inset={false}
                            >
                              <Check className="h-3.5 w-3.5 text-green-600" />Tandai Sudah
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(entry.id)} className="flex items-center gap-2 text-destructive focus:text-destructive" inset={false}>
                            <Trash2 className="h-3.5 w-3.5" />Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Mobile Card View */}
                    <div className="sm:hidden px-4 py-3 bg-muted/20 border-t border-[#E5E7EB] dark:border-[#374151]">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Untuk: </span>
                        <span className="font-medium text-sm truncate">{entry.untuk_siapa || '—'}</span>
                      </div>
                      {entry.keterangan && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{entry.keterangan}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                          {displayStatus === 'sudah' && <Check className="h-2.5 w-2.5 mr-1" />}
                          {STATUS_OPTIONS.find(s => s.value === displayStatus)?.label}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Menu">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => handleEdit(entry)} className="flex items-center gap-2" inset={false}>
                              <Edit2 className="h-3.5 w-3.5" />Edit
                            </DropdownMenuItem>
                            {entry.status === 'belum' && (
                              <DropdownMenuItem onClick={() => upsertDoaLog.mutateAsync({ ...entry, status: 'sudah' })} className="flex items-center gap-2" inset={false}>
                                <Check className="h-3.5 w-3.5 text-green-600" />Tandai Sudah
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(entry.id)} className="flex items-center gap-2 text-destructive focus:text-destructive" inset={false}>
                              <Trash2 className="h-3.5 w-3.5" />Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}