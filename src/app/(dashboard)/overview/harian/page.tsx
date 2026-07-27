"use client"

import { useState } from 'react'
import { format, startOfDay, endOfDay, subDays, addDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryCards } from '@/components/overview/SummaryCards'
import { PriorityBreakdown } from '@/components/overview/PriorityBreakdown'
import { AspectBreakdown } from '@/components/overview/AspectBreakdown'
import { PeriodNavigator } from '@/components/overview/PeriodNavigator'

export default function HarianPage() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const periodLabel = format(currentDate, 'EEEE, d MMMM yyyy', { locale: id })
  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overview Harian</h1>
          <p className="text-muted-foreground">Ringkasan tugas hari ini</p>
        </div>
        <PeriodNavigator
          periodLabel={periodLabel}
          onPrev={() => navigateDay('prev')}
          onNext={() => navigateDay('next')}
          onToday={goToToday}
          isToday={isToday}
        />
      </div>

      <SummaryCards period="harian" />

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
