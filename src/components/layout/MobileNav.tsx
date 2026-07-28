"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { X, LayoutDashboard, Calendar, Mosque, BookOpen, Heart, Moon, GlassWater, Shield, Smile, Lightbulb, Sparkles, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

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

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

const navigation: NavSection[] = [
  {
    title: 'Overview',
    icon: LayoutDashboard,
    href: '/overview/harian',
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

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname()

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-card border-l shadow-xl lg:hidden">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b p-4">
            <Link href="/overview/bulanan" className="flex items-center gap-2 font-bold text-xl text-primary" onClick={onClose}>
              <Sparkles className="h-6 w-6" />
              <span>Daytrack</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {navigation.map((section) => {
                if ('items' in section) {
                  return (
                    <Collapsible key={section.title} className="w-full">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className={cn(
                            'w-full justify-between text-left px-2 py-2',
                            !pathname.startsWith('/' + section.title.toLowerCase()) && 'hover:bg-accent'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <section.icon className="h-5 w-5" />
                            <span className="font-medium">{section.title}</span>
                          </span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            onClick={onClose}
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
                return (
                  <Link
                    key={section.title}
                    href={section.href as string}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 text-sm rounded-md transition-colors',
                      pathname === section.href
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
        </div>
      </aside>
    </>
  )
}
