"use client"

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Menu, X, RefreshCw, Calendar, ChevronLeft, ChevronRight, Clock, CalendarDays, CalendarRange } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { usePathname } from 'next/navigation'
import { useHeaderControls, formatDateForPeriod, formatIndonesianDate } from './HeaderControls'

interface HeaderProps {
  onMenuClick: () => void
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
        <h1 className="text-lg font-semibold truncate">{title}</h1>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-4">
        {/* Date Navigation — left part of right side */}
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