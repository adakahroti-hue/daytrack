"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, RotateCcw, Shield, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { usePMO, useUpsertPMO } from '@/hooks/usePMO'
import { usePMORealtime } from '@/hooks/useRealtime'

export default function PMOPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: pmoData, isLoading, error, refetch } = usePMO(dateKey)
  const upsertPMO = useUpsertPMO()

  // Subscribe to realtime updates
  usePMORealtime([['pmo', dateKey]])

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleStatusChange = async (status: 'berhasil' | 'relapse') => {
    if (!pmoData) return
    
    await upsertPMO.mutateAsync({
      tanggal: dateKey,
      hari_ke: pmoData.hari_ke,
      nama_hari: format(currentDate, 'EEEE', { locale: id }),
      status,
      keterangan: pmoData.keterangan,
    })
    
    refetch()
  }

  const handleHariKeChange = async (value: string) => {
    if (!pmoData) return
    
    await upsertPMO.mutateAsync({
      tanggal: dateKey,
      hari_ke: parseInt(value),
      nama_hari: format(currentDate, 'EEEE', { locale: id }),
      status: pmoData.status,
      keterangan: pmoData.keterangan,
    })
    
    refetch()
  }

  const handleKeteranganChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!pmoData) return
    
    await upsertPMO.mutateAsync({
      tanggal: dateKey,
      hari_ke: pmoData.hari_ke,
      nama_hari: format(currentDate, 'EEEE', { locale: id }),
      status: pmoData.status,
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
            <Shield className="h-6 w-6 text-primary" />
            PMO Recovery
          </h1>
          <p className="text-muted-foreground">Tracking 7 hari recovery</p>
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

      {/* PMO Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Status Hari Ini
            {pmoData && (
              <span className={cn(
                'text-sm font-normal px-2 py-0.5 rounded-full flex items-center gap-1',
                pmoData.status === 'berhasil' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}>
                {pmoData.status === 'berhasil' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Berhasil
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Relapse
                  </>
                )}
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
          ) : pmoData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hari ke-</Label>
                <Select
                  value={pmoData.hari_ke.toString()}
                  onValueChange={handleHariKeChange}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Pilih hari" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button
                  variant={pmoData.status === 'berhasil' ? 'default' : 'outline'}
                  className="w-1/2"
                  onClick={() => handleStatusChange('berhasil')}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Berhasil
                </Button>
                <Button
                  variant={pmoData.status === 'relapse' ? 'destructive' : 'outline'}
                  className="w-1/2"
                  onClick={() => handleStatusChange('relapse')}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Relapse
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Keterangan</Label>
                <Textarea
                  value={pmoData.keterangan || ''}
                  onChange={handleKeteranganChange}
                  placeholder="Catatan perasaan, tantangan, atau motivasi..."
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Belum ada catatan PMO untuk hari ini</p>
              <p className="text-sm text-muted-foreground mt-1">Pilih hari ke dan status untuk mulai mencatat</p>
            </div>
          )}
        </CardContent>
      </Card>

      {pmoData && (
        <Card>
          <CardHeader>
            <CardTitle>Progress 7 Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <div key={day} className="flex-shrink-0 flex flex-col items-center gap-1 w-16">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                    day <= pmoData.hari_ke ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {day}
                  </div>
                  <span className="text-xs text-muted-foreground">Hari {day}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 bg-green-500/10 rounded-xl">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{pmoData.hari_ke}</p>
                <p className="text-sm text-muted-foreground">Hari ke-</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-xl">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{pmoData.status === 'berhasil' ? '✓' : '✗'}</p>
                <p className="text-sm text-muted-foreground">Status</p>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-xl">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{Math.round((pmoData.hari_ke / 7) * 100)}%</p>
                <p className="text-sm text-muted-foreground">Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}