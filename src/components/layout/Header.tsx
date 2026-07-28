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
import { Loader2, LogOut, User, Sparkles } from 'lucide-react'

export function Header({ onMenuClick, onSidebarToggle }: { onMenuClick: () => void; onSidebarToggle: () => void }) {
  const pathname = usePathname()
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 lg:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Sparkles className="h-5 w-5 text-primary" />
      </Button>

      {/* Sidebar toggle for desktop */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:flex"
        onClick={onSidebarToggle}
        aria-label="Toggle sidebar"
      >
        <Sparkles className="h-5 w-5 text-primary" />
      </Button>

      <h1 className="flex-1 text-base font-semibold truncate lg:text-lg">
        {getPageTitle()}
      </h1>

      <div className="flex items-center gap-1">
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
