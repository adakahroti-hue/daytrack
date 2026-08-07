'use client'

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { FocusTodaySection, type OverviewPeriod } from '@/components/overview/FocusTodaySection'
import { RoutineTodaySection } from '@/components/overview/RoutineTodaySection'
import { ReflectionSection } from '@/components/overview/ReflectionSection'
import { useHeaderControls } from '@/components/layout/HeaderControls'

// Revisi batch 11: tampilan mingguan & bulanan mengikuti desain harian —
// struktur sama, hanya angkanya yang menyesuaikan rentang periode.
export default function OverviewPage() {
  const { period, currentDate } = useHeaderControls()

  const periodMap = { daily: 'harian' as const, weekly: 'mingguan' as const, monthly: 'bulanan' as const }
  const summaryPeriod: OverviewPeriod = periodMap[period]

  const rangeStart =
    summaryPeriod === 'mingguan' ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : summaryPeriod === 'bulanan' ? startOfMonth(currentDate)
    : currentDate
  const rangeEnd =
    summaryPeriod === 'mingguan' ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : summaryPeriod === 'bulanan' ? endOfMonth(currentDate)
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
