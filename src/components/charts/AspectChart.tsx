"use client"

import * as RechartsPrimitive from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { getAspectLabel } from '@/lib/utils'

interface AspectChartProps {
  data: { psikis: number; produktivitas: number; keuangan: number; hubungan: number }
}

const ASPECTS = ['psikis', 'produktivitas', 'keuangan', 'hubungan'] as const

const CHART_CONFIG = {
  psikis: { label: 'Psikis', color: 'hsl(var(--purple))' },
  produktivitas: { label: 'Produktivitas', color: 'hsl(var(--primary))' },
  keuangan: { label: 'Keuangan', color: 'hsl(var(--success))' },
  hubungan: { label: 'Hubungan', color: 'hsl(var(--pink))' },
}

const COLORS = [
  'hsl(var(--purple))',
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--pink))',
]

export function AspectChart({ data }: AspectChartProps) {
  const chartData = ASPECTS.map((aspect) => ({
    name: getAspectLabel(aspect),
    value: data[aspect],
  }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return (
      <div className="w-full min-h-[280px] flex items-center justify-center">
        <p className="text-muted-foreground">Belum ada data aspek</p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-[280px]">
      <ChartContainer config={CHART_CONFIG}>
        <RechartsPrimitive.PieChart>
          <RechartsPrimitive.Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={110}
            label={({ name, percent }) => total > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
            labelLine={false}
          >
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend>
              <ChartLegendContent />
            </ChartLegend>
            {chartData.map((item, index) => (
              <RechartsPrimitive.Cell key={item.name} fill={COLORS[index]} />
            ))}
          </RechartsPrimitive.Pie>
        </RechartsPrimitive.PieChart>
      </ChartContainer>
    </div>
  )
}