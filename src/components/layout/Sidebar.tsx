"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  LayoutDashboard,
  Calendar,
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
  ChevronLeft,
  Clock,
} from 'lucide-react'

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
    items: [
      { title: 'Harian', href: '/overview/harian', icon: Calendar },
      { title: 'Mingguan', href: '/overview/mingguan', icon: Calendar },
      { title: 'Bulanan', href: '/overview/bulanan', icon: Calendar },
    ],
  },
  {
    title: 'Jadwal Tugas',
    icon: Calendar,
    href: '/jadwal-tugas',
  },
  {
    title: 'Ibadah',
    icon: Mosque,
    items: [
      { title: 'Sholat', href: '/sholat', icon: Mosque },
      { title: 'Quran', href: '/quran', icon: BookOpen },
      { title: 'Doa', href: '/doa', icon: Heart },
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
      { title: 'Syukur', href: '/syukur', icon: Sparkles },
      { title: 'Kesenangan', href: '/kesenangan', icon: Smile },
      { title: 'Saran Perbaikan', href: '/saran-perbaikan', icon: Lightbulb },
    ],
  },
]

export function Sidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  // Default all sections expanded (empty array = all open)
  const [collapsedSections, setCollapsedSections] = useState<string[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleSection = (title: string) => {
    setCollapsedSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    )
  }

  // Sidebar is always visible on desktop, on mobile it's controlled by isOpen
  const isVisible = isOpen

  const sidebarClasses = cn(
    'fixed inset-y-0 left-0 z-40 bg-card border-r transition-all duration-300 lg:relative',
    isCollapsed
      ? 'w-16 translate-x-0'
      : 'w-64 translate-x-0'
  )

  if (!isVisible) return null

  return (
    <aside className={sidebarClasses}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn('flex h-14 items-center border-b px-3', isCollapsed && 'justify-center')}>
          <Link href="/overview/bulanan" className="flex items-center gap-2 font-bold text-lg text-primary" onClick={onToggle}>
            <Clock className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">Daytrack</span>}
          </Link>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn('lg:hidden', isCollapsed && 'hidden')}
            onClick={onToggle}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {navigation.map((section) => {
              if ('items' in section) {
                const isSectionOpen = !collapsedSections.includes(section.title)
                const isActive = section.items.some(item => pathname === item.href)

                return (
                  <Collapsible key={section.title} open={isSectionOpen} onOpenChange={() => toggleSection(section.title)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full justify-between text-left px-2 py-2',
                          isCollapsed && 'justify-center',
                          isActive && 'bg-primary/10 text-primary'
                        )}
                        disabled={isCollapsed}
                      >
                        <span className={cn('flex items-center gap-2', isCollapsed && 'justify-center')}>
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
                    {!isCollapsed && (
                      <CollapsibleContent className="pl-3 space-y-0.5">
                        {section.items.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
                              pathname === item.href
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            )}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {item.title}
                          </Link>
                        ))}
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                )
              }

              const isActive = pathname === section.href
              return (
                <Link
                  key={section.title}
                  href={section.href as string}
                  className={cn(
                    'flex items-center gap-3 px-2 py-2 text-sm rounded-md transition-colors',
                    isCollapsed && 'justify-center',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                  title={isCollapsed ? section.title : undefined}
                >
                  <section.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium truncate">{section.title}</span>}
                </Link>
              )
            })}
          </ul>
        </nav>

        {/* Mobile close button */}
        <div className="lg:hidden border-t p-2">
          <Button variant="outline" className="w-full" onClick={onToggle}>
            <Menu className="mr-2 h-4 w-4" />
            Tutup Menu
          </Button>
        </div>
      </div>
    </aside>
  )
}