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
import { Loader2, LogOut, User, Menu, RefreshCw, Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { format, subDays, addDays, isSameDay, startOfDay } from 'date-fns'
import { id } from 'date-fns/locale'

interface HeaderProps {
  onMenuClick: () => void
  onSidebarToggle: () => void
}

export function Header({ onMenuClick, onSidebarToggle }: HeaderProps) {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  const handleSignOut = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const getPageInfo = () => {
    const info: Record<string, { title: string; description: string }> = {
      '/overview/bulanan': { title: 'Overview Bulanan', description: 'Ringkasan aktivitas bulanan Anda' },
      '/overview/mingguan': { title: 'Overview Mingguan', description: 'Ringkasan aktivitas mingguan Anda' },
      '/overview/harian': { title: 'Overview Harian', description: 'Ringkasan aktivitas harian Anda' },
      '/jadwal-tugas': { title: 'Jadwal Tugas', description: 'Kelola dan catat jadwal tugas harian' },
      '/sholat': { title: 'Sholat', description: 'Catat kehadiran sholat 5 waktu + Dhuha' },
      '/quran': { title: 'Quran', description: 'Catat membaca Quran setelah sholat 5 waktu' },
      '/doa': { title: 'Doa', description: 'Catat doa harian Anda' },
      '/syukur': { title: 'Syukur', description: 'Menulis syukur harian' },
      '/tidur': { title: 'Tidur', description: 'Catat pola tidur harian' },
      '/masalah': { title: 'Masalah', description: 'Catat dan kelola masalah' },
      '/minum-air': { title: 'Minum Air', description: 'Target 6 kali minum air sehari' },
      '/pmo': { title: 'PMO Recovery', description: 'Tracking 7 hari recovery' },
      '/kesenangan': { title: 'Kesenangan', description: 'Catat momen kesenangan' },
      '/saran-perbaikan': { title: 'Saran Perbaikan', description: 'Catat saran perbaikan dan lacak progres' },
    }
    return info[pathname] || { title: 'Daytrack', description: 'Tracker aktivitas harian' }
  }

  const pageInfo = getPageInfo()
  const isToday = isSameDay(currentDate, new Date())
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const formattedDate = format(currentDate, 'EEEE, d MMMM yyyy', { locale: id })

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

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
        <h1 className="text-lg font-semibold truncate">{pageInfo.title}</h1>
        <p className="text-xs text-muted-foreground truncate">{pageInfo.description}</p>
      </div>

      {/* Date picker & Refresh - right side */}
      <div className="flex items-center gap-2">
        {/* Date navigation */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDay('prev')} aria-label="Hari sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium whitespace-nowrap">{formattedDate}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDay('next')} aria-label="Hari selanjutnya">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToToday} aria-label="Hari ini">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Mobile date display */}
        <div className="sm:hidden flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{format(currentDate, 'd MMM', { locale: id })}</span>
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