'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Menu, X, RefreshCw, Calendar, ChevronLeft, ChevronRight, Clock, CalendarDays, CalendarRange, Target, Zap, CheckCircle2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { usePathname } from 'next/navigation'
import { useHeaderControls, formatDateForPeriod, formatIndonesianDate } from './HeaderControls'
import { useTasks } from '@/hooks/useTasks'
import { getEstimasiText } from '@/lib/utils'
import Image from 'next/image'

interface HeaderProps {
  onMenuClick: () => void
}

// Inline stats for Hari Ini tab - shown next to date navigation
function HariIniHeaderStats() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayTasks = [] } = useTasks(today)
  
  const activeMissions = todayTasks.filter((t: any) => t.status === 'belum' || t.status === 'proses').length
  const totalEstimatedMinutes = todayTasks
    .filter((t: any) => t.status !== 'selesai')
    .reduce((sum: number, t: any) => sum + t.estimasi_menit, 0)
  const completedMissions = todayTasks.filter((t: any) => t.status === 'selesai').length
  const totalToday = todayTasks.length

  return (
    <div className="hidden md:flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg">
        <Target className="h-3.5 w-3.5 text-[#2563EB]" />
        <span className="text-xs font-semibold text-[#2563EB]">{activeMissions}</span>
        <span className="text-[10px] text-[#2563EB]/70">Aktif</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
        <Clock className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs font-semibold text-slate-700">{getEstimasiText(totalEstimatedMinutes)}</span>
      </div>
      {totalToday > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-green-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((completedMissions / totalToday) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-green-700">{completedMissions}/{totalToday}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline stats for Semua tab - Total (excluding completed), Terlambat, Proses
import { isBefore, startOfDay } from 'date-fns'
function SemuaHeaderStats() {
  const { data: allTasks = [] } = useTasks()
  
  const total = allTasks.filter((t: any) => t.status !== 'selesai').length
  const overdue = allTasks.filter((t: any) => {
    const taskDate = new Date(t.tanggal)
    return isBefore(taskDate, startOfDay(new Date())) && t.status !== 'selesai'
  }).length
  const inProgress = allTasks.filter((t: any) => t.status === 'proses').length

  return (
    <div className="hidden md:flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
        <Calendar className="h-3.5 w-3.5 text-slate-600" />
        <span className="text-xs font-semibold text-slate-700">{total}</span>
        <span className="text-[10px] text-slate-500/70">Total</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
        <span className="text-xs font-semibold text-red-700">{overdue}</span>
        <span className="text-[10px] text-red-600/70">Terlambat</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700">{inProgress}</span>
        <span className="text-[10px] text-amber-600/70">Proses</span>
      </div>
    </div>
  )
}

// Inline stats for Selesai tab - Total Selesai & Total Waktu
function SelesaiHeaderStats() {
  const { data: allTasks = [] } = useTasks()
  
  const totalSelesai = allTasks.filter((t: any) => t.status === 'selesai').length
  const totalEstimatedMinutes = allTasks
    .filter((t: any) => t.status === 'selesai')
    .reduce((sum: number, t: any) => sum + t.estimasi_menit, 0)

  return (
    <div className="hidden md:flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs font-semibold text-green-700">{totalSelesai}</span>
        <span className="text-[10px] text-green-600/70">Selesai</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
        <Clock className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs font-semibold text-slate-700">{getEstimasiText(totalEstimatedMinutes)}</span>
      </div>
    </div>
  )
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const {
    title,
    description,
    currentDate,
    period,
    navigate,
    goToToday,
    setPeriod,
    isToday,
  } = useHeaderControls()

  // Show period toggle only on Overview page
  const isOverviewPage = pathname === '/overview'
  // Show stats only on Hari Ini and Semua tabs
  const isHariIni = pathname === '/tugas/hari-ini'
  const isSemua = pathname === '/tugas/semua'
  const isSelesai = pathname === '/tugas/selesai'

  const periodLabels = {
    daily: { label: 'Harian', icon: Clock },
    weekly: { label: 'Mingguan', icon: CalendarDays },
    monthly: { label: 'Bulanan', icon: CalendarRange },
  }

  const handlePeriodChange = (key: 'daily' | 'weekly' | 'monthly') => {
    setPeriod(key)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 lg:px-4">
      {/* Mobile menu button — hamburger/X toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-10 w-10 flex-shrink-0"
        onClick={onMenuClick}
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5 text-primary" />
      </Button>

      {/* Page title & description — left side */}
      <div className="flex-1 min-w-0">
        <h1 className="flex items-center gap-2 text-lg font-semibold truncate">
          <Image
            src="/daytrack-logo.png"
            alt="Daytrack logo"
            width={22}
            height={22}
            className="h-[22px] w-[22px] shrink-0 rounded-md"
          />
          <span className="truncate">{title}</span>
        </h1>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Hari Ini Stats — only on tugas/hari-ini */}
        {isHariIni && <HariIniHeaderStats />}

        {/* Semua Stats — only on tugas/semua */}
        {isSemua && <SemuaHeaderStats />}

        {/* Selesai Stats — only on tugas/selesai */}
        {isSelesai && <SelesaiHeaderStats />}

        {/* Date Navigation — hidden on Hari Ini, Semua, and Selesai tabs */}
        {!isHariIni && !isSemua && !isSelesai && (
        <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
          {/* Desktop date navigation */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('prev')} aria-label="Periode sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium whitespace-nowrap">
                {formatDateForPeriod(currentDate, period)}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('next')} aria-label="Periode selanjutnya">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToToday} aria-label="Hari ini">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Mobile date display */}
          <div className="sm:hidden flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg border border-border">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {period === 'monthly'
                ? format(currentDate, 'MMM yyyy', { locale: id })
                : period === 'weekly'
                ? format(currentDate, 'd MMM', { locale: id })
                : format(currentDate, 'd MMM', { locale: id })}
            </span>
          </div>
        </div>
        )}

        {/* Period Toggle Group — only on Overview page */}
        {isOverviewPage && (
          <div className="w-[300px] hidden sm:flex flex-shrink-0">
            <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border w-full justify-center">
              {Object.entries(periodLabels).map(([key, { label, icon: Icon }]) => (
                <Button
                  key={key}
                  variant={period === key ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-28 px-2 gap-1 justify-center"
                  onClick={() => handlePeriodChange(key as 'daily' | 'weekly' | 'monthly')}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">{label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
