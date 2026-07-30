"use client"

import { useState, useEffect } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Droplets, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useWaterLog, useWaterLogRange, useWaterDailySummary, useUpsertWaterLog, useDeleteWaterLog } from '@/hooks/useMinumAirLogs'
import { useMinumAirLogRealtime } from '@/hooks/useRealtime'

const WATER_TIMES = [
  { key: 'setelah_bangun', label: 'Setelah Bangun', icon: '🌅', waktu: '05:30' },
  { key: 'pertengahan_pagi', label: 'Pertengahan Pagi', icon: '🌤️', waktu: '09:30' },
  { key: 'setelah_dzuhur', label: 'Setelah Dzuhur', icon: '🌞', waktu: '13:30' },
  { key: 'sebelum_maghrib', label: 'Sebelum Maghrib', icon: '🌅', waktu: '17:30' },
  { key: 'setelah_ashar', label: 'Setelah Ashar', icon: '🌥️', waktu: '16:00' },
  { key: 'setelah_isya', label: 'Setelah Isya', icon: '🌙', waktu: '20:00' },
] as const

type WaterKey = typeof WATER_TIMES[number]['key']

interface WaterLogEntry {
  id: string
  user_id: string
  tanggal: string
  waktu_baca: string
  jumlah_ml: number
  catatan: string | null
  created_at: string
  updated_at: string
}

const GLASS_ML = 250
const TARGET_ML = 2000

export default function MinumAirPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const { data: waterLogs = [], isLoading, error, refetch } = useWaterLog(dateKey)
  const { data: weeklyLogs = [] } = useWaterLogRange(
    format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const { data: dailySummary } = useWaterDailySummary(dateKey)
  const upsertWaterLog = useUpsertWaterLog()
  const deleteWaterLog = useDeleteWaterLog()

  useMinumAirLogRealtime(dateKey)

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleToggle = async (key: WaterKey) => {
    const existing = waterLogs.find(log => log.waktu_baca === key)
    await upsertWaterLog.mutateAsync({
      tanggal: dateKey,
      waktu_baca: key,
      jumlah_ml: existing ? 0 : GLASS_ML,
    })
    refetch()
  }

  if (!mounted) {
    return <div className="space-y-6"><div className="h-8 bg-muted animate-pulse rounded w-1/4" /></div>
  }

  const totalMl = waterLogs.reduce((sum, log) => sum + (log.jumlah_ml || 0), 0)
  const totalGelas = Math.round(totalMl / GLASS_ML)
  const progress = dailySummary?.persentase || Math.min(Math.round((totalMl / TARGET_ML) * 100), 100)
  const targetTercapai = dailySummary?.targetTercapai || totalMl >= TARGET_ML

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Minum Air</h1>
          <p className="text-sm text-muted-foreground">Pantau konsumsi air harian Anda</p>
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

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Target Harian
            <Droplets className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Droplets className="h-10 w-10 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span>{totalGelas} / 8 gelas</span>
                <span className={cn('font-semibold', targetTercapai ? 'text-green-600' : 'text-muted-foreground')}>
                  {targetTercapai ? '✓ Tercapai' : `${8 - totalGelas} gelas lagi`}
                </span>
              </div>
            </div>
          </div>
          
          {totalGelas > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-full border border-blue-500/30">
                {totalMl} ml total
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Water Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Jadwal Minum Air
            <span className="text-sm font-normal text-muted-foreground capitalize">
              {format(currentDate, 'EEEE', { locale: id })}
            </span>
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
              <Button variant="outline" onClick={() => refetch()} className="mt-2">Coba Lagi</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WATER_TIMES.map((time) => {
                const log = waterLogs.find(l => l.waktu_baca === time.key)
                const isDone = !!log && log.jumlah_ml > 0

                return (
                  <div
                    key={time.key}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all cursor-pointer',
                      isDone
                        ? 'border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10'
                        : 'border-muted/50 bg-muted/30 hover:border-primary/30'
                    )}
                    onClick={() => handleToggle(time.key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{time.icon}</span>
                        <div>
                          <p className="font-semibold text-lg">{time.label}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {time.waktu} • {isDone ? 'Sudah minum' : 'Belum minum'}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                        isDone ? 'bg-blue-500' : 'bg-muted'
                      )}>
                        {isDone ? <Check className="h-5 w-5 text-white" /> : <X className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>
                    {isDone && log && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        {log.jumlah_ml} ml
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statistik Minggu Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 bg-blue-500/10 rounded-xl">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalGelas}</p>
              <p className="text-sm text-muted-foreground">Hari Ini</p>
            </div>
            {weeklyLogs.length > 0 && (() => {
              const byDate = new Map<string, number>()
              weeklyLogs.forEach(l => byDate.set(l.tanggal, (byDate.get(l.tanggal) || 0) + l.jumlah_ml))
              const days = Array.from(byDate.values())
              const avgGelas = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length / GLASS_ML) : 0
              const targetDays = days.filter(d => d >= TARGET_ML).length
              
              return (
                <>
                  <div className="text-center p-4 bg-green-500/10 rounded-xl">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{avgGelas}</p>
                    <p className="text-sm text-muted-foreground">Rata-rata Gelas/Hari</p>
                  </div>
                  <div className="text-center p-4 bg-amber-500/10 rounded-xl">
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{targetDays}</p>
                    <p className="text-sm text-muted-foreground">Hari Tercapai Target</p>
                  </div>
                  <div className="text-center p-4 bg-purple-500/10 rounded-xl">
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{days.length}</p>
                    <p className="text-sm text-muted-foreground">Hari Tercatat</p>
                  </div>
                </>
              )
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Weekly History Table */}
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
                  {WATER_TIMES.map(t => <th key={t.key} className="pb-2 font-medium text-center">{t.icon}</th>)}
                  <th className="pb-2 font-medium text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 7 }, (_, i) => {
                  const date = subDays(endOfWeek(currentDate, { weekStartsOn: 1 }), i)
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const dayLogs = weeklyLogs.filter(log => log.tanggal === dateStr)
                  
                  return (
                    <tr key={dateStr} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 font-medium">{format(date, 'd MMM', { locale: id })}</td>
                      {WATER_TIMES.map(t => {
                        const log = dayLogs.find(l => l.waktu_baca === t.key)
                        const isDone = !!log && log.jumlah_ml > 0
                        return (
                          <td key={t.key} className="py-2 text-center">
                            {isDone ? (
                              <div className="w-6 h-6 mx-auto rounded-full bg-blue-500 flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 mx-auto rounded-full border border-muted flex items-center justify-center">
                                <X className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td className="py-2 text-center font-semibold text-blue-600">
                        {dayLogs.reduce((sum, l) => sum + (l.jumlah_ml || 0), 0) > 0 
                          ? Math.round(dayLogs.reduce((sum, l) => sum + (l.jumlah_ml || 0), 0) / GLASS_ML) + ' gelas'
                          : '—'}
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