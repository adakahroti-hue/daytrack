"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, RotateCcw, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useTidur, useUpsertTidur } from '@/hooks/useTidur'
import { useTidurRealtime } from '@/hooks/useRealtime'

const STATUS_OPTIONS = [
  { value: 'tepat', label: 'Tepat Waktu' },
  { value: 'begadang', label: 'Begadang' },
] as const

export default function TidurPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: tidurData, isLoading, error, refetch } = useTidur(dateKey)
  const upsertTidur = useUpsertTidur()

  // Subscribe to realtime updates
  useTidurRealtime([['tidur', dateKey]])

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleStatusChange = async (status: 'tepat' | 'begadang') => {
    if (!tidurData) return
    
    await upsertTidur.mutateAsync({
      tanggal: dateKey,
      hari: format(currentDate, 'EEEE', { locale: id }),
      status,
      keterangan: tidurData.keterangan,
    })
    
    refetch()
  }

  const handleKeteranganChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!tidurData) return
    
    await upsertTidur.mutateAsync({
      tanggal: dateKey,
      hari: format(currentDate, 'EEEE', { locale: id }),
      status: tidurData.status,
      keterangan: e.target.value,
    })
    
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Moon className="h-6 w-6 text-primary" />
            Tidur
          </h1>
          <p className="text-muted-foreground">Catat pola tidur harian</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium whitespace-nowrap">
              {format(currentDate, 'EEEE, d MMMM yyyy', { locale: id })}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateDay('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="ghost" size="icon" onClick={goToToday}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tidur Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Status Tidur
            {tidurData && (
              <span className={cn(
                'text-sm font-normal px-2 py-1 rounded-full',
                tidurData.status === 'tepat' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              )}>
                {tidurData.status === 'tepat' ? 'Tepat Waktu' : 'Begadang'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-8">
              <p>Gagal memuat data: {error.message}</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                Coba Lagi
              </Button>
            </div>
          ) : tidurData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium w-24">Status</Label>
                <Select
                  value={tidurData.status}
                  onValueChange={(value) => handleStatusChange(value as 'tepat' | 'begadang')}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Pilih status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Keterangan</Label>
                <Textarea
                  value={tidurData.keterangan || ''}
                  onChange={handleKeteranganChange}
                  placeholder="Catatan: jam tidur, durasi, kualitas..."
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Belum ada catatan tidur untuk hari ini</p>
              <p className="text-sm text-muted-foreground mt-1">Pilih status dan tambahkan keterangan untuk mulai mencatat</p>
            </div>
          )}
        </CardContent>
      </Card>

      {tidurData && (
        <Card>
          <CardHeader>
            <CardTitle>Statistik Minggu Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 bg-green-500/10 rounded-xl">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">5</p>
                <p className="text-sm text-muted-foreground">Hari Tepat Waktu</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-xl">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">2</p>
                <p className="text-sm text-muted-foreground">Hari Begadang</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-xl">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">71%</p>
                <p className="text-sm text-muted-foreground">Konsistensi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}