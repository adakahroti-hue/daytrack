"use client"

import { useState } from 'react'
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, subDays, addDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryCards } from '@/components/overview/SummaryCards'
import { PriorityBreakdown } from '@/components/overview/PriorityBreakdown'
import { AspectBreakdown } from '@/components/overview/AspectBreakdown'
import { PeriodNavigator } from '@/components/overview/PeriodNavigator'

export default function MingguanPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1))
  }

  const goToToday = () => setCurrentWeek(new Date())

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const periodLabel = `${format(weekStart, 'd MMM', { locale: id })} - ${format(weekEnd, 'd MMM yyyy', { locale: id })}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overview Mingguan</h1>
          <p className="text-muted-foreground">Ringkasan tugas minggu ini</p>
        </div>
        <PeriodNavigator
          periodLabel={periodLabel}
          onPrev={() => navigateWeek('prev')}
          onNext={() => navigateWeek('next')}
          onToday={goToToday}
          isToday={format(currentWeek, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
        />
      </div>

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
