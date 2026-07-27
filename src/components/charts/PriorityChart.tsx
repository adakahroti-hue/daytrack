"use client"

import * as RechartsPrimitive from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { getPriorityLabel, getPriorityColor } from '@/lib/utils'

interface PriorityChartProps {
  data: { p1: number; p2: number; p3: number; p4: number }
}

const COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--muted-foreground))']

const PRIORITIES = ['p1', 'p2', 'p3', 'p4'] as const

const CHART_CONFIG = {
  p1: { label: 'P1 - Urgent', color: 'hsl(var(--destructive))' },
  p2: { label: 'P2 - Tinggi', color: 'hsl(var(--warning))' },
  p3: { label: 'P3 - Sedang', color: 'hsl(var(--primary))' },
  p4: { label: 'P4 - Rendah', color: 'hsl(var(--muted-foreground))' },
}

export function PriorityChart({ data }: PriorityChartProps) {
  const chartData = PRIORITIES.map((priority) => ({
    name: getPriorityLabel(priority),
    value: data[priority],
  }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return (
      <div className="h-[300px] w-full sm:h-[350px] flex items-center justify-center">
        <p className="text-muted-foreground">Belum ada data prioritas</p>
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full sm:h-[350px]">
      <ChartContainer config={CHART_CONFIG}>
        <RechartsPrimitive.PieChart>
          <RechartsPrimitive.Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
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
