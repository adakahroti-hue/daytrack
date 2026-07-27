"use client"

import { Card, CardContent } from '@/components/ui/card'
import { cn, getPriorityColor, getPriorityLabel } from '@/lib/utils'

interface PriorityBreakdownProps {
  data: { p1: number; p2: number; p3: number; p4: number }
  total?: number
}

const priorities = ['p1', 'p2', 'p3', 'p4'] as const

export function PriorityBreakdown({ data, total }: PriorityBreakdownProps) {
  const computedTotal = total ?? (data.p1 + data.p2 + data.p3 + data.p4)

  return (
    <div className="space-y-3">
      {priorities.map((priority) => (
        <div key={priority} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className={cn('font-medium px-2 py-0.5 rounded', getPriorityColor(priority))}>
              {getPriorityLabel(priority)}
            </span>
            <span className="font-mono text-muted-foreground">{data[priority]}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', getPriorityColor(priority).replace('text-', 'bg-').replace('/10', ''))}
              style={{ width: `${computedTotal > 0 ? (data[priority] / computedTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground text-center mt-2">
        Total: {computedTotal} tugas
      </p>
    </div>
  )
}
