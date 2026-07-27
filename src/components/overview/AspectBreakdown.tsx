"use client"

import { Card, CardContent } from '@/components/ui/card'
import { cn, getAspectColor, getAspectLabel } from '@/lib/utils'

interface AspectBreakdownProps {
  data: { psikis: number; produktivitas: number; keuangan: number; hubungan: number }
  total?: number
}

const aspects = ['psikis', 'produktivitas', 'keuangan', 'hubungan'] as const

export function AspectBreakdown({ data, total }: AspectBreakdownProps) {
  const computedTotal = total ?? (data.psikis + data.produktivitas + data.keuangan + data.hubungan)

  return (
    <div className="space-y-3">
      {aspects.map((aspect) => (
        <div key={aspect} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className={cn('font-medium px-2 py-0.5 rounded', getAspectColor(aspect))}>
              {getAspectLabel(aspect)}
            </span>
            <span className="font-mono text-muted-foreground">{data[aspect]}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', getAspectColor(aspect).replace('text-', 'bg-').replace('/10', ''))}
              style={{ width: `${computedTotal > 0 ? (data[aspect] / computedTotal) * 100 : 0}%` }}
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
