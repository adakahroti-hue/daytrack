"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Check, X, RotateCcw, Clock, Flame, Target, Sparkles, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { usePrayerLog, usePrayerLogRange, useUpsertPrayerLog, useTogglePrayer, useUpdatePrayerQuality } from '@/hooks/usePrayerLogs'
import { usePrayerLogRealtime } from '@/hooks/useRealtime'

const PRAYER_TIMES = [
  { key: 'subuh', label: 'Subuh', short: 'Su', time: '04:30 - 05:45', arabic: 'صَلَاةُ الفَجْرِ' },
  { key: 'dzuhur', label: 'Dzuhur', short: 'Dz', time: '11:45 - 13:15', arabic: 'صَلَاةُ الظُّهْرِ' },
  { key: 'ashar', label: 'Ashar', short: 'As', time: '15:00 - 16:30', arabic: 'صَلَاةُ العَصْرِ' },
  { key: 'maghrib', label: 'Maghrib', short: 'Ma', time: '18:00 - 19:15', arabic: 'صَلَاةُ المَغْرِبِ' },
  { key: 'isya', label: 'Isya', short: 'Is', time: '19:30 - 21:00', arabic: 'صَلَاةُ العِشَاءِ' },
] as const

const REASON_OPTIONS = [
  { value: 'lupa', label: 'Lupa', icon: '🤷' },
  { value: 'ketiduran', label: 'Ketiduran', icon: '😴' },
  { value: 'sibuk', label: 'Sibuk', icon: '💼' },
  { value: 'sakit', label: 'Sakit', icon: '🤒' },
  { value: 'perjalanan', label: 'Perjalanan', icon: '🚗' },
  { value: 'lainnya', label: 'Lainnya', icon: '📝' },
] as const

const QUALITY_OPTIONS = [
  { value: 1, label: 'Kurang fokus', icon: '😔', color: 'text-red-500' },
  { value: 2, label: 'Cukup baik', icon: '🙂', color: 'text-yellow-500' },
  { value: 3, label: 'Sangat baik', icon: '🤍', color: 'text-green-500' },
] as const

type PrayerKey = typeof PRAYER_TIMES[number]['key']
type ReasonKey = typeof REASON_OPTIONS[number]['value']
type QualityKey = typeof QUALITY_OPTIONS[number]['value']

export default function SholatPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [reasonDialog, setReasonDialog] = useState<{ open: boolean; prayerKey: PrayerKey; currentStatus: boolean } | null>(null)
  const [qualityDialog, setQualityDialog] = useState<{ open: boolean; prayerKey: PrayerKey } | null>(null)
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: prayerData, isLoading, error, refetch } = usePrayerLog(dateKey)
  const qualityUpdate = useUpdatePrayerQuality()
  const togglePrayer = useTogglePrayer()

  usePrayerLogRealtime(dateKey)

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handlePrayerChange = async (key: PrayerKey, checked: boolean) => {
    if (!prayerData && !checked) return
    
    const currentReason = prayerData ? prayerData[`alasan_${key}`] as ReasonKey | null : null

    if (!checked && !currentReason) {
      setReasonDialog({ open: true, prayerKey: key, currentStatus: checked })
      return
    }

    await togglePrayer.mutateAsync({
      tanggal: dateKey,
      prayerTime: key,
      value: checked,
      reason: checked ? undefined : (currentReason || 'lainnya'),
    })
    
    if (checked) {
      setQualityDialog({ open: true, prayerKey: key })
    }
    
    refetch()
  }

  const handleReasonSubmit = async (reason: ReasonKey) => {
    if (!reasonDialog) return
    
    await togglePrayer.mutateAsync({
      tanggal: dateKey,
      prayerTime: reasonDialog.prayerKey,
      value: false,
      reason,
    })
    
    setReasonDialog(null)
    refetch()
  }

  const handleQualitySubmit = async (quality: QualityKey) => {
    if (!qualityDialog) return

    await qualityUpdate.mutateAsync({
      tanggal: dateKey,
      prayerTime: qualityDialog.prayerKey,
      quality,
    })

    setQualityDialog(null)
  }

  const getCompletedCount = () => {
    if (!prayerData) return 0
    return PRAYER_TIMES.filter(t => prayerData[`sholat_${t.key}`]).length
  }

  const getProgress = () => {
    return Math.round((getCompletedCount() / PRAYER_TIMES.length) * 100)
  }

  const calculateStreak = (logs: any[]) => {
    let streak = 0
    const sortedDates = [...new Set(logs.map(log => log.tanggal))].sort((a, b) => b.localeCompare(a))
    for (const date of sortedDates) {
      const dayLogs = logs.filter(log => log.tanggal === date)
      const dayData = dayLogs[0]
      if (dayData) {
        const allDone = PRAYER_TIMES.every(t => dayData[`sholat_${t.key}`])
        if (allDone) streak++
        else break
      } else break
    }
    return streak
  }

  const { data: weeklyLogs = [] } = usePrayerLogRange(
    format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )

  const currentStreak = calculateStreak(weeklyLogs)
  const bestStreak = Math.max(currentStreak, 0)
  const completedCount = getCompletedCount()
  const progress = getProgress()

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            Sholat
          </h1>
          <p className="text-sm text-muted-foreground">Catat dan pantau sholat harian Anda</p>
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

      {/* Sholat Hari Ini - Compact List */}
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
              {PRAYER_TIMES.map((prayer) => {
                const isDone = prayerData?.[`sholat_${prayer.key}`] === true
                const reason = prayerData?.[`alasan_${prayer.key}`] as ReasonKey | null
                const reasonLabel = REASON_OPTIONS.find(r => r.value === reason)?.label

                return (
                  <div
                    key={prayer.key}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    style={{ minHeight: '60px' }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        isDone ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                      )}>
                        <span className="text-sm font-medium">{prayer.short}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{prayer.label}</p>
                        <p className="text-xs text-muted-foreground">{prayer.time}</p>
                        {reason && !isDone && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                            <X className="h-2.5 w-2.5" /> {reasonLabel}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isDone && (
                        <Badge variant="outline" className="text-xs px-2 py-1 bg-muted text-muted-foreground border-border">
                          Belum
                        </Badge>
                      )}
                      <Button
                        variant={isDone ? 'default' : 'outline'}
                        size="icon"
                        className={cn('h-9 w-9 rounded-lg', isDone && 'bg-emerald-500 hover:bg-emerald-600')}
                        onClick={() => handlePrayerChange(prayer.key, !isDone)}
                        aria-label={isDone ? `Batalkan ${prayer.label}` : `Tandai ${prayer.label} selesai`}
                      >
                        {isDone ? <Check className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kualitas Sholat - Compact with Badge */}
      {completedCount > 0 && (
        <Card className="border-emerald-200/50 dark:border-emerald-800/50 rounded-xl">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-emerald-500" />
              Kualitas Sholat Hari Ini
            </p>
            <div className="space-y-1.5">
              {PRAYER_TIMES.map((prayer) => {
                const isDone = prayerData?.[`sholat_${prayer.key}`] === true
                if (!isDone) return null

                const quality = prayerData?.[`kualitas_${prayer.key}`] as QualityKey | null
                const qualityOption = QUALITY_OPTIONS.find(q => q.value === quality)

                return (
                  <div
                    key={prayer.key}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-200/50 cursor-pointer hover:bg-emerald-500/10 transition-colors"
                    onClick={() => setQualityDialog({ open: true, prayerKey: prayer.key })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setQualityDialog({ open: true, prayerKey: prayer.key })}
                    aria-label={`Ubah kualitas ${prayer.label}: ${qualityOption ? qualityOption.label : 'Belum diisi'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{prayer.label}</p>
                        <p className="text-xs text-muted-foreground">{prayer.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {qualityOption ? (
                        <Badge variant="outline" className={cn(
                          'text-xs px-2 py-1',
                          quality === 1 && 'border-red-300 text-red-600 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-950/30',
                          quality === 2 && 'border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400 dark:bg-yellow-950/30',
                          quality === 3 && 'border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-400 dark:bg-green-950/30',
                        )}>
                          {qualityOption.icon} {qualityOption.label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs px-2 py-1 bg-muted text-muted-foreground border-border">
                          Belum
                        </Badge>
                      )}
                      <Sparkles className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {completedCount === 0 && (
        <div className="text-center py-4 px-4 text-sm text-muted-foreground bg-muted/30 rounded-xl border border-[#E5E7EB] dark:border-[#374151]">
          Belum ada sholat yang selesai hari ini. Kualitas akan muncul setelah menandai sholat selesai.
        </div>
      )}

      {/* Reason Dialog */}
      <Dialog open={!!reasonDialog} onOpenChange={(open) => !open && setReasonDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alasan Tidak Sholat</DialogTitle>
            <DialogDescription>
              Pilih alasan mengapa {reasonDialog ? PRAYER_TIMES.find(p => p.key === reasonDialog.prayerKey)?.label : 'sholat'} tidak dilakukan
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {REASON_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleReasonSubmit(opt.value)}
              >
                <span className="text-xl">{opt.icon}</span>
                {opt.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quality Dialog */}
      <Dialog open={!!qualityDialog} onOpenChange={(open) => !open && setQualityDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kualitas Sholat</DialogTitle>
            <DialogDescription>
              Bagaimana kualitas {qualityDialog ? PRAYER_TIMES.find(p => p.key === qualityDialog.prayerKey)?.label : 'sholat'} Anda?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {QUALITY_OPTIONS.map((opt) => {
              const currentQuality = prayerData?.[`kualitas_${qualityDialog?.prayerKey}`] as QualityKey | null
              return (
                <Button
                  key={opt.value}
                  variant={currentQuality === opt.value ? 'default' : 'outline'}
                  className="w-full justify-start gap-3"
                  onClick={() => handleQualitySubmit(opt.value)}
                >
                  <span className="text-xl" style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                  <span className="flex-1 text-left font-medium">{opt.label}</span>
                  {currentQuality === opt.value && <Check className="h-4 w-4 text-primary-foreground" />}
                </Button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}