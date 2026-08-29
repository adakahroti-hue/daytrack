'use client'

import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { type OverviewPeriod } from '@/components/overview/FocusTodaySection'
import { RoutineTodaySection } from '@/components/overview/RoutineTodaySection'
import { useHeaderControls, getShotRange } from '@/components/layout/HeaderControls'

// Revisi batch 18: kartu "Tugas" digabung ke grid Rutinitas (tema hitam-putih).
// Revisi batch 26: hapus ReflectionSection (card Mental duplikat di mingguan/bulanan/tahunan) —
// card Mental kini hanya dirender oleh RoutineTodaySection (acuan desain filter harian).
export default function OverviewPage() {
  const { period, currentDate } = useHeaderControls()

  const periodMap: Record<string, OverviewPeriod> = {
    daily: 'harian',
    yesterday: 'kemarin',
    weekly: 'mingguan',
    shot: 'shot',
    monthly: 'bulanan',
    yearly: 'tahunan',
  }
  const summaryPeriod: OverviewPeriod = periodMap[period] ?? 'harian'

  const [shotStart, shotEnd] = getShotRange(currentDate)
  const rangeStart =
    summaryPeriod === 'mingguan' ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : summaryPeriod === 'shot' ? shotStart
    : summaryPeriod === 'bulanan' ? startOfMonth(currentDate)
    : summaryPeriod === 'tahunan' ? startOfYear(currentDate)
    : currentDate
  const rangeEnd =
    summaryPeriod === 'mingguan' ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : summaryPeriod === 'shot' ? shotEnd
    : summaryPeriod === 'bulanan' ? endOfMonth(currentDate)
    : summaryPeriod === 'tahunan' ? endOfYear(currentDate)
    : currentDate

  const startStr = format(rangeStart, 'yyyy-MM-dd')
  const endStr = format(rangeEnd, 'yyyy-MM-dd')

  // Metrik di-cap ke hari ini (jangan hitung hari yang belum dilewati) — khusus shot.
  // Tampilan durasi/rentang tetap full Minggu–Sabtu (pakai endStr di atas).
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const metricEndStr = summaryPeriod === 'shot' && endStr > todayStr ? todayStr : endStr

  return (
    <div className="space-y-3">
      <RoutineTodaySection startStr={startStr} endStr={endStr} metricEndStr={metricEndStr} period={summaryPeriod} />
    </div>
  )
}
