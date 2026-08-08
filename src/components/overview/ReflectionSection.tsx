'use client'

import Link from 'next/link'
import { Brain, ArrowRight, NotebookPen, Hourglass, PersonStanding } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMasalahLogRange } from '@/hooks/useMasalahLogs'
import { useKesenanganRange } from '@/hooks/useKesenangan'
import { type OverviewPeriod } from './FocusTodaySection'

// ─── Revisi batch 18: section "Catatan & Refleksi" untuk tab Overview (tema hitam-putih) ───

export function ReflectionCard({
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
    <div className={cn('rounded-xl border px-4 py-3 flex flex-col', tint)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-100 shrink-0">
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
          <p className="text-sm font-semibold text-slate-700 truncate">{title}</p>
        </div>
        <Link href={href} aria-label={`Lihat ${title}`} className={cn('p-1.5 rounded-lg transition-colors hover:bg-slate-100', linkColor)}>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {items.map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
              <span className={cn('mt-1.5 h-1 w-1 rounded-full shrink-0', dotColor)} />
              <span className="line-clamp-2">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{emptyText}</p>
      )}

    </div>
  )
}

// ─── Revisi batch 22: card Refleksi + Kesenangan digabung jadi satu card "Mental" ───
// ─── Revisi batch 26: icon ungu pindah ke kanan atas + garis pembatas Refleksi/Kesenangan Ditunda ───
export function MentalCard({
  tint,
  icon: Icon,
  iconColor,
  dotColor,
  linkColor,
  title = 'Mental',
  masalahItems,
  funItems,
  masalahEmptyText,
  funEmptyText,
  href,
}: {
  tint: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  dotColor: string
  linkColor: string
  title?: string
  masalahItems: string[]
  funItems: string[]
  masalahEmptyText: string
  funEmptyText: string
  href: string
}) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 flex flex-col', tint)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700 truncate">{title}</p>
        <div className="p-1.5 rounded-lg bg-slate-100 shrink-0">
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 items-start divide-y divide-slate-200 sm:divide-y-0 sm:divide-x">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1"><PersonStanding className="h-3.5 w-3.5 text-purple-500" /> Refleksi</p>
          {masalahItems.length > 0 ? (
            <ul className="mt-2 space-y-1 pl-[18px]">
              {masalahItems.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className={cn('mt-1.5 h-1 w-1 rounded-full shrink-0', dotColor)} />
                  <span className="line-clamp-2">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 pl-[18px] text-sm text-slate-500">{masalahEmptyText}</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1"><Hourglass className="h-3.5 w-3.5 text-purple-500" /> Kesenangan Ditunda</p>
          {funItems.length > 0 ? (
            <ul className="mt-2 space-y-1 pl-[18px]">
              {funItems.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className={cn('mt-1.5 h-1 w-1 rounded-full shrink-0', dotColor)} />
                  <span className="line-clamp-2">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 pl-[18px] text-sm text-slate-500">{funEmptyText}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Revisi batch 22: ReflectionSection kini hanya merender satu card "Mental" ───
// ─── Revisi batch 26: tidak lagi dirender di halaman Overview (card Mental duplikat
//     untuk mingguan/bulanan/tahunan dihapus); card Mental cukup dari RoutineTodaySection. ───
export function ReflectionSection({ startStr, endStr }: { startStr: string; endStr: string; period: OverviewPeriod }) {
  // Masalah dalam rentang periode
  const { data: masalahEntries = [] } = useMasalahLogRange(startStr, endStr)
  const masalahList = (masalahEntries as any[])
    .map(e => e.masalah as string)
    .filter(Boolean)
    .slice(0, 3)

  // Kesenangan ditunda — dari tabel kesenangan (status 'belum')
  const { data: kesenanganEntries = [] } = useKesenanganRange(startStr, endStr)
  const funList = (kesenanganEntries as any[])
    .filter(e => e.status === 'belum')
    .map(e => e.kesenangan as string)
    .filter(Boolean)
    .slice(0, 3)

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <NotebookPen className="h-4 w-4 text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Catatan & Refleksi</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <MentalCard
          tint="bg-white border-slate-200"
          icon={Brain}
          iconColor="text-purple-500"
          dotColor="bg-slate-400"
          linkColor="text-slate-500 hover:text-slate-700"
          title="Mental"
          masalahItems={masalahList}
          funItems={funList}
          masalahEmptyText="Tidak ada refleksi tercatat pada periode ini."
          funEmptyText="Tidak ada kesenangan yang ditunda."
          href="/masalah"
        />
      </div>
    </section>
  )
}
