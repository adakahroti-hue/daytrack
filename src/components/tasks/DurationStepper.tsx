"use client"

import { useCallback } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_HOURS = 12
const MINUTE_STEP = 5
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

interface DurationStepperProps {
  hours: number
  minutes: number
  onHoursChange: (h: number) => void
  onMinutesChange: (m: number) => void
}

/**
 * Timer picker for task estimation.
 * Two columns (Jam / Menit) with + and − buttons.
 * Minutes snap to 5-minute increments.
 */
export function DurationStepper({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
}: DurationStepperProps) {

  const incrementHours = useCallback(() => {
    onHoursChange(Math.min(hours + 1, MAX_HOURS))
  }, [hours, onHoursChange])

  const decrementHours = useCallback(() => {
    onHoursChange(Math.max(hours - 1, 0))
  }, [hours, onHoursChange])

  const incrementMinutes = useCallback(() => {
    const idx = MINUTES.indexOf(minutes)
    // If current minutes not on grid, round up to nearest
    const nextIdx = idx < 0 ? 1 : Math.min(idx + 1, MINUTES.length - 1)
    onMinutesChange(MINUTES[nextIdx])
  }, [minutes, onMinutesChange])

  const decrementMinutes = useCallback(() => {
    const idx = MINUTES.indexOf(minutes)
    // If current minutes not on grid, round down to nearest
    const prevIdx = idx < 0 ? 0 : Math.max(idx - 1, 0)
    onMinutesChange(MINUTES[prevIdx])
  }, [minutes, onMinutesChange])

  const totalMenit = hours * 60 + minutes
  const durasiText =
    totalMenit === 0
      ? 'Tidak ada estimasi'
      : totalMenit < 60
        ? `${totalMenit} menit`
        : totalMenit % 60 === 0
          ? `${hours} jam`
          : `${hours} jam ${minutes} menit`

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        {/* Jam Column */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Jam</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              onClick={decrementHours}
              disabled={hours <= 0}
              aria-label="Kurangi jam"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div
              className="flex items-center justify-center w-16 h-10 rounded-lg border border-border bg-background font-semibold text-lg tabular-nums"
              aria-live="polite"
            >
              {hours}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              onClick={incrementHours}
              disabled={hours >= MAX_HOURS}
              aria-label="Tambah jam"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Menit Column */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Menit</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              onClick={decrementMinutes}
              disabled={minutes <= 0 && hours === 0}
              aria-label="Kurangi menit"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div
              className="flex items-center justify-center w-16 h-10 rounded-lg border border-border bg-background font-semibold text-lg tabular-nums"
              aria-live="polite"
            >
              {minutes}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              onClick={incrementMinutes}
              disabled={minutes >= 55}
              aria-label="Tambah menit"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Ringkasan durasi */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/50">
        <span className="text-xs text-muted-foreground">Total:</span>
        <span className="text-sm font-medium text-foreground">{durasiText}</span>
        <span className="text-xs text-muted-foreground ml-auto">({totalMenit} menit)</span>
      </div>
    </div>
  )
}
