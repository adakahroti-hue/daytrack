"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, LogOut, User, Menu, RefreshCw, Calendar, ChevronLeft, ChevronRight, Clock, LayoutDashboard, CalendarDays, CalendarRange } from 'lucide-react'
import { format, subDays, addDays, isSameDay, startOfDay, subMonths, addMonths, subWeeks, addWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { useHeaderControls, formatDateForPeriod } from './HeaderControls'

interface HeaderProps {
  onMenuClick: () => void
  onSidebarToggle: () => void
}

export function Header({ onMenuClick, onSidebarToggle }: HeaderProps) {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
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

  const handleSignOut = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const periodLabels = {
    daily: { label: 'Harian', icon: Clock },
    weekly: { label: 'Mingguan', icon: CalendarDays },
    monthly: { label: 'Bulanan', icon: CalendarRange },
  }

  const getPeriodLabel = () => periodLabels[period]?.label || 'Tanggal'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 lg:px-4">
      {/* Mobile menu button - only on mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5 text-primary" />
      </Button>

      {/* Page title & description - left side */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold truncate">{title}</h1>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>

      {/* Period selector & Date picker & Refresh - right side */}
      <div className="flex items-center gap-2">
        {/* Period Selector */}
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border">
                  {Object.entries(periodLabels).map(([key, { label, icon: Icon }]) => (
                    <Button
                      key={key}
                      variant={period === key ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 px-3 gap-1"
                      onClick={() => setPeriod(key as 'daily' | 'weekly' | 'monthly')}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </Button>
                  ))}
                </div>

        {/* Date navigation */}
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

        {/* Refresh button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => window.location.reload()}
          aria-label="Refresh halaman"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src="/avatar.png" alt="" />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Pengguna</p>
                <p className="text-xs leading-none text-muted-foreground">user@daytrack.app</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Keluar...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}