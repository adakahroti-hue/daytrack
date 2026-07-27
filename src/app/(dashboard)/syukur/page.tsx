"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSyukur, useUpsertSyukur } from '@/hooks/useSyukur'
import { useSyukurRealtime } from '@/hooks/useRealtime'

const STATUS_OPTIONS = [
  { value: 'ya', label: 'Ya, Sudah' },
  { value: 'tidak', label: 'Belum' },
] as const

export default function SyukurPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: syukurData, isLoading, error, refetch } = useSyukur(dateKey)
  const upsertSyukur = useUpsertSyukur()

  // Subscribe to realtime updates
  useSyukurRealtime([['syukur', dateKey]])

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleStatusChange = async (status: 'ya' | 'tidak') => {
    if (!syukurData) return
    
    await upsertSyukur.mutateAsync({
      tanggal: dateKey,
      hari: format(currentDate, 'EEEE', { locale: id }),
      status,
      keterangan: syukurData.keterangan,
    })
    
    refetch()
  }

  const handleKeteranganChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!syukurData) return
    
    await upsertSyukur.mutateAsync({
      tanggal: dateKey,
      hari: format(currentDate, 'EEEE', { locale: id }),
      status: syukurData.status,
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
            <Sparkles className="h-6 w-6 text-primary" />
            Syukur
          </h1>
          <p className="text-muted-foreground">Menulis syukur harian</p>
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

      {/* Syukur Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Status Syukur
            {syukurData && (
              <span className={cn(
                'text-sm font-normal px-2 py-1 rounded-full',
                syukurData.status === 'ya' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              )}>
                {syukurData.status === 'ya' ? 'Sudah' : 'Belum'}
              </span>
            )}
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
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                Coba Lagi
              </Button>
            </div>
          ) : syukurData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium w-24">Status</Label>
                <Select
                  value={syukurData.status}
                  onValueChange={(value) => handleStatusChange(value as 'ya' | 'tidak')}
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
                  value={syukurData.keterangan || ''}
                  onChange={handleKeteranganChange}
                  placeholder="Tulis keterangan syukur Anda..."
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Memuat data...</p>
          )}
        </CardContent>
      </Card>

      {syukurData && (
        <Card>
          <CardHeader>
            <CardTitle>Statistik Minggu Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 bg-green-500/10 rounded-xl">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">5</p>
                <p className="text-sm text-muted-foreground">Hari Syukur</p>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-xl">
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">2</p>
                <p className="text-sm text-muted-foreground">Hari Tidak Syukur</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-xl">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">71%</p>
                <p className="text-sm text-muted-foreground">Persentase</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}