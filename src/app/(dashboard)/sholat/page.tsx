"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { Check, X, RotateCcw, Flame, Target, Sunrise, Sun, Sunset, Moon, CloudSun, Calendar } from 'lucide-react'
import { CircularProgress } from '@/components/ui/CircularProgress'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { usePrayerLog, usePrayerLogRange, useUpsertPrayerLog, useTogglePrayer, useUpdatePrayerQuality, useQueryClient } from '@/hooks/usePrayerLogs'
import { usePrayerLogRealtime } from '@/hooks/useRealtime'
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

const PRAYER_TIMES = [
  { key: 'subuh', label: 'Subuh', time: '04:30 - 05:45', arabic: 'صَلَاةُ الفَجْرِ', icon: Sunrise },
  { key: 'dzuhur', label: 'Dzuhur', time: '11:45 - 13:15', arabic: 'صَلَاةُ الظُّهْرِ', icon: Sun },
  { key: 'ashar', label: 'Ashar', time: '15:00 - 16:30', arabic: 'صَلَاةُ العَصْرِ', icon: CloudSun },
  { key: 'maghrib', label: 'Maghrib', time: '18:00 - 19:15', arabic: 'صَلَاةُ المَغْرِبِ', icon: Sunset },
  { key: 'isya', label: 'Isya', time: '19:30 - 21:00', arabic: 'صَلَاةُ العِشَاءِ', icon: Moon },
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

  const queryClient = useQueryClient()
  const { data: prayerData, isLoading, error, refetch } = usePrayerLog(dateKey)
  const qualityUpdate = useUpdatePrayerQuality()
  const togglePrayer = useTogglePrayer()

  usePrayerLogRealtime(dateKey)

  // Optimistic quality update for instant UI response
  const handleQualitySelect = async (quality: QualityKey) => {
    if (!qualityDialog) return
    const prayerKey = qualityDialog.prayerKey

    // Optimistic update: update local cache immediately
    const prevData = prayerData
    if (prevData) {
      queryClient.setQueryData(["prayer_logs", dateKey], {
        ...prevData,
        [`kualitas_${prayerKey}`]: quality,
      })
    }

    setQualityDialog(null)

    try {
      await qualityUpdate.mutateAsync({
        tanggal: dateKey,
        prayerTime: prayerKey,
        quality,
      })
    } catch {
      // Rollback on failure
      if (prevData) {
        queryClient.setQueryData(["prayer_logs", dateKey], prevData)
      }
    }
  }

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

    // Fire mutation in background, don't await
    togglePrayer.mutate({
      tanggal: dateKey,
      prayerTime: key,
      value: checked,
      reason: checked ? undefined : (currentReason || 'lainnya'),
    })
    
    // Open quality dialog IMMEDIATELY for better UX
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

  const { data: monthlyLogs = [] } = usePrayerLogRange(
    format(startOfMonth(currentDate), 'yyyy-MM-dd'),
    format(endOfMonth(currentDate), 'yyyy-MM-dd')
  )

  const { data: yearlyLogs = [] } = usePrayerLogRange(
    format(startOfYear(currentDate), 'yyyy-MM-dd'),
    format(endOfYear(currentDate), 'yyyy-MM-dd')
  )

  // Stats helpers
  const getRangeStats = (logs: any[]) => {
    const uniqueDates = [...new Set(logs.map(log => log.tanggal))]
    let totalDone = 0
    let totalPrayers = uniqueDates.length * PRAYER_TIMES.length
    for (const log of logs) {
      for (const t of PRAYER_TIMES) {
        if (log[`sholat_${t.key}`]) totalDone++
      }
    }
    const percentage = totalPrayers > 0 ? Math.round((totalDone / totalPrayers) * 100) : 0
    return { totalDone, totalPrayers, percentage }
  }

  const completedCount = getCompletedCount()
  const progress = getProgress()

  const todayStats = { done: completedCount, total: PRAYER_TIMES.length, percentage: progress }
  const weekStats = getRangeStats(weeklyLogs)
  const monthStats = getRangeStats(monthlyLogs)
  const yearStats = getRangeStats(yearlyLogs)

  const currentStreak = calculateStreak(weeklyLogs)
  const bestStreak = Math.max(currentStreak, 0)

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold"></h1>
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
                const reasonOption = REASON_OPTIONS.find(r => r.value === reason)

                return (
                  <div
                    key={prayer.key}
                    className={cn(
                      'flex items-center justify-between gap-3 px-4 py-3 transition-colors',
                      isDone
                        ? 'bg-emerald-50 dark:bg-emerald-950/20'
                        : reason
                        ? 'bg-rose-50 dark:bg-rose-950/20'
                        : 'hover:bg-muted/30'
                    )}
                    style={{ minHeight: '60px' }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        isDone
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : reason
                          ? 'bg-rose-500/10 text-rose-600'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        <prayer.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-base truncate">{prayer.label}</p>
                          {isDone && (() => {
                            const quality = prayerData?.[`kualitas_${prayer.key}`] as QualityKey | null
                            const qualityOption = QUALITY_OPTIONS.find(q => q.value === quality)
                            if (!qualityOption) return (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border cursor-pointer" onClick={(e) => { e.stopPropagation(); setQualityDialog({ open: true, prayerKey: prayer.key }) }}>
                                Belum dinilai
                              </Badge>
                            )
                            return (
                              <Badge variant="outline" className={cn(
                                'text-[10px] px-1.5 py-0 cursor-pointer',
                                quality === 1 && 'border-red-300 text-red-600 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-950/30',
                                quality === 2 && 'border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400 dark:bg-yellow-950/30',
                                quality === 3 && 'border-green-300 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-400 dark:bg-green-950/30'
                              )} onClick={(e) => { e.stopPropagation(); setQualityDialog({ open: true, prayerKey: prayer.key }) }}>
                                {qualityOption.icon} {qualityOption.label}
                              </Badge>
                            )
                          })()}
                          {reason && !isDone && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-950/30">
                              {reasonOption?.icon} {reasonOption?.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {isDone ? (
                          <Check className="h-5 w-5 text-emerald-500" />
                        ) : reason ? (
                          <X className="h-5 w-5 text-rose-500" />
                        ) : (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className={cn('h-9 px-3 rounded-lg', 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50')}
                              onClick={() => handlePrayerChange(prayer.key, false)}
                              aria-label={`Tandai ${prayer.label} belum`}
                            >
                              <span>Belum</span>
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-9 px-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                              onClick={() => handlePrayerChange(prayer.key, true)}
                              aria-label={`Tandai ${prayer.label} sudah`}
                            >
                              <span>Sudah</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Circular Progress Charts - 3 Columns */}
      <div className="grid grid-cols-3 gap-4">
        <CircularProgress
          percentage={weekStats.percentage}
          size={70}
          strokeWidth={7}
          color="#3B82F6"
          bgColor="#BFDBFE"
          label="Minggu Ini"
          value={`${weekStats.totalDone}/${weekStats.totalPrayers}`}
        />
        <CircularProgress
          percentage={monthStats.percentage}
          size={70}
          strokeWidth={7}
          color="#8B5CF6"
          bgColor="#DDD6FE"
          label="Bulan Ini"
          value={`${monthStats.totalDone}/${monthStats.totalPrayers}`}
        />
        <CircularProgress
          percentage={yearStats.percentage}
          size={70}
          strokeWidth={7}
          color="#F59E0B"
          bgColor="#FDE68A"
          label="Tahun Ini"
          value={`${yearStats.totalDone}/${yearStats.totalPrayers}`}
        />
      </div>

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
                  onClick={() => handleQualitySelect(opt.value)}
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