"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Check, X, RotateCcw, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useQuran, useUpsertQuran, useToggleQuran } from '@/hooks/useQuran'
import { useQuranRealtime } from '@/hooks/useRealtime'

const QURAN_TIMES = [
  { key: 'setelah_subuh', label: 'Setelah Subuh', icon: '🌅' },
  { key: 'setelah_dzuhur', label: 'Setelah Dzuhur', icon: '🌤️' },
  { key: 'setelah_ashar', label: 'Setelah Ashar', icon: '🌥️' },
  { key: 'setelah_maghrib', label: 'Setelah Maghrib', icon: '🌅' },
  { key: 'setelah_isya', label: 'Setelah Isya', icon: '🌙' },
] as const

const ALASAN_OPTIONS = [
  { value: 'malas', label: 'Malas' },
  { value: 'lupa', label: 'Lupa' },
  { value: 'sibuk', label: 'Sibuk' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'perjalanan', label: 'Perjalanan' },
  { value: 'tak_ada_tempat', label: 'Tak Ada Tempat' },
  { value: 'bersama_teman', label: 'Bersama Teman' },
  { value: 'lainnya', label: 'Lainnya' },
] as const

type QuranKey = typeof QURAN_TIMES[number]['key']
type AlasanKey = typeof ALASAN_OPTIONS[number]['value']

export default function QuranPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: quranData, isLoading } = useQuran(dateKey)
  const upsertQuran = useUpsertQuran()
  const toggleQuran = useToggleQuran()

  // Subscribe to realtime updates
  useQuranRealtime([['quran', dateKey]])

  const handleQuranChange = async (key: QuranKey, checked: boolean) => {
    if (!quranData) return
    const newData = { ...quranData, [key]: checked }
    if (checked) {
      const alasanKey = `alasan_${key}` as keyof typeof quranData
      (newData as any)[alasanKey] = null
    }
    await upsertQuran.mutateAsync(newData)
  }

  const handleAlasanChange = async (key: QuranKey, alasan: AlasanKey) => {
    if (!quranData) return
    const newData = { ...quranData }
    const alasanKey = `alasan_${key}` as keyof typeof quranData
    (newData as any)[alasanKey] = alasan
    await upsertQuran.mutateAsync(newData)
  }

  const handleToggleQuran = async (key: QuranKey, checked: boolean, alasan?: string) => {
    await toggleQuran.mutateAsync({ tanggal: dateKey, quranTime: key, value: checked, alasan })
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  return (
    <div className="space-y-6">
      {/* Quran Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Bacaan Quran
            {quranData && (
              <span className="text-sm font-normal text-muted-foreground">
                {QURAN_TIMES.filter(t => quranData[t.key as QuranKey]).length} / {QURAN_TIMES.length} waktu
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : quranData ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {QURAN_TIMES.map((quran) => {
                const isDone = quranData[quran.key as QuranKey]
                const alasanKey = `alasan_${quran.key}` as keyof typeof quranData
                const alasan = quranData[alasanKey] as AlasanKey | null
                const alasanLabel = ALASAN_OPTIONS.find(a => a.value === alasan)?.label

                return (
                  <div
                    key={quran.key}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all',
                      isDone
                        ? 'border-green-500/50 bg-green-500/5 dark:bg-green-500/10'
                        : 'border-muted/50 bg-muted/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{quran.icon}</span>
                        <div>
                          <p className="font-semibold text-lg">{quran.label}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {isDone ? 'Sudah' : 'Belum'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={isDone ? 'default' : 'outline'}
                        size="icon"
                        className={cn('h-10 w-10', isDone ? 'bg-green-500' : '')}
                        onClick={() => handleToggleQuran(quran.key, !isDone)}
                      >
                        {isDone ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                      </Button>
                    </div>

                    {!isDone && (
                      <div className="mt-3 pt-3 border-t">
                        <Label className="text-xs text-muted-foreground mb-1 block">Alasan</Label>
                        <Select
                          value={alasan || ''}
                          onValueChange={(value) => handleAlasanChange(quran.key, value as AlasanKey)}
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
            <div className="text-center py-8">
              <p className="text-muted-foreground">Belum ada catatan bacaan Quran untuk hari ini</p>
              <p className="text-sm text-muted-foreground mt-1">Klik tombol di atas untuk mulai mencatat</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {quranData && (
        <Card>
          <CardHeader>
            <CardTitle>Statistik Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-4 bg-green-500/10 rounded-xl">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {QURAN_TIMES.filter(t => quranData[t.key as QuranKey]).length}
                </p>
                <p className="text-sm text-muted-foreground">Selesai</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-xl">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {QURAN_TIMES.filter(t => !quranData[t.key as QuranKey]).length}
                </p>
                <p className="text-sm text-muted-foreground">Belum</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-xl">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round((QURAN_TIMES.filter(t => quranData[t.key as QuranKey]).length / QURAN_TIMES.length) * 100)}%
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