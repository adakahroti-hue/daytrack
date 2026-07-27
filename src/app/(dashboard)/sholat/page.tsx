"use client"

import { useState } from 'react'
import { format, subDays, addDays, startOfDay, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Check, X, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSholat, useUpsertSholat, useToggleSholat } from '@/hooks/useSholat'
import { useSholatRealtime } from '@/hooks/useRealtime'

const SHOLAT_TIMES = [
  { key: 'subuh', label: 'Subuh', icon: '🌅' },
  { key: 'dhuha', label: 'Dhuha', icon: '☀️' },
  { key: 'dzuhur', label: 'Dzuhur', icon: '🌤️' },
  { key: 'ashar', label: 'Ashar', icon: '🌥️' },
  { key: 'maghrib', label: 'Maghrib', icon: '🌅' },
  { key: 'isya', label: 'Isya', icon: '🌙' },
] as const

const ALASAN_OPTIONS = [
  { value: 'malas', label: 'Malas' },
  { value: 'lupa', label: 'Lupa' },
  { value: 'sibuk', label: 'Sibuk' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'perjalanan', label: 'Perjalanan' },
  { value: 'tak_ada_tempat', label: 'Tak Ada Tempat Sholat' },
  { value: 'bersama_teman', label: 'Bersama Teman' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

type SholatKey = typeof SHOLAT_TIMES[number]['key']
type AlasanKey = typeof ALASAN_OPTIONS[number]['value']

export default function SholatPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: sholatData, isLoading, error, refetch } = useSholat(dateKey)
  const upsertSholat = useUpsertSholat()
  const toggleSholat = useToggleSholat()

  // Subscribe to realtime updates
  useSholatRealtime([['sholat', dateKey]])

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleSholatChange = async (key: SholatKey, checked: boolean) => {
    if (!sholatData) return
    const newAlasan = checked ? undefined : (sholatData[`alasan_${key}` as keyof typeof sholatData] as AlasanKey | undefined)
    
    await toggleSholat.mutateAsync({
      tanggal: dateKey,
      sholatTime: key,
      value: checked,
      alasan: newAlasan,
    })
    
    refetch()
  }

  const handleAlasanChange = async (key: SholatKey, alasan: AlasanKey) => {
    if (!sholatData) return
    
    await upsertSholat.mutateAsync({
      tanggal: dateKey,
      hari: format(currentDate, 'EEEE', { locale: id }),
      [key]: sholatData[key],
      ...SHOLAT_TIMES.reduce((acc, t) => ({ ...acc, [t.key]: sholatData?.[t.key as SholatKey] ?? false }), {}),
      [`alasan_${key}`]: alasan,
    } as any)
    
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sholat</h1>
          <p className="text-muted-foreground">Catat kehadiran sholat 5 waktu + Dhuha</p>
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

      {/* Sholat Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Jadwal Sholat
            {sholatData && (
              <span className="text-sm font-normal text-muted-foreground">
                {SHOLAT_TIMES.filter(t => sholatData[t.key as SholatKey]).length} / {SHOLAT_TIMES.length} sholat
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
          ) : sholatData ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SHOLAT_TIMES.map((sholat) => {
                const isDone = sholatData[sholat.key as SholatKey]
                const alasanKey = `alasan_${sholat.key}` as keyof typeof sholatData
                const alasan = sholatData[alasanKey] as AlasanKey | null
                const alasanLabel = ALASAN_OPTIONS.find(a => a.value === alasan)?.label

                return (
                  <div
                    key={sholat.key}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all',
                      isDone
                        ? 'border-green-500/50 bg-green-500/5 dark:bg-green-500/10'
                        : 'border-muted/50 bg-muted/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{sholat.icon}</span>
                        <div>
                          <p className="font-semibold text-lg">{sholat.label}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {isDone ? 'Sudah' : 'Belum'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={isDone ? 'default' : 'outline'}
                        size="icon"
                        className={cn('h-10 w-10', isDone ? 'bg-green-500' : '')}
                        onClick={() => handleSholatChange(sholat.key, !isDone)}
                      >
                        {isDone ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                      </Button>
                    </div>

                    {!isDone && (
                      <div className="mt-3 pt-3 border-t">
                        <Label className="text-xs text-muted-foreground mb-1 block">Alasan</Label>
                        <Select
                          value={alasan || ''}
                          onValueChange={(value) => handleAlasanChange(sholat.key, value as AlasanKey)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih alasan..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ALASAN_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {isDone && alasan && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">Alasan tadi: {alasanLabel}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Memuat data...</p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {sholatData && (
        <Card>
          <CardHeader>
            <CardTitle>Statistik Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 bg-green-500/10 rounded-xl">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {SHOLAT_TIMES.filter(t => sholatData[t.key as SholatKey]).length}
                </p>
                <p className="text-sm text-muted-foreground">Sholat Selesai</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-xl">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {SHOLAT_TIMES.filter(t => !sholatData[t.key as SholatKey]).length}
                </p>
                <p className="text-sm text-muted-foreground">Belum Sholat</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-xl">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round((SHOLAT_TIMES.filter(t => sholatData[t.key as SholatKey]).length / SHOLAT_TIMES.length) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Persentase</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}