'use client'

import { ArrowRight, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useAllSaranPerbaikan, useDeleteSaranPerbaikan } from '@/hooks/useSaranPerbaikan'
import { cn } from '@/lib/utils'

export function MasukanSection() {
  const { data: entries = [], isLoading } = useAllSaranPerbaikan()
  const deleteSaran = useDeleteSaranPerbaikan()

  const allSarans = (entries as any[]).filter((e: any) => e.saran)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Masukan DayTrack
        </h3>
        {allSarans.length > 0 && (
          <Link
            href="/saran-perbaikan"
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
      ) : allSarans.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Belum ada masukan.
        </p>
      ) : (
        <div className="space-y-2 max-h-[7.5rem] overflow-y-auto pr-1">
          {allSarans.map((entry: any) => (
            <div
              key={entry.id}
              className={cn(
                'flex items-start gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50'
              )}
            >
              <span className="text-slate-700 mt-0.5 shrink-0">•</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700 leading-snug break-words">
                  {entry.saran}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteSaran.mutate(entry.id)}
                aria-label="Hapus"
                className="shrink-0 text-slate-400 hover:text-rose-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
