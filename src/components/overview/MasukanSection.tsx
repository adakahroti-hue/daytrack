'use client'

import { Lightbulb, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useSaranPerbaikanRange } from '@/hooks/useSaranPerbaikan'
import { cn } from '@/lib/utils'

interface MasukanSectionProps {
  startStr: string
  endStr: string
}

export function MasukanSection({ startStr, endStr }: MasukanSectionProps) {
  const { data: entries = [], isLoading } = useSaranPerbaikanRange(startStr, endStr)

  const allSarans = (entries as any[]).filter((e: any) => e.saran)
  const sarans = allSarans.slice(0, 3)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Masukan Perbaikan
        </h3>
        {allSarans.length > 0 && (
          <Link
            href="/saran-perbaikan"
            className="ml-auto group flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 transition-colors"
            title="Selengkapnya"
          >
            <span className="hidden sm:inline">Selengkapnya</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : sarans.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Belum ada masukan untuk periode ini.
        </p>
      ) : (
        <div className="space-y-2">
          {sarans.map((entry: any) => (
            <div
              key={entry.id}
              className={cn(
                'flex items-start gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50',
                'hover:bg-amber-50/50 hover:border-amber-100 transition-colors'
              )}
            >
              <span className="text-amber-400 mt-0.5 shrink-0">•</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700 leading-snug break-words">
                  {entry.saran}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
