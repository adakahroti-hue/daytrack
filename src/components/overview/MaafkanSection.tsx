'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useMaafkanAll } from '@/hooks/useMaafkan'
import { cn } from '@/lib/utils'

export function MaafkanSection() {
  const { data: entries = [], isLoading } = useMaafkanAll()

  const list = (entries as any[])
    .filter((e: any) => e.kejadian)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map((e: any) => ({ id: e.id, kejadian: e.kejadian as string }))

  return (
    <RoutineCardShell title="Maafkan" href="/maafkan" linkColor="text-purple-500 hover:text-purple-700" hideIcon>
      <div className="mt-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : list.length > 0 ? (
          <ul className="space-y-1.5 max-h-[7.5rem] overflow-y-auto pr-1">
            {list.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-sm text-slate-600 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="line-clamp-2 min-w-0">{r.kejadian}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Belum ada kejadian yang ingin dimaafkan.</p>
        )}
      </div>
    </RoutineCardShell>
  )
}

// Shell ringan meniru RoutineCard (tanpa icon) agar konsisten dengan card Refleksi
function RoutineCardShell({ title, href, linkColor, hideIcon, children }: {
  title: string
  href: string
  linkColor: string
  hideIcon?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        <Link href={href} aria-label={`Buka tab ${title}`} className={cn("ml-auto p-1 -mr-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors", linkColor)}>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {children}
    </section>
  )
}
