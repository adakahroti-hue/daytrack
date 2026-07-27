"use client"

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths, subWeeks, addWeeks, subDays, addDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryCards } from '@/components/overview/SummaryCards'
import { PriorityBreakdown } from '@/components/overview/PriorityBreakdown'
import { AspectBreakdown } from '@/components/overview/AspectBreakdown'
import { PriorityChart } from '@/components/charts/PriorityChart'
import { AspectChart } from '@/components/charts/AspectChart'

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
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [data, setData] = useState<PeriodData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = async (month: Date) => {
    setIsLoading(true)
    try {
      const start = format(startOfMonth(month), 'yyyy-MM-dd')
      const end = format(endOfMonth(month), 'yyyy-MM-dd')
      
      const response = await fetch(`/api/overview?start=${start}&end=${end}&period=monthly`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch overview:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Mock data for now
  const mockData: PeriodData = {
    summary: { total: 45, belum: 12, proses: 8, selesai: 25 },
    priority: { p1: 5, p2: 12, p3: 18, p4: 10 },
    aspect: { psikis: 8, produktivitas: 22, keuangan: 7, hubungan: 8 },
  }

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <div className="space-y-6">
      {/* Period Navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: id })}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={() => fetchData(currentMonth)} disabled={isLoading}>
          {isLoading ? 'Memuat...' : 'Refresh'}
        </Button>
      </div>

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
