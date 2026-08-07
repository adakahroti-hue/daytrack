"use client"

import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Clock, AlertCircle, Heart, Brain, Sparkles, Sun, BookOpen, Droplet, Moon, Smile, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { useTasks } from '@/hooks/useTasks'
import { usePrayerLog, usePrayerLogRange } from '@/hooks/usePrayerLogs'
import { useQuranLog } from '@/hooks/useQuranLogs'
import { useDoaLog } from '@/hooks/useDoaLogs'
import { useSyukurLog } from '@/hooks/useSyukurLogs'
import { useTidurLog } from '@/hooks/useTidurLogs'
import { useWaterLog } from '@/hooks/useMinumAirLogs'
import { useMasalahLog } from '@/hooks/useMasalahLogs'
import { usePmoLog } from '@/hooks/usePmoLogs'
import { useKesenangan } from '@/hooks/useKesenangan'
import { useSaranPerbaikan } from '@/hooks/useSaranPerbaikan'

interface CategorySummaryCardsProps {
  period: 'harian' | 'mingguan' | 'bulanan'
}

export function CategorySummaryCards({ period }: CategorySummaryCardsProps) {
  const now = new Date()
  const dateKey = format(now, 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const startDate = period === 'harian' ? dateKey : period === 'mingguan' ? weekStart : monthStart
  const endDate = period === 'harian' ? dateKey : period === 'mingguan' ? weekEnd : monthEnd

  // Tugas
  const { data: tasks = [] } = useTasks()
  const tasksTotal = tasks.length
  const tasksDone = tasks.filter((t: any) => t.status === 'selesai').length
  const tasksProses = tasks.filter((t: any) => t.status === 'proses').length

  // Ibadah - Sholat
  const { data: prayerData } = usePrayerLog(dateKey)
  const sholatDone = prayerData ? ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'].filter(k => prayerData[`sholat_${k}`]).length : 0
  const sholatTotal = 5

  // Ibadah - Quran
  const { data: quranData } = useQuranLog(dateKey)
  const quranDone = quranData && (quranData as any)?.halaman ? 1 : 0

  // Ibadah - Doa
  const { data: doaData } = useDoaLog(dateKey)
  const doaDone = doaData && (doaData as any)?.doa ? 1 : 0

  // Ibadah - Syukur
  const { data: syukurData } = useSyukurLog(dateKey)
  const syukurDone = syukurData && Array.isArray(syukurData) ? syukurData.length : 0

  // Kesehatan - Tidur
  const { data: tidurData } = useTidurLog(dateKey)
  const tidurDone = tidurData && (tidurData as any)?.jam_tidur ? 1 : 0

  // Kesehatan - Minum Air
  const { data: waterData } = useWaterLog(dateKey)
  const waterGlasses = waterData && (waterData as any)?.gelas ? (waterData as any).gelas : 0
  const waterTarget = 8

  // Mental - Masalah
  const { data: masalahData } = useMasalahLog(dateKey)
  const masalahDone = masalahData && (masalahData as any)?.deskripsi ? 1 : 0

  // Mental - PMO
  const { data: pmoData } = usePmoLog(dateKey)
  const pmoDone = pmoData && (pmoData as any)?.aktivitas ? 1 : 0

  // Perbaikan - Kesenangan
  const { data: kesenanganData } = useKesenangan(dateKey)
  const kesenanganDone = kesenanganData && (kesenanganData as any)?.aktivitas ? 1 : 0

  // Perbaikan - Masukan Daytrack (getter single → objek/null, BUKAN array — default [] hanya menangani undefined)
  const { data: saranData } = useSaranPerbaikan(dateKey)
  const saranTotal = saranData ? 1 : 0
  const saranDone = saranData && (saranData as any).status === 'selesai' ? 1 : 0

  // Category summaries
  const ibadahDone = sholatDone + quranDone + doaDone + syukurDone
  const ibadahTotal = sholatTotal + 3 // sholat + quran + doa + syukur

  const kesehatanDone = (tidurDone ? 1 : 0) + (waterGlasses >= waterTarget ? 1 : 0)
  const kesehatanTotal = 2
  const kesehatanProgress = waterGlasses > 0 ? `${waterGlasses}/${waterTarget} gelas` : ''

  const mentalDone = masalahDone + pmoDone
  const mentalTotal = 2

  const perbaikanDone = kesenanganDone + saranDone
  const perbaikanTotal = 1 + saranTotal

  const cards = [
    {
      title: 'Tugas',
      icon: CheckCircle2,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200/50 dark:border-blue-800/50',
      main: `${tasksDone}/${tasksTotal}`,
      sub: tasksProses > 0 ? `${tasksProses} proses` : 'Selesai',
      href: '/tugas',
    },
    {
      title: 'Ibadah',
      icon: Sun,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200/50 dark:border-emerald-800/50',
      main: `${ibadahDone}/${ibadahTotal}`,
      sub: `${sholatDone}/5 sholat`,
      href: '/sholat',
    },
    {
      title: 'Kesehatan',
      icon: Heart,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      border: 'border-rose-200/50 dark:border-rose-800/50',
      main: `${kesehatanDone}/${kesehatanTotal}`,
      sub: kesehatanProgress || 'Tidur & Air',
      href: '/tidur',
    },
    {
      title: 'Mental',
      icon: Brain,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      border: 'border-purple-200/50 dark:border-purple-800/50',
      main: `${mentalDone}/${mentalTotal}`,
      sub: mentalDone > 0 ? 'Termonitor' : 'Belum dicatat',
      href: '/masalah',
    },
    {
      title: 'Perbaikan',
      icon: Sparkles,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200/50 dark:border-amber-800/50',
      main: `${perbaikanDone}/${perbaikanTotal}`,
      sub: saranTotal > 0 ? `${saranDone}/${saranTotal} saran` : 'Kesenangan',
      href: '/kesenangan',
    },
  ]

  const periodLabel = period === 'harian' ? 'Hari Ini' : period === 'mingguan' ? 'Minggu Ini' : 'Bulan Ini'

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{periodLabel}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <Card
            key={card.title}
            className={cn('transition-all hover:shadow-md cursor-pointer', card.bg, card.border)}
            onClick={() => window.location.href = card.href}
          >
            <CardContent className="p-4 text-center">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2', card.bg)}>
                <card.icon className={cn('h-5 w-5', card.color)} />
              </div>
              <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
              <p className={cn('text-xl font-bold', card.color)}>{card.main}</p>
              <p className="text-[10px] text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
