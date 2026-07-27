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
      { title: 'Bulanan', href: '/overview/bulanan', icon: Calendar },
      { title: 'Mingguan', href: '/overview/mingguan', icon: Calendar },
      { title: 'Harian', href: '/overview/harian', icon: Calendar },
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
  const [collapsedSections, setCollapsedSections] = useState<string[]>(['Overview', 'Ibadah', 'Kesehatan', 'Mental', 'Perbaikan'])

  const toggleSection = (title: string) => {
    setCollapsedSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    )
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 bg-card border-r transition-all duration-300 lg:relative',
        isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/overview/bulanan" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Sparkles className="h-6 w-6" />
            <span>Daytrack</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggle}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navigation.map((section) => {
              if ('items' in section) {
                const isOpen = !collapsedSections.includes(section.title)
                const isActive = section.items.some(item => pathname === item.href)

                return (
                  <Collapsible key={section.title} open={isOpen} onOpenChange={() => toggleSection(section.title)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          'w-full justify-between text-left px-2 py-2',
                          isActive && 'bg-primary/10 text-primary'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <section.icon className="h-5 w-5" />
                          <span className="font-medium">{section.title}</span>
                        </span>
                        <ChevronDown className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform duration-200',
                          isOpen && 'rotate-180'
                        )} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1">
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
                          <item.icon className="h-4 w-4" />
                          {item.title}
                        </Link>
                      ))}
                    </CollapsibleContent>
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
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <section.icon className="h-5 w-5" />
                  <span className="font-medium">{section.title}</span>
                </Link>
              )
            })}
          </ul>
        </nav>

        {/* Mobile close button */}
        <div className="lg:hidden border-t p-4">
          <Button variant="outline" className="w-full" onClick={onToggle}>
            <Menu className="mr-2 h-4 w-4" />
            Tutup Menu
          </Button>
        </div>
      </div>
    </aside>
  )
}
