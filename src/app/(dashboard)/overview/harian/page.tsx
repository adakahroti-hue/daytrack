"use client"

import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryCards } from '@/components/overview/SummaryCards'
import { PriorityBreakdown } from '@/components/overview/PriorityBreakdown'
import { AspectBreakdown } from '@/components/overview/AspectBreakdown'
import { useHeaderControls } from '@/components/layout/HeaderControls'

export default function HarianPage() {
  const { currentDate, isToday, title, description, period } = useHeaderControls()

  const periodLabel = format(currentDate, 'EEEE, d MMMM yyyy', { locale: id })

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SummaryCards period="harian" />

      {/* Breakdowns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prioritas</CardTitle>
          </CardHeader>
          <CardContent>
            <PriorityBreakdown data={{ p1: 1, p2: 1, p3: 1, p4: 0 }} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Aspek</CardTitle>
          </CardHeader>
          <CardContent>
            <AspectBreakdown data={{ psikis: 0, produktivitas: 2, keuangan: 1, hubungan: 0 }} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
