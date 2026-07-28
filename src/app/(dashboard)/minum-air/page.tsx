"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, RotateCcw, Droplets, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useMinumAir, useToggleMinumAir } from '@/hooks/useMinumAir'
import { useMinumAirRealtime } from '@/hooks/useRealtime'

const WATER_TIMES = [
  { key: 'setelah_bangun', label: 'Setelah Bangun', icon: '🌅' },
  { key: 'pertengahan_pagi', label: 'Pertengahan Pagi', icon: '🌤️' },
  { key: 'setelah_dzuhur', label: 'Setelah Dzuhur', icon: '🌞' },
  { key: 'sebelum_maghrib', label: 'Sebelum Maghrib', icon: '🌅' },
  { key: 'setelah_ashar', label: 'Setelah Ashar', icon: '🌥️' },
  { key: 'setelah_isya', label: 'Setelah Isya', icon: '🌙' },
] as const

type WaterKey = typeof WATER_TIMES[number]['key']

export default function MinumAirPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: minumAirData, isLoading, error, refetch } = useMinumAir(dateKey)
  const toggleMinumAir = useToggleMinumAir()

  // Subscribe to realtime updates
  useMinumAirRealtime([['minum_air', dateKey]])

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleChange = async (key: WaterKey, checked: boolean) => {
    await toggleMinumAir.mutateAsync({
      tanggal: dateKey,
      time: key,
      value: checked,
    })
    refetch()
  }

  const doneCount = minumAirData ? WATER_TIMES.filter(t => minumAirData[t.key]).length : 0

  return (
    <div className="space-y-6">
      {/* Water Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Jadwal Minum Air
            {minumAirData && (
              <span className="text-sm font-normal text-muted-foreground">
                {doneCount} / {WATER_TIMES.length} gelas
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
          ) : minumAirData ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {WATER_TIMES.map((time) => {
                const isDone = minumAirData[time.key]

                return (
                  <div
                    key={time.key}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all',
                      isDone
                        ? 'border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10'
                        : 'border-muted/50 bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{time.icon}</span>
                        <div>
                          <p className="font-semibold text-lg">{time.label}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {isDone ? 'Sudah' : 'Belum'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={isDone ? 'default' : 'outline'}
                        size="icon"
                        className={cn('h-10 w-10', isDone ? 'bg-blue-500' : '')}
                        onClick={() => handleChange(time.key, !isDone)}
                      >
                        {isDone ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Belum ada catatan minum air untuk hari ini</p>
              <p className="text-sm text-muted-foreground mt-1">Klik tombol di atas untuk mulai mencatat</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {minumAirData && (
        <Card>
          <CardHeader>
            <CardTitle>Statistik Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 bg-blue-500/10 rounded-xl">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {doneCount}
                </p>
                <p className="text-sm text-muted-foreground">Sudah Minum</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-xl">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {WATER_TIMES.length - doneCount}
                </p>
                <p className="text-sm text-muted-foreground">Belum Minum</p>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-xl">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {Math.round((doneCount / WATER_TIMES.length) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Tercapai</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}