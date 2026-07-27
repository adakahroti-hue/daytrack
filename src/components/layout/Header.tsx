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
import { Loader2, LogOut, User, Sun, Moon, Monitor, Sparkles } from 'lucide-react'
import { useTheme } from 'next-themes'

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      '/overview/bulanan': 'Overview Bulanan',
      '/overview/mingguan': 'Overview Mingguan',
      '/overview/harian': 'Overview Harian',
      '/jadwal-tugas': 'Jadwal Tugas',
      '/sholat': 'Sholat',
      '/quran': 'Quran',
      '/doa': 'Doa',
      '/syukur': 'Syukur',
      '/tidur': 'Tidur',
      '/masalah': 'Masalah',
      '/minum-air': 'Minum Air',
      '/pmo': 'PMO',
      '/kesenangan': 'Kesenangan',
      '/saran-perbaikan': 'Saran Perbaikan',
    }
    return titles[pathname] || 'Daytrack'
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Sparkles className="h-6 w-6 text-primary" />
      </Button>

      <h1 className="flex-1 text-lg font-semibold truncate lg:text-xl">
        {getPageTitle()}
      </h1>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Monitor className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
