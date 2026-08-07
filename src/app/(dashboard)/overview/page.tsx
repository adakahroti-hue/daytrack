'use client'

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { FocusTodaySection, type OverviewPeriod } from '@/components/overview/FocusTodaySection'
import { RoutineTodaySection } from '@/components/overview/RoutineTodaySection'
import { ReflectionSection } from '@/components/overview/ReflectionSection'
import { useHeaderControls } from '@/components/layout/HeaderControls'

// Revisi batch 11 & 12: tampilan mingguan/bulanan/tahunan mengikuti desain harian —
// struktur sama, hanya angkanya yang menyesuaikan rentang periode.
// 'kemarin' (yesterday) memakai desain harian dengan tanggal kemarin.
export default function OverviewPage() {
  const { period, currentDate } = useHeaderControls()

  const periodMap: Record<string, OverviewPeriod> = {
    daily: 'harian',
    yesterday: 'kemarin',
    weekly: 'mingguan',
    monthly: 'bulanan',
    yearly: 'tahunan',
  }
  const summaryPeriod: OverviewPeriod = periodMap[period] ?? 'harian'

  const rangeStart =
    summaryPeriod === 'mingguan' ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : summaryPeriod === 'bulanan' ? startOfMonth(currentDate)
    : summaryPeriod === 'tahunan' ? startOfYear(currentDate)
    : currentDate
  const rangeEnd =
    summaryPeriod === 'mingguan' ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : summaryPeriod === 'bulanan' ? endOfMonth(currentDate)
    : summaryPeriod === 'tahunan' ? endOfYear(currentDate)
    : currentDate

  const startStr = format(rangeStart, 'yyyy-MM-dd')
  const endStr = format(rangeEnd, 'yyyy-MM-dd')

  return (
    <div className="space-y-8">
      <FocusTodaySection startStr={startStr} endStr={endStr} period={summaryPeriod} />
      <RoutineTodaySection startStr={startStr} endStr={endStr} period={summaryPeriod} />
      <ReflectionSection startStr={startStr} endStr={endStr} period={summaryPeriod} />
    </div>
  )
}
