'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useMentalBlockAll } from '@/hooks/useMentalBlock'
import { cn } from '@/lib/utils'

export function MentalBlockSection() {
  const { data: entries = [], isLoading } = useMentalBlockAll()

  const blocks = (entries as any[]).filter((e: any) => e.masalah)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Mental Block
        </h3>
        {blocks.length > 0 && (
          <Link
            href="/mental-block"
            className="ml-auto group flex items-center text-slate-400 hover:text-slate-700 transition-colors"
            title="Selengkapnya"
          >
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : blocks.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Belum ada mental block.
        </p>
      ) : (
        <div className="space-y-2 max-h-[7.5rem] overflow-y-auto pr-1">
          {blocks.map((entry: any) => (
            <div
              key={entry.id}
              className={cn(
                'flex items-start gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50',
                'hover:bg-slate-100/70 transition-colors'
              )}
            >
              <span className="text-slate-400 mt-0.5 shrink-0">•</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700 leading-snug break-words">
                  {entry.masalah}
                </p>
                {entry.tanggal && (
                  <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">{entry.tanggal}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
