"use client"

import { useState, Fragment, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Mosque,
  Sunrise,
  BookOpen,
  Heart,
  Hourglass,
  Moon,
  GlassWater,
  Shield,
  Lightbulb,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  PanelLeft,
  PersonStanding,
  Clock,
  LogOut,
  Loader2,
  User,
  CheckCircle2,
  Dices,
  HandCoins,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTasks } from '@/hooks/useTasks'
import { format } from 'date-fns'

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
  desktopCollapsed: boolean
  onToggleDesktop: () => void
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSectionWithItems {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

interface NavSectionWithoutItems {
  title: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

type NavSection = NavSectionWithItems | NavSectionWithoutItems

const navigation: NavSection[] = [
  {
    title: 'Overview',
    icon: LayoutDashboard,
    href: '/overview',
  },
  {
    title: 'Tugas',
    icon: Calendar,
    items: [
      { title: 'Hari Ini', href: '/tugas/hari-ini', icon: Clock },
      { title: 'Semua', href: '/tugas/semua', icon: CalendarDays },
      { title: 'Selesai', href: '/tugas/selesai', icon: CheckCircle2 },
    ],
  },
  {
    title: 'Ibadah',
    icon: Mosque,
    items: [
      { title: 'Sholat Wajib', href: '/sholat', icon: Mosque },
      { title: 'Sholat Sunnah', href: '/sholat-sunnah', icon: Sunrise },
      { title: 'Quran', href: '/quran', icon: BookOpen },
    ],
  },
  {
    title: 'Hoki',
    icon: Dices,
    items: [
      { title: 'Berdoa', href: '/doa', icon: Heart },
      { title: 'Bersyukur', href: '/syukur', icon: Sparkles },
      { title: 'Sedekah', href: '/sedekah', icon: HandCoins },
    ],
  },
  {
    title: 'Kesehatan',
    icon: Heart,
    items: [
      { title: 'Minum Air', href: '/minum-air', icon: GlassWater },
      { title: 'PMO', href: '/pmo', icon: Shield },
      { title: 'Waktu Tidur', href: '/tidur', icon: Moon },
    ],
  },
  {
    title: 'Mental',
    icon: Shield,
    items: [
      { title: 'Tunda Senang', href: '/kesenangan', icon: Hourglass },
      { title: 'Refleksi', href: '/masalah', icon: PersonStanding },
    ],
  },
  {
    title: 'Pengaturan',
    icon: Sparkles,
    items: [
      { title: 'Masukan', href: '/saran-perbaikan', icon: Lightbulb },
    ],
  },
]

function matchesPath(pathname: string, href: string): boolean {
  // If href has query params, match exact URL including query
  if (href.includes('?')) {
    return pathname === href
  }
  // Otherwise match base path
  return pathname.split('?')[0] === href
}

export function Sidebar({
  mobileOpen,
  onCloseMobile,
  desktopCollapsed,
  onToggleDesktop,
}: SidebarProps) {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<string[]>([])

  // Rev 8: hitung jumlah tugas per tab untuk badge di sidebar
  const today = format(new Date(), 'yyyy-MM-dd')
  // Pakai query yang SAMA PERSIS dengan masing-masing tab agar badge akurat:
  // - Hari Ini  -> useTasks(todayStr) (sama dengan tab hari-ini), EXCLUDE yang selesai
  // - Semua     -> useTasks(undefined) filter belum & tanggal != today
  // - Selesai   -> useTasks(undefined) filter selesai
  const { data: todayTasks = [] } = useTasks(today) // -> queryKey ['tugas', today] (identik tab Hari Ini)
  const { data: allTasks = [] } = useTasks(undefined)
  const taskCounts: Record<string, number> = {
    '/tugas/hari-ini': todayTasks.filter(t => t.status !== 'selesai').length,
    '/tugas/semua': allTasks.filter(t => t.status === 'belum' && t.tanggal !== today).length,
    '/tugas/selesai': allTasks.filter(t => t.status === 'selesai').length,
  }

  const toggleSection = (title: string) => {
    setCollapsedSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    )
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // ---- Mobile: overlay drawer (fixed, slides in from left) ----
  // ---- Desktop: inline flex sidebar (width transitions w-64 ↔ w-16) ----
  const isCollapsed = desktopCollapsed

  return (
    <TooltipProvider delayDuration={200}>
      {/* Mobile drawer */}
      {mobileOpen && (
        <aside
          className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col lg:hidden"
          style={{ animation: 'slideInLeft 0.2s ease-out' }}
        >
          <SidebarContent
            isCollapsed={false}
            collapsedSections={collapsedSections}
            toggleSection={toggleSection}
            pathname={pathname}
            onNavClick={onCloseMobile}
            onToggleDesktop={onToggleDesktop}
            onSignOut={handleSignOut}
            isLoading={isLoading}
            taskCounts={taskCounts}
            showMobileClose
            onCloseMobile={onCloseMobile}
          />
        </aside>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-30 bg-card border-r flex-col transition-[width] duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          pathname={pathname}
          onNavClick={() => {}}
          onToggleDesktop={onToggleDesktop}
          onSignOut={handleSignOut}
          isLoading={isLoading}
          taskCounts={taskCounts}
        />
      </aside>
    </TooltipProvider>
  )
}

// ---- Sidebar inner content (shared between mobile & desktop) ----
function SidebarContent({
  isCollapsed,
  collapsedSections,
  toggleSection,
  pathname,
  onNavClick,
  onToggleDesktop,
  onSignOut,
  isLoading,
  taskCounts,
  showMobileClose = false,
  onCloseMobile,
}: {
  isCollapsed: boolean
  collapsedSections: string[]
  toggleSection: (title: string) => void
  pathname: string
  onNavClick: () => void
  onToggleDesktop: () => void
  onSignOut: () => void
  isLoading: boolean
  taskCounts: Record<string, number>
  showMobileClose?: boolean
  onCloseMobile?: () => void
}) {
  // Profil asli (revisi batch 24): ganti placeholder "Pengguna" / "user@daytrack.app"
  const [userEmail, setUserEmail] = useState<string | null>(null)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null)).catch(() => setUserEmail(null))
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Logo header */}
      <div className={cn('flex h-16 items-center border-b px-3', isCollapsed && 'justify-center')}>
        <Link
          href="/overview"
          className="flex items-center gap-2 font-bold text-lg text-primary flex-1 min-w-0"
          onClick={onNavClick}
        >
          <Image
            src="/daytrack-logo.png"
            alt="Daytrack logo"
            width={24}
            height={24}
            className="h-6 w-6 flex-shrink-0 rounded-md"
          />
          {!isCollapsed && <span className="truncate">Daytrack</span>}
        </Link>

        {/* Desktop collapse/expand toggle */}
        {!showMobileClose && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={onToggleDesktop}
                aria-label={isCollapsed ? 'Perluas sidebar' : 'Keciutkan sidebar'}
              >
                <PanelLeft className={cn('h-5 w-5 transition-transform', isCollapsed && 'rotate-180')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? 'Perluas' : 'Keciutkan'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Mobile close button */}
        {showMobileClose && onCloseMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={onCloseMobile}
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <ul className="space-y-0.5">
          {navigation.map((section, sectionIndex) => {
            if ('items' in section) {
              const isSectionOpen = !collapsedSections.includes(section.title)
              const isActive = section.items.some(item => matchesPath(pathname, item.href))

              return (
                <Fragment key={section.title}>
                  {sectionIndex > 0 && !isCollapsed && (
                    <li aria-hidden="true" className="mx-2 my-1.5 border-t border-slate-200/70 dark:border-slate-700/50" />
                  )}
                <div className="mt-1.5">
                  {/* Rev 1+2: judul section tanpa icon, bold hitam; semua tab selalu tampil (tanpa collapse) */}
                  {!isCollapsed && (
                    <li className="px-2 pt-2 pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white truncate">{section.title}</span>
                    </li>
                  )}
                  {!isCollapsed && (
                    <div className="pl-3 space-y-0.5">
                      {section.items.map((item) => (
                        <li key={item.title}>
                          <Link
                            href={item.href}
                            onClick={onNavClick}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors min-h-[36px]',
                              matchesPath(pathname, item.href)
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            )}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {item.title}
                            {taskCounts[item.href] != null && taskCounts[item.href] > 0 && (
                              <span className={cn(
                                'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                                matchesPath(pathname, item.href)
                                  ? 'bg-primary-foreground/20 text-primary-foreground'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              )}>
                                {taskCounts[item.href]}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </div>
                  )}
                </div>
                </Fragment>
              )
            }

            // Section without items (e.g., Overview)
            const isActive = matchesPath(pathname, section.href as string)
            return (
              <li key={section.title}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={section.href as string}
                      onClick={onNavClick}
                      className={cn(
                        'flex items-center gap-3 px-2 py-2 text-sm rounded-md transition-colors min-h-[40px]',
                        isCollapsed && 'justify-center',
                        isActive
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      <section.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="font-medium truncate">{section.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">{section.title}</TooltipContent>
                  )}
                </Tooltip>
              </li>
            )
          })}
        </ul>
        {/* User Profile — compact + email asli (revisi batch 24) */}
        <div className={cn('mt-1.5 border-t', isCollapsed ? 'p-1.5' : 'p-2')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'rounded-lg',
                isCollapsed
                  ? 'w-9 h-9 p-0 justify-center'
                  : 'w-full justify-start gap-2.5 h-9 px-2'
              )}
            >
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src="/avatar.png" alt="" />
                <AvatarFallback className="text-xs">
                  {userEmail ? userEmail[0].toUpperCase() : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <span className="flex-1 text-left text-sm font-medium truncate">{userEmail ?? 'Pengguna'}</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount sideOffset={5}>
            <DropdownMenuLabel className="font-normal py-2">
              <p className="text-sm font-medium leading-none truncate">{userEmail ?? 'Pengguna'}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} disabled={isLoading}>
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
      </nav>
    </div>
  )
}
