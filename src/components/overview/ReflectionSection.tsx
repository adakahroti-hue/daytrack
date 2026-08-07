'use client'

import Link from 'next/link'
import { Frown, Clock, Lightbulb, ArrowRight, NotebookPen } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { useMasalahLogRange } from '@/hooks/useMasalahLogs'
import { useFunQueue } from '@/hooks/useFunQueue'
import { useSaranPerbaikanRange } from '@/hooks/useSaranPerbaikan'

// ─── Revisi batch 9: section "Catatan & Refleksi" untuk tab Overview (mengikuti mockup) ───

function ReflectionCard({
  tint,
  icon: Icon,
  iconColor,
  dotColor,
  linkColor,
  title,
  items,
  emptyText,
  href,
}: {
  tint: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  dotColor: string
  linkColor: string
  title: string
  items: string[]
  emptyText: string
  href: string
}) {
  return (
    <div className={cn('rounded-xl border p-4 flex flex-col', tint)}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-white/70">
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {items.map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
              <span className={cn('mt-2 h-1 w-1 rounded-full shrink-0', dotColor)} />
              <span className="line-clamp-2">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{emptyText}</p>
      )}
      <Link
        href={href}
        className={cn('mt-auto pt-3 inline-flex items-center gap-1 justify-end text-xs font-medium', linkColor)}
      >
        Lihat semua <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

export function ReflectionSection({ dateStr }: { dateStr: string }) {
  // Masalah hari ini
  const { data: masalahEntries = [] } = useMasalahLogRange(dateStr, dateStr)
  const masalahList = (masalahEntries as any[])
    .map(e => e.masalah as string)
    .filter(Boolean)
    .slice(0, 3)

  // Kesenangan yang ditunda (antrean global, tidak terikat tanggal)
  const { data: funEntries = [] } = useFunQueue('ditunda')
  const funList = (funEntries as any[])
    .map(e => e.nama_kesenangan as string)
    .filter(Boolean)
    .slice(0, 3)

  // Saran perbaikan — 3 saran terbaru dalam 30 hari terakhir sampai tanggal terpilih
  const saranStart = format(subDays(new Date(dateStr + 'T00:00:00'), 30), 'yyyy-MM-dd')
  const { data: saranEntries = [] } = useSaranPerbaikanRange(saranStart, dateStr)
  const saranList = [...(saranEntries as any[])]
    .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
    .map(e => (e.saran || '') as string)
    .filter(s => s.trim().length > 0)
    .slice(0, 3)

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <NotebookPen className="h-4 w-4 text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Catatan & Refleksi</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReflectionCard
          tint="bg-purple-50/70 border-purple-200"
          icon={Frown}
          iconColor="text-purple-500"
          dotColor="bg-purple-400"
          linkColor="text-purple-600 hover:text-purple-700"
          title="Masalah"
          items={masalahList}
          emptyText="Tidak ada masalah tercatat hari ini."
          href="/masalah"
        />
        <ReflectionCard
          tint="bg-amber-50/70 border-amber-200"
          icon={Clock}
          iconColor="text-amber-500"
          dotColor="bg-amber-400"
          linkColor="text-amber-600 hover:text-amber-700"
          title="Kesenangan Ditunda"
          items={funList}
          emptyText="Tidak ada kesenangan yang ditunda."
          href="/kesenangan"
        />
        <ReflectionCard
          tint="bg-green-50/70 border-green-200"
          icon={Lightbulb}
          iconColor="text-green-500"
          dotColor="bg-green-400"
          linkColor="text-green-600 hover:text-green-700"
          title="Saran Perbaikan"
          items={saranList}
          emptyText="Belum ada saran perbaikan."
          href="/saran-perbaikan"
        />
      </div>
    </section>
  )
}
