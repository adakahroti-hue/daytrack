"use client"

import { format, startOfMonth, endOfMonth } from 'date-fns'
import { id } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryCards } from '@/components/overview/SummaryCards'
import { PriorityBreakdown } from '@/components/overview/PriorityBreakdown'
import { AspectBreakdown } from '@/components/overview/AspectBreakdown'
import { PriorityChart } from '@/components/charts/PriorityChart'
import { AspectChart } from '@/components/charts/AspectChart'
import { useHeaderControls } from '@/components/layout/HeaderControls'

interface PeriodData {
  summary: {
    total: number
    belum: number
    proses: number
    selesai: number
  }
  priority: { p1: number; p2: number; p3: number; p4: number }
  aspect: { psikis: number; produktivitas: number; keuangan: number; hubungan: number }
}

export default function OverviewBulananPage() {
  const { currentDate, navigate, goToToday, isToday, onRefresh, isLoading, title, description, period } = useHeaderControls()

  // Mock data for now
  const mockData: PeriodData = {
    summary: { total: 45, belum: 12, proses: 8, selesai: 25 },
    priority: { p1: 5, p2: 12, p3: 18, p4: 10 },
    aspect: { psikis: 8, produktivitas: 22, keuangan: 7, hubungan: 8 },
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SummaryCards
        data={{
          total: mockData.summary.total,
          belum: mockData.summary.belum,
          proses: mockData.summary.proses,
          selesai: mockData.summary.selesai,
        }}
        period="bulanan"
      />

      {/* Breakdown Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prioritas</CardTitle>
          </CardHeader>
          <CardContent>
            <PriorityBreakdown data={mockData.priority} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aspek</CardTitle>
          </CardHeader>
          <CardContent>
            <AspectBreakdown data={mockData.aspect} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Distribusi Prioritas</CardTitle>
          </CardHeader>
          <CardContent>
            <PriorityChart data={mockData.priority} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Distribusi Aspek</CardTitle>
          </CardHeader>
          <CardContent>
            <AspectChart data={mockData.aspect} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
