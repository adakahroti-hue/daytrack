"use client"

import { ChevronLeft, ChevronRight, Calendar, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PeriodNavigatorProps {
  periodLabel: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  isToday: boolean
}

export function PeriodNavigator({ periodLabel, onPrev, onNext, onToday, isToday }: PeriodNavigatorProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={onPrev} aria-label="Periode sebelumnya">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium whitespace-nowrap">{periodLabel}</span>
      </div>
      <Button variant="outline" size="icon" onClick={onNext} aria-label="Periode berikutnya">
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isToday && (
        <Button variant="ghost" size="icon" onClick={onToday} aria-label="Hari ini">
          <Home className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
