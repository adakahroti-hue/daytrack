"use client"

import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryCardsProps {
  period: 'bulanan' | 'mingguan' | 'harian'
  data?: {
    total: number
    belum: number
    proses: number
    selesai: number
  }
}

const cards = [
  { title: 'Total Tugas', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { title: 'Belum Dikerjakan', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  { title: 'Sedang Proses', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { title: 'Selesai', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
]

// Mock data for now - will be replaced with real data fetching
const mockData = {
  bulanan: { total: 45, belum: 18, proses: 12, selesai: 15 },
  mingguan: { total: 12, belum: 5, proses: 3, selesai: 4 },
  harian: { total: 3, belum: 1, proses: 1, selesai: 1 },
}

export function SummaryCards({ period, data }: SummaryCardsProps) {
  const summaryData = data || mockData[period]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const values = [summaryData.total, summaryData.belum, summaryData.proses, summaryData.selesai]
        return (
          <Card key={card.title} className="transition-all hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold">{values[index]}</p>
                </div>
                <div className={cn('p-3 rounded-xl', card.bg)}>
                  <card.icon className={cn('h-6 w-6', card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
