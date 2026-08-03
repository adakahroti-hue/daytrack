'use client'

import { SummaryCards } from '@/components/overview/SummaryCards'
import { PriorityBreakdown } from '@/components/overview/PriorityBreakdown'
import { AspectBreakdown } from '@/components/overview/AspectBreakdown'
import { SholatJourney } from '@/components/overview/SholatJourney'
import { CategorySummaryCards } from '@/components/overview/CategorySummaryCards'
import { useHeaderControls } from '@/components/layout/HeaderControls'

export default function OverviewPage() {
  const { period } = useHeaderControls()

  // Map period 'daily'|'weekly'|'monthly' to component's 'harian'|'mingguan'|'bulanan'
  const periodMap = { daily: 'harian' as const, weekly: 'mingguan' as const, monthly: 'bulanan' as const }
  const summaryPeriod = periodMap[period]

  return (
    <div className="space-y-6">
      <SummaryCards period={summaryPeriod} />
      <CategorySummaryCards period={summaryPeriod} />

      {/* Sholat Journey - only on harian and mingguan */}
      {(summaryPeriod === 'harian' || summaryPeriod === 'mingguan') && (
        <SholatJourney period={summaryPeriod} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PriorityBreakdown data={{ p1: 0, p2: 0, p3: 0, p4: 0 }} />
        <AspectBreakdown data={{ psikis: 0, produktivitas: 0, keuangan: 0, hubungan: 0 }} />
      </div>
    </div>
  )
}
