'use client'

import { Check, Minus, Mosque, BookOpen, GlassWater, ClipboardCheck, Droplet, Repeat } from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { usePrayerLogRange } from '@/hooks/usePrayerLogs'
import { useQuranLogRange } from '@/hooks/useQuranLogs'
import { useWaterLogRange } from '@/hooks/useMinumAirLogs'
import { useSyukurLogRange } from '@/hooks/useSyukurLogs'
import { useDoaLogRange } from '@/hooks/useDoaLogs'
import { usePmoLogRange } from '@/hooks/usePmoLogs'
import { useTidurLogRange } from '@/hooks/useTidurLogs'
import { PERIOD_LABEL, type OverviewPeriod } from './FocusTodaySection'

// ─── Revisi batch 9 & 11: section "Rutinitas" untuk tab Overview (harian/mingguan/bulanan) ───

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
const ML_PER_GELAS = 250

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

export function RoutineTodaySection({ startStr, endStr, period }: { startStr: string; endStr: string; period: OverviewPeriod }) {
  const isHarian = period === 'harian'

  // Jumlah hari berjalan dalam periode (masa depan tidak dihitung sebagai penyebut)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const cappedEnd = endStr < todayStr ? endStr : todayStr
  const daysElapsed = Math.max(
    1,
    differenceInCalendarDays(new Date(cappedEnd + 'T00:00:00'), new Date(startStr + 'T00:00:00')) + 1
  )

  // Sholat 5 waktu (agregat rentang)
  const { data: prayerRows = [] } = usePrayerLogRange(startStr, endStr)
  const sholatPerWaktu = SHOLAT_5.map(s =>
    (prayerRows as any[]).filter(row => !!row?.[`sholat_${s.key}`]).length
  )
  const sholatCount = sholatPerWaktu.reduce((a, b) => a + b, 0)
  const sholatTarget = 5 * daysElapsed

  // Baca Quran per sesi (agregat rentang)
  const { data: quranEntries = [] } = useQuranLogRange(startStr, endStr)
  const quranRows = quranEntries as any[]
  const quranDoneFor = (tanggal: string, key: string) =>
    quranRows.some(e => e.tanggal === tanggal && e.waktu_baca === key && !(e.catatan || '').startsWith('Tidak membaca'))
  const quranPerSesi = QURAN_SESSIONS.map(s =>
    quranRows.filter(e => e.waktu_baca === s.key && !(e.catatan || '').startsWith('Tidak membaca')).length
  )
  const quranCount = quranPerSesi.reduce((a, b) => a + b, 0)
  const quranTarget = 5 * daysElapsed

  // Minum air (agregat rentang)
  const { data: waterEntries = [] } = useWaterLogRange(startStr, endStr)
  const totalMl = (waterEntries as any[]).reduce((sum, e) => sum + (e.jumlah_ml || 0), 0)
  const gelas = Math.round(totalMl / ML_PER_GELAS)
  const targetGelasPeriod = TARGET_GELAS * daysElapsed
  const avgGelas = Math.round(gelas / daysElapsed)
  const dropletsFilled = Math.min(TARGET_GELAS, avgGelas)

  // Checklist: jumlah hari tiap item dikerjakan dalam periode
  const { data: syukurEntries = [] } = useSyukurLogRange(startStr, endStr)
  const { data: doaEntries = [] } = useDoaLogRange(startStr, endStr)
  const { data: pmoEntries = [] } = usePmoLogRange(startStr, endStr)
  const { data: tidurEntries = [] } = useTidurLogRange(startStr, endStr)
  const countDays = (entries: any[], match: (e: any) => boolean) =>
    new Set(entries.filter(match).map(e => e.tanggal)).size
  const checklist = [
    { label: 'Bersyukur', days: countDays(syukurEntries as any[], e => e.status === 'sudah') },
    { label: 'Mendoakan orang lain', days: countDays(doaEntries as any[], e => e.status === 'sudah') },
    { label: 'Bebas PMO', days: countDays(pmoEntries as any[], e => e.status === 'berhasil') },
    { label: 'Tidur tepat waktu', days: countDays(tidurEntries as any[], e => e.status === 'tepat') },
  ]
  // Harian: centang = dikerjakan hari itu. Mingguan/bulanan: centang = dikerjakan setiap hari dalam periode.
  const checklistWithDone = checklist.map(c => ({ ...c, done: c.days >= daysElapsed }))
  const checklistDone = checklistWithDone.filter(c => c.done).length

  const label = PERIOD_LABEL[period]

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="h-4 w-4 text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rutinitas {label}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Sholat 5 waktu */}
        <RoutineCard tint="bg-emerald-50/70 border-emerald-200" icon={Mosque} iconColor="text-emerald-500" title="Sholat 5 Waktu">
          <p className="text-2xl font-bold text-slate-900 mt-1.5">
            {sholatCount}/{sholatTarget} <span className="text-sm font-medium text-slate-500">sholat</span>
          </p>
          <p className="text-xs text-slate-500">{sholatCount} dikerjakan • {Math.max(0, sholatTarget - sholatCount)} belum</p>
          <div className="grid grid-cols-5 gap-1.5 mt-3">
            {SHOLAT_5.map((s, i) => {
              const done = isHarian ? sholatPerWaktu[i] > 0 : sholatPerWaktu[i] >= daysElapsed
              return (
                <div
                  key={s.key}
                  className={cn(
                    'rounded-lg border py-2 px-1 flex flex-col items-center gap-1',
                    done ? 'bg-emerald-100/70 border-emerald-200' : 'bg-white/60 border-slate-200'
                  )}
                >
                  <span className="text-[10px] leading-tight text-center text-slate-600">{s.label}</span>
                  {isHarian ? (
                    done
                      ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                      : <Minus className="h-3.5 w-3.5 text-slate-300" />
                  ) : (
                    <span className={cn('text-[10px] font-semibold tabular-nums', done ? 'text-emerald-600' : 'text-slate-400')}>
                      {sholatPerWaktu[i]}/{daysElapsed}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </RoutineCard>

        {/* Baca Quran */}
        <RoutineCard tint="bg-teal-50/70 border-teal-200" icon={BookOpen} iconColor="text-teal-500" title="Baca Quran">
          <p className="text-2xl font-bold text-slate-900 mt-1.5">
            {quranCount}/{quranTarget} <span className="text-sm font-medium text-slate-500">sesi</span>
          </p>
          <p className="text-xs text-slate-500">{quranCount} dikerjakan • {Math.max(0, quranTarget - quranCount)} belum</p>
          <div className="grid grid-cols-5 gap-1.5 mt-3">
            {QURAN_SESSIONS.map((s, i) => {
              const done = isHarian ? quranPerSesi[i] > 0 : quranPerSesi[i] >= daysElapsed
              return (
                <div
                  key={s.key}
                  className={cn(
                    'rounded-lg border py-2 px-1 flex flex-col items-center gap-1',
                    done ? 'bg-teal-100/70 border-teal-200' : 'bg-white/60 border-slate-200'
                  )}
                >
                  <span className="text-[10px] leading-tight text-center text-slate-600">{s.label}</span>
                  {isHarian ? (
                    done
                      ? <Check className="h-3.5 w-3.5 text-teal-600" />
                      : <Minus className="h-3.5 w-3.5 text-slate-300" />
                  ) : (
                    <span className={cn('text-[10px] font-semibold tabular-nums', done ? 'text-teal-600' : 'text-slate-400')}>
                      {quranPerSesi[i]}/{daysElapsed}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </RoutineCard>

        {/* Minum Air */}
        <RoutineCard tint="bg-sky-50/70 border-sky-200" icon={GlassWater} iconColor="text-sky-500" title="Minum Air">
          <p className="text-2xl font-bold text-slate-900 mt-1.5">
            {gelas}/{targetGelasPeriod} <span className="text-sm font-medium text-slate-500">gelas</span>
          </p>
          <p className="text-xs text-slate-500">
            {isHarian
              ? (gelas >= TARGET_GELAS ? 'Target tercapai 🎉' : `${Math.max(0, TARGET_GELAS - gelas)} gelas tersisa`)
              : `Rata-rata ${avgGelas} gelas per hari`}
          </p>
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {Array.from({ length: TARGET_GELAS }).map((_, i) => (
              <Droplet
                key={i}
                className={cn('h-5 w-5', i < (isHarian ? gelas : dropletsFilled) ? 'text-sky-500 fill-sky-500' : 'text-slate-300')}
              />
            ))}
          </div>
        </RoutineCard>

        {/* Checklist */}
        <RoutineCard tint="bg-violet-50/70 border-violet-200" icon={ClipboardCheck} iconColor="text-violet-500" title={isHarian ? 'Checklist Harian' : 'Checklist'}>
          <p className="text-2xl font-bold text-slate-900 mt-1.5">
            {checklistDone}/4 <span className="text-sm font-medium text-slate-500">selesai</span>
          </p>
          <p className="text-xs text-slate-500">
            {isHarian ? 'Selesaikan hal-hal penting hari ini' : 'Tercentang bila dikerjakan setiap hari'}
          </p>
          <div className="mt-3 space-y-2">
            {checklistWithDone.map(c => (
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
