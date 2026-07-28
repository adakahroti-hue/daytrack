"use client"

import { format, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryCards } from '@/components/overview/SummaryCards'
import { PriorityBreakdown } from '@/components/overview/PriorityBreakdown'
import { AspectBreakdown } from '@/components/overview/AspectBreakdown'
import { useHeaderControls } from '@/components/layout/HeaderControls'

export default function MingguanPage() {
  const { currentDate, isToday, title, description, period } = useHeaderControls()

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SummaryCards period="mingguan" />

      {/* Breakdowns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prioritas</CardTitle>
          </CardHeader>
          <CardContent>
            <PriorityBreakdown data={{ p1: 2, p2: 3, p3: 5, p4: 2 }} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Aspek</CardTitle>
          </CardHeader>
          <CardContent>
            <AspectBreakdown data={{ psikis: 2, produktivitas: 6, keuangan: 3, hubungan: 1 }} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
