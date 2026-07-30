"use client"

import { useState } from 'react'
import Link from 'next/link'
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
  BookOpen,
  Heart,
  Moon,
  GlassWater,
  Shield,
  Smile,
  Lightbulb,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  PanelLeft,
  Clock,
  LogOut,
  Loader2,
  User,
  CheckCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
    ],
  },
  {
    title: 'Ibadah',
    icon: Mosque,
    items: [
      { title: 'Sholat', href: '/sholat', icon: Mosque },
      { title: 'Quran', href: '/quran', icon: BookOpen },
      { title: 'Doa', href: '/doa', icon: Heart },
      { title: 'Syukur', href: '/syukur', icon: Sparkles },
    ],
  },
  {
    title: 'Kesehatan',
    icon: Heart,
    items: [
      { title: 'Tidur', href: '/tidur', icon: Moon },
      { title: 'Minum Air', href: '/minum-air', icon: GlassWater },
    ],
  },
  {
    title: 'Mental',
    icon: Shield,
    items: [
      { title: 'Masalah', href: '/masalah', icon: Shield },
      { title: 'PMO', href: '/pmo', icon: Shield },
    ],
  },
  {
    title: 'Perbaikan',
    icon: Sparkles,
    items: [
      { title: 'Kesenangan', href: '/kesenangan', icon: Smile },
      { title: 'Saran Perbaikan', href: '/saran-perbaikan', icon: Lightbulb },
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
          className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col lg:hidden"
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
  showMobileClose?: boolean
  onCloseMobile?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo header */}
      <div className={cn('flex h-16 items-center border-b px-3', isCollapsed && 'justify-center')}>
        <Link
          href="/overview"
          className="flex items-center gap-2 font-bold text-lg text-primary flex-1 min-w-0"
          onClick={onNavClick}
        >
          <Clock className="h-5 w-5 flex-shrink-0" />
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
          {navigation.map((section) => {
            if ('items' in section) {
              const isSectionOpen = !collapsedSections.includes(section.title)
              const isActive = section.items.some(item => matchesPath(pathname, item.href))

              return (
                <Collapsible key={section.title} open={isSectionOpen} onOpenChange={() => toggleSection(section.title)}>
                  <li>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              'w-full justify-between text-left px-2 py-2 h-10',
                              isCollapsed && 'justify-center px-0'
                            )}
                            disabled={isCollapsed}
                          >
                            <span className={cn('flex items-center gap-2 min-w-0', isCollapsed && 'justify-center')}>
                              <section.icon className="h-5 w-5 flex-shrink-0" />
                              {!isCollapsed && <span className="font-medium truncate">{section.title}</span>}
                            </span>
                            {!isCollapsed && (
                              <ChevronDown className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0',
                                isSectionOpen && 'rotate-180'
                              )} />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right">{section.title}</TooltipContent>
                      )}
                    </Tooltip>
                  </li>
                  {!isCollapsed && (
                    <CollapsibleContent className="pl-3 space-y-0.5">
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
                          </Link>
                        </li>
                      ))}
                    </CollapsibleContent>
                  )}
                </Collapsible>
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
      </nav>

      {/* User Profile — bottom */}
      <div className={cn('border-t', isCollapsed ? 'p-2' : 'p-3')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'rounded-lg',
                isCollapsed
                  ? 'w-10 h-10 p-0 justify-center'
                  : 'w-full justify-start gap-3 h-12'
              )}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src="/avatar.png" alt="" />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">Pengguna</p>
                  <p className="text-xs text-muted-foreground truncate">user@daytrack.app</p>
                </div>
              )}
              {!isCollapsed && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount sideOffset={5}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Pengguna</p>
                <p className="text-xs leading-none text-muted-foreground">user@daytrack.app</p>
              </div>
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
    </div>
  )
}
