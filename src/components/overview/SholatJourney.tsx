"use client"

import { useMemo } from 'react'
import { format, startOfWeek, endOfWeek, subDays, isSameDay, startOfDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { Clock, CheckCircle2, AlertTriangle, Flame, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePrayerLog, usePrayerLogRange } from '@/hooks/usePrayerLogs'

interface SholatJourneyProps {
  period: 'harian' | 'mingguan' | 'bulanan'
}

export function SholatJourney({ period }: SholatJourneyProps) {
  const today = new Date()
  const dateKey = format(today, 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data: todayPrayer = null } = usePrayerLog(dateKey)
  const { data: weeklyLogs = [] } = usePrayerLogRange(weekStart, weekEnd)

  const PRAYER_TIMES = [
    { key: 'subuh', label: 'Subuh', short: 'Su' },
    { key: 'dzuhur', label: 'Dzuhur', short: 'Dz' },
    { key: 'ashar', label: 'Ashar', short: 'As' },
    { key: 'maghrib', label: 'Maghrib', short: 'Ma' },
    { key: 'isya', label: 'Isya', short: 'Is' },
  ] as const

  // Daily stats
  const todayCompleted = todayPrayer ? PRAYER_TIMES.filter(t => todayPrayer[`sholat_${t.key}`]).length : 0
  const todayTotal = PRAYER_TIMES.length
  const todayProgress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

  // Weekly stats
  const weekCompleted = weeklyLogs.length > 0
    ? PRAYER_TIMES.reduce((sum, t) => sum + (weeklyLogs.filter(l => l[`sholat_${t.key}`]).length), 0)
    : 0
  const weekTotal = PRAYER_TIMES.length * 7
  const weekProgress = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0
  const daysWithAllPrayers = weeklyLogs.filter(l => PRAYER_TIMES.every(t => l[`sholat_${t.key}`])).length

  // Streak
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
  const currentStreak = calculateStreak(weeklyLogs)

  return (
    <Card className="border-[#E5E7EB] dark:border-[#374151] rounded-xl">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {period === 'harian' ? 'Perjalanan Sholat Hari Ini' : 'Perjalanan Sholat Minggu Ini'}
            </h3>
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
            <a href="/sholat">
              Detail <ArrowRight className="h-3 w-3" />
            </a>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">
                {period === 'harian' ? 'Hari Ini' : 'Minggu Ini'}
              </span>
              <span className={cn(
                'font-semibold',
                period === 'harian'
                  ? todayProgress === 100 ? 'text-emerald-600' : 'text-amber-600'
                  : weekProgress === 100 ? 'text-emerald-600' : 'text-amber-600'
              )}>
                {period === 'harian'
                  ? `${todayCompleted}/${todayTotal} sholat`
                  : `${weekCompleted}/${weekTotal} sholat`}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: period === 'harian' ? `${todayProgress}%` : `${weekProgress}%`,
                  backgroundColor: period === 'harian' && todayProgress === 100 ? '#10B981' : '#F59E0B',
                }}
              />
            </div>
          </div>
          {period === 'mingguan' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg shrink-0">
              <Flame className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">{currentStreak} hari</span>
            </div>
          )}
          {period === 'mingguan' && daysWithAllPrayers > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700">{daysWithAllPrayers} hari penuh</span>
            </div>
          )}
        </div>

        {/* Prayer Chips - Daily */}
        {period === 'harian' && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {PRAYER_TIMES.map((prayer) => {
              const isDone = todayPrayer?.[`sholat_${prayer.key}`] === true
              return (
                <div
                  key={prayer.key}
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all',
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {prayer.short}
                </div>
              )
            })}
          </div>
        )}

        {/* Weekly Day Strips */}
        {period === 'mingguan' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {Array.from({ length: 7 }, (_, i) => {
              const date = subDays(endOfWeek(today, { weekStartsOn: 1 }), 6 - i)
              const dateStr = format(date, 'yyyy-MM-dd')
              const dayLogs = weeklyLogs.filter(log => log.tanggal === dateStr)
              const dayData = dayLogs[0]
              const isTodayW = isSameDay(date, today)
              const completed = dayData ? PRAYER_TIMES.filter(t => dayData[`sholat_${t.key}`]).length : 0
              const isComplete = dayData ? completed === PRAYER_TIMES.length : false
              const hasData = !!dayData

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all shrink-0 w-12',
                    isComplete ? 'bg-emerald-500/5 border border-emerald-200/50' : 'bg-muted/30 border border-transparent',
                    isTodayW && 'ring-1 ring-primary/30'
                  )}
                >
                  <span className={cn(
                    'text-[10px] font-medium',
                    isTodayW ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {format(date, 'EEE', { locale: id })}
                  </span>
                  <span className={cn(
                    'text-xs font-bold',
                    hasData ? (isComplete ? 'text-emerald-600' : 'text-amber-600') : 'text-muted-foreground/40'
                  )}>
                    {hasData ? `${completed}/5` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {period === 'harian' && todayCompleted === 0 && (
          <div className="text-center py-3 text-xs text-muted-foreground">
            Belum ada sholat yang tercatat hari ini
          </div>
        )}
      </CardContent>
    </Card>
  )
}