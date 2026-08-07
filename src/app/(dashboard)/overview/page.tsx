'use client'

import { format } from 'date-fns'
import { SummaryCards } from '@/components/overview/SummaryCards'
import { PriorityBreakdown } from '@/components/overview/PriorityBreakdown'
import { AspectBreakdown } from '@/components/overview/AspectBreakdown'
import { SholatJourney } from '@/components/overview/SholatJourney'
import { CategorySummaryCards } from '@/components/overview/CategorySummaryCards'
import { FocusTodaySection } from '@/components/overview/FocusTodaySection'
import { RoutineTodaySection } from '@/components/overview/RoutineTodaySection'
import { ReflectionSection } from '@/components/overview/ReflectionSection'
import { useHeaderControls } from '@/components/layout/HeaderControls'

export default function OverviewPage() {
  const { period, currentDate } = useHeaderControls()

  // Map period 'daily'|'weekly'|'monthly' to component's 'harian'|'mingguan'|'bulanan'
  const periodMap = { daily: 'harian' as const, weekly: 'mingguan' as const, monthly: 'bulanan' as const }
  const summaryPeriod = periodMap[period]
  const dateStr = format(currentDate, 'yyyy-MM-dd')

  // Revisi batch 9: tampilan harian mengikuti desain baru —
  // Fokus Hari Ini → Rutinitas Hari Ini → Catatan & Refleksi
  if (summaryPeriod === 'harian') {
    return (
      <div className="space-y-8">
        <FocusTodaySection dateStr={dateStr} />
        <RoutineTodaySection dateStr={dateStr} />
        <ReflectionSection dateStr={dateStr} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards period={summaryPeriod} />
      <CategorySummaryCards period={summaryPeriod} />

      {/* Sholat Journey - tampil pada mingguan */}
      {summaryPeriod === 'mingguan' && (
        <SholatJourney period={summaryPeriod} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PriorityBreakdown data={{ p1: 0, p2: 0, p3: 0, p4: 0 }} />
        <AspectBreakdown data={{ psikis: 0, produktivitas: 0, keuangan: 0, hubungan: 0 }} />
      </div>
    </div>
  )
}
