'use client'

import { Check, Minus, Mosque, BookOpen, GlassWater, ClipboardCheck, Droplet, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrayerLogRange } from '@/hooks/usePrayerLogs'
import { useQuranLogRange } from '@/hooks/useQuranLogs'
import { useWaterDailySummary } from '@/hooks/useMinumAirLogs'
import { useSyukurLogRange } from '@/hooks/useSyukurLogs'
import { useDoaLogRange } from '@/hooks/useDoaLogs'
import { usePmoLogRange } from '@/hooks/usePmoLogs'
import { useTidurLogRange } from '@/hooks/useTidurLogs'

// ─── Revisi batch 9: section "Rutinitas Hari Ini" untuk tab Overview (mengikuti mockup) ───

const SHOLAT_5 = [
  { key: 'subuh', label: 'Subuh' },
  { key: 'dzuhur', label: 'Dzuhur' },
  { key: 'ashar', label: 'Ashar' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isya', label: 'Isya' },
] as const

const QURAN_SESSIONS = [
  { key: 'setelah_subuh', label: 'Setelah Subuh' },
  { key: 'setelah_dzuhur', label: 'Setelah Dzuhur' },
  { key: 'setelah_ashar', label: 'Setelah Ashar' },
  { key: 'setelah_maghrib', label: 'Setelah Maghrib' },
  { key: 'setelah_isya', label: 'Setelah Isya' },
] as const

const TARGET_GELAS = 8

function RoutineCard({
  tint,
  icon: Icon,
  iconColor,
  title,
  children,
}: {
  tint: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-xl border p-4', tint)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <div className="p-1.5 rounded-lg bg-white/70">
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </div>
      {children}
    </div>
  )
}

export function RoutineTodaySection({ dateStr }: { dateStr: string }) {
  // Sholat 5 waktu
  const { data: prayerRows = [] } = usePrayerLogRange(dateStr, dateStr)
  const prayerRow = (prayerRows as any[])[0]
  const sholatDone = SHOLAT_5.map(s => !!prayerRow?.[`sholat_${s.key}`])
  const sholatCount = sholatDone.filter(Boolean).length

  // Baca Quran per sesi
  const { data: quranEntries = [] } = useQuranLogRange(dateStr, dateStr)
  const quranDone = QURAN_SESSIONS.map(s =>
    (quranEntries as any[]).some(
      e => e.waktu_baca === s.key && !(e.catatan || '').startsWith('Tidak membaca')
    )
  )
  const quranCount = quranDone.filter(Boolean).length

  // Minum air
  const { data: water } = useWaterDailySummary(dateStr)
  const gelas = water?.gelas ?? 0
  const sisaGelas = Math.max(0, TARGET_GELAS - gelas)

  // Checklist harian
  const { data: syukurEntries = [] } = useSyukurLogRange(dateStr, dateStr)
  const { data: doaEntries = [] } = useDoaLogRange(dateStr, dateStr)
  const { data: pmoEntries = [] } = usePmoLogRange(dateStr, dateStr)
  const { data: tidurEntries = [] } = useTidurLogRange(dateStr, dateStr)
  const checklist = [
    { label: 'Bersyukur', done: (syukurEntries as any[]).some(e => e.status === 'sudah') },
    { label: 'Mendoakan orang lain', done: (doaEntries as any[]).some(e => e.status === 'sudah') },
    { label: 'Bebas PMO', done: (pmoEntries as any[]).some(e => e.status === 'berhasil') },
    { label: 'Tidur tepat waktu', done: (tidurEntries as any[]).some(e => e.status === 'tepat') },
  ]
  const checklistDone = checklist.filter(c => c.done).length

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="h-4 w-4 text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rutinitas Hari Ini</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Sholat 5 waktu */}
        <RoutineCard tint="bg-emerald-50/70 border-emerald-200" icon={Mosque} iconColor="text-emerald-500" title="Sholat 5 Waktu">
          <p className="text-2xl font-bold text-slate-900 mt-1.5">
            {sholatCount}/5 <span className="text-sm font-medium text-slate-500">sholat</span>
          </p>
          <p className="text-xs text-slate-500">{sholatCount} dikerjakan • {5 - sholatCount} belum</p>
          <div className="grid grid-cols-5 gap-1.5 mt-3">
            {SHOLAT_5.map((s, i) => (
              <div
                key={s.key}
                className={cn(
                  'rounded-lg border py-2 px-1 flex flex-col items-center gap-1',
                  sholatDone[i] ? 'bg-emerald-100/70 border-emerald-200' : 'bg-white/60 border-slate-200'
                )}
              >
                <span className="text-[10px] leading-tight text-center text-slate-600">{s.label}</span>
                {sholatDone[i]
                  ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                  : <Minus className="h-3.5 w-3.5 text-slate-300" />}
              </div>
            ))}
          </div>
        </RoutineCard>

        {/* Baca Quran */}
        <RoutineCard tint="bg-teal-50/70 border-teal-200" icon={BookOpen} iconColor="text-teal-500" title="Baca Quran">
          <p className="text-2xl font-bold text-slate-900 mt-1.5">
            {quranCount}/5 <span className="text-sm font-medium text-slate-500">sesi</span>
          </p>
          <p className="text-xs text-slate-500">{quranCount} dikerjakan • {5 - quranCount} belum</p>
          <div className="grid grid-cols-5 gap-1.5 mt-3">
            {QURAN_SESSIONS.map((s, i) => (
              <div
                key={s.key}
                className={cn(
                  'rounded-lg border py-2 px-1 flex flex-col items-center gap-1',
                  quranDone[i] ? 'bg-teal-100/70 border-teal-200' : 'bg-white/60 border-slate-200'
                )}
              >
                <span className="text-[10px] leading-tight text-center text-slate-600">{s.label}</span>
                {quranDone[i]
                  ? <Check className="h-3.5 w-3.5 text-teal-600" />
                  : <Minus className="h-3.5 w-3.5 text-slate-300" />}
              </div>
            ))}
          </div>
        </RoutineCard>

        {/* Minum Air */}
        <RoutineCard tint="bg-sky-50/70 border-sky-200" icon={GlassWater} iconColor="text-sky-500" title="Minum Air">
          <p className="text-2xl font-bold text-slate-900 mt-1.5">
            {gelas}/{TARGET_GELAS} <span className="text-sm font-medium text-slate-500">gelas</span>
          </p>
          <p className="text-xs text-slate-500">{sisaGelas > 0 ? `${sisaGelas} gelas tersisa` : 'Target tercapai 🎉'}</p>
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {Array.from({ length: TARGET_GELAS }).map((_, i) => (
              <Droplet
                key={i}
                className={cn('h-5 w-5', i < gelas ? 'text-sky-500 fill-sky-500' : 'text-slate-300')}
              />
            ))}
          </div>
        </RoutineCard>

        {/* Checklist Harian */}
        <RoutineCard tint="bg-violet-50/70 border-violet-200" icon={ClipboardCheck} iconColor="text-violet-500" title="Checklist Harian">
          <p className="text-2xl font-bold text-slate-900 mt-1.5">
            {checklistDone}/4 <span className="text-sm font-medium text-slate-500">selesai</span>
          </p>
          <p className="text-xs text-slate-500">Selesaikan hal-hal penting hari ini</p>
          <div className="mt-3 space-y-2">
            {checklist.map(c => (
              <div key={c.label} className="flex items-center gap-2.5">
                <span className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                  c.done ? 'bg-green-500 border-green-500' : 'bg-white border-slate-300'
                )}>
                  {c.done && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className={cn('text-sm', c.done ? 'text-slate-700' : 'text-slate-500')}>{c.label}</span>
              </div>
            ))}
          </div>
        </RoutineCard>
      </div>
    </section>
  )
}
