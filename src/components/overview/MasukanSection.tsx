'use client'

import { Lightbulb } from 'lucide-react'
import { useSaranPerbaikanRange } from '@/hooks/useSaranPerbaikan'
import { cn } from '@/lib/utils'

interface MasukanSectionProps {
  startStr: string
  endStr: string
}

export function MasukanSection({ startStr, endStr }: MasukanSectionProps) {
  const { data: entries = [], isLoading } = useSaranPerbaikanRange(startStr, endStr)

  const sarans = (entries as any[]).filter((e: any) => e.saran).slice(0, 5)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          Masukan Perbaikan
        </h3>
        {sarans.length > 0 && (
          <span className="ml-auto text-xs text-slate-400">{sarans.length} item</span>
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
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {entry.tanggal}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
