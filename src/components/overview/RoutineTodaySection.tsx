'use client'

import Link from 'next/link'
import { Check, Minus, Mosque, BookOpen, GlassWater, ClipboardCheck, Repeat, Heart, Sparkles, Shield, Moon, ArrowRight } from 'lucide-react'
import { format, startOfWeek, differenceInCalendarDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { usePrayerLogRange } from '@/hooks/usePrayerLogs'
import { useQuranLogRange } from '@/hooks/useQuranLogs'
import { useWaterLogRange } from '@/hooks/useMinumAirLogs'
import { useSyukurLogRange } from '@/hooks/useSyukurLogs'
import { useDoaLogRange } from '@/hooks/useDoaLogs'
import { usePmoLogRange } from '@/hooks/usePmoLogs'
import { useTidurLogRange } from '@/hooks/useTidurLogs'
import { PERIOD_LABEL, type OverviewPeriod, FocusTodayCard } from './FocusTodaySection'

// ─── Revisi batch 18: section "Rutinitas" untuk tab Overview (tema hitam-putih) ───

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

const WATER_SESSIONS = [
  { key: 'setelah_bangun', label: 'Setelah Bangun' },
  { key: 'setelah_dzuhur', label: 'Setelah Dzuhur' },
  { key: 'setelah_ashar', label: 'Setelah Ashar' },
  { key: 'setelah_maghrib', label: 'Setelah Maghrib' },
  { key: 'sebelum_tidur', label: 'Sebelum Tidur' },
] as const

const TARGET_GELAS = 5
const ML_PER_GELAS = 250

function RoutineCard({
  tint,
  icon: Icon,
  iconColor,
  title,
  href,
  linkColor,
  children,
}: {
  tint: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  href?: string
  linkColor?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-xl border p-4 flex flex-col', tint)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <div className="p-1.5 rounded-lg bg-slate-100">
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </div>
      {children}
      {href && (
        <Link
          href={href}
          className={cn('mt-auto pt-3 inline-flex items-center gap-1 justify-end text-xs font-medium', linkColor ?? 'text-slate-500 hover:text-slate-700')}
        >
          Selengkapnya <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

export function RoutineTodaySection({ startStr, endStr, period }: { startStr: string; endStr: string; period: OverviewPeriod }) {
  const isHarian = period === 'harian' || period === 'kemarin'

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const cappedEnd = endStr < todayStr ? endStr : todayStr
  const daysElapsed = Math.max(
    1,
    differenceInCalendarDays(new Date(cappedEnd + 'T00:00:00'), new Date(startStr + 'T00:00:00')) + 1
  )

  // Sholat 5 waktu
  const { data: prayerRows = [] } = usePrayerLogRange(startStr, endStr)
  const sholatPerWaktu = SHOLAT_5.map(s =>
    (prayerRows as any[]).filter(row => !!row?.[`sholat_${s.key}`]).length
  )
  const sholatCount = sholatPerWaktu.reduce((a, b) => a + b, 0)
  const sholatTarget = 5 * daysElapsed

  // Baca Quran
  const { data: quranEntries = [] } = useQuranLogRange(startStr, endStr)
  const quranRows = quranEntries as any[]
  const quranPerSesi = QURAN_SESSIONS.map(s =>
    quranRows.filter(e => e.waktu_baca === s.key && !(e.catatan || '').startsWith('Tidak membaca')).length
  )
  const quranCount = quranPerSesi.reduce((a, b) => a + b, 0)
  const quranTarget = 5 * daysElapsed

  // Minum Air
  const { data: waterEntries = [] } = useWaterLogRange(startStr, endStr)
  const totalMl = (waterEntries as any[]).reduce((sum, e) => sum + (e.jumlah_ml || 0), 0)
  const gelas = Math.round(totalMl / ML_PER_GELAS)
  const targetGelasPeriod = TARGET_GELAS * daysElapsed
  const avgGelas = Math.round(gelas / daysElapsed)
  const waterPerSesi = WATER_SESSIONS.map(s =>
    (waterEntries as any[]).filter(e => e.waktu_baca === s.key && e.status === 'sudah').length
  )

  // Checklist
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
  const checklistWithDone = checklist.map(c => ({ ...c, done: c.days >= daysElapsed }))
  const checklistDone = checklistWithDone.filter(c => c.done).length

  const doneDateSets = [
    new Set((syukurEntries as any[]).filter(e => e.status === 'sudah').map(e => e.tanggal)),
    new Set((doaEntries as any[]).filter(e => e.status === 'sudah').map(e => e.tanggal)),
    new Set((pmoEntries as any[]).filter(e => e.status === 'berhasil').map(e => e.tanggal)),
    new Set((tidurEntries as any[]).filter(e => e.status === 'tepat').map(e => e.tanggal)),
  ]
  const checklistCards = [
    { key: 'syukur', title: 'Syukur', days: checklist[0].days, doneDates: doneDateSets[0], tint: 'bg-white border-slate-200', icon: Heart, iconColor: 'text-violet-500', tileDone: 'bg-slate-100 border-slate-300', tileText: 'text-slate-600', linkColor: 'text-slate-500 hover:text-slate-700', href: '/syukur' },
    { key: 'doa', title: 'Doa', days: checklist[1].days, doneDates: doneDateSets[1], tint: 'bg-white border-slate-200', icon: Sparkles, iconColor: 'text-rose-500', tileDone: 'bg-slate-100 border-slate-300', tileText: 'text-slate-600', linkColor: 'text-slate-500 hover:text-slate-700', href: '/doa' },
    { key: 'pmo', title: 'PMO', days: checklist[2].days, doneDates: doneDateSets[2], tint: 'bg-white border-slate-200', icon: Shield, iconColor: 'text-orange-500', tileDone: 'bg-slate-100 border-slate-300', tileText: 'text-slate-600', linkColor: 'text-slate-500 hover:text-slate-700', href: '/pmo' },
    { key: 'tidur', title: 'Tidur', days: checklist[3].days, doneDates: doneDateSets[3], tint: 'bg-white border-slate-200', icon: Moon, iconColor: 'text-indigo-500', tileDone: 'bg-slate-100 border-slate-300', tileText: 'text-slate-600', linkColor: 'text-slate-500 hover:text-slate-700', href: '/tidur' },
  ]
  const bucketType = period === 'mingguan' ? 'day' : period === 'bulanan' ? 'week' : 'month'
  const bucketTiles = (doneDates: Set<string>) => {
    const map = new Map<string, { key: string; label: string; done: number; total: number }>()
    const start = new Date(startStr + 'T00:00:00')
    const end = new Date(cappedEnd + 'T00:00:00')
    const cur = new Date(start)
    let weekIdx = 1
    while (cur <= end) {
      let key: string, label: string
      if (bucketType === 'day') {
        key = format(cur, 'yyyy-MM-dd')
        label = format(cur, 'EEE', { locale: id })
      } else if (bucketType === 'week') {
        const ws = startOfWeek(cur, { weekStartsOn: 1 })
        key = format(ws, 'yyyy-MM-dd')
        label = `P${weekIdx}`
        if (format(cur, 'yyyy-MM-dd') === key) weekIdx++
      } else {
        key = format(cur, 'yyyy-MM')
        label = format(cur, 'MMM', { locale: id })
      }
      const b = map.get(key) ?? { key, label, done: 0, total: 0 }
      b.total++
      if (doneDates.has(format(cur, 'yyyy-MM-dd'))) b.done++
      map.set(key, b)
      cur.setDate(cur.getDate() + 1)
    }
    return [...map.values()]
  }

  const label = PERIOD_LABEL[period]

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="h-4 w-4 text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rutinitas {label}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Kartu Tugas — revisi batch 18: digabung ke grid rutinitas */}
        <FocusTodayCard startStr={startStr} endStr={endStr} period={period} />

        {/* Sholat 5 waktu */}
        <RoutineCard tint="bg-white border-slate-200" icon={Mosque} iconColor="text-emerald-500" title="Sholat 5 Waktu" href="/sholat" linkColor="text-slate-500 hover:text-slate-700">
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
                    done ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'
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
        <RoutineCard tint="bg-white border-slate-200" icon={BookOpen} iconColor="text-teal-500" title="Baca Quran" href="/quran" linkColor="text-slate-500 hover:text-slate-700">
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
                    done ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'
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
        <RoutineCard tint="bg-white border-slate-200" icon={GlassWater} iconColor="text-sky-500" title="Minum Air" href="/minum-air" linkColor="text-slate-500 hover:text-slate-700">
          <p className="text-2xl font-bold text-slate-900 mt-1.5">
            {gelas}/{targetGelasPeriod} <span className="text-sm font-medium text-slate-500">gelas</span>
          </p>
          <p className="text-xs text-slate-500">
            {isHarian
              ? (gelas >= TARGET_GELAS ? 'Target tercapai 🎉' : `${Math.max(0, TARGET_GELAS - gelas)} gelas tersisa`)
              : `Rata-rata ${avgGelas} gelas per hari`}
          </p>
          <div className="grid grid-cols-5 gap-1.5 mt-3">
            {WATER_SESSIONS.map((s, i) => {
              const done = isHarian ? waterPerSesi[i] > 0 : waterPerSesi[i] >= daysElapsed
              return (
                <div
                  key={s.key}
                  className={cn(
                    'rounded-lg border py-2 px-1 flex flex-col items-center gap-1',
                    done ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'
                  )}
                >
                  <span className="text-[10px] leading-tight text-center text-slate-600">{s.label}</span>
                  {isHarian ? (
                    done
                      ? <Check className="h-3.5 w-3.5 text-sky-600" />
                      : <Minus className="h-3.5 w-3.5 text-slate-300" />
                  ) : (
                    <span className={cn('text-[10px] font-semibold tabular-nums', done ? 'text-sky-600' : 'text-slate-400')}>
                      {waterPerSesi[i]}/{daysElapsed}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </RoutineCard>

        {/* Checklist: harian = 1 kartu agregat; mingguan/bulanan = 4 kartu */}
        {isHarian ? (
          <RoutineCard tint="bg-white border-slate-200" icon={ClipboardCheck} iconColor="text-violet-500" title="Checklist Harian">
            <p className="text-2xl font-bold text-slate-900 mt-1.5">
              {checklistDone}/4 <span className="text-sm font-medium text-slate-500">selesai</span>
            </p>
            <p className="text-xs text-slate-500">Selesaikan hal-hal penting hari ini</p>
            <div className="mt-3 space-y-2">
              {checklistWithDone.map(c => (
                <div key={c.label} className="flex items-center gap-2.5">
                  <span className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                    c.done ? 'bg-slate-700 border-slate-700' : 'bg-white border-slate-300'
                  )}>
                    {c.done && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className={cn('text-sm', c.done ? 'text-slate-700' : 'text-slate-500')}>{c.label}</span>
                </div>
              ))}
            </div>
          </RoutineCard>
        ) : (
          checklistCards.map(c => {
            const tiles = bucketTiles(c.doneDates)
            return (
              <RoutineCard key={c.key} tint={c.tint} icon={c.icon} iconColor={c.iconColor} title={c.title} href={c.href} linkColor={c.linkColor}>
                <p className="text-2xl font-bold text-slate-900 mt-1.5">
                  {c.days}<span className="text-sm font-medium text-slate-500">/{daysElapsed} hari</span>
                </p>
                <p className="text-xs text-slate-500">{c.days} hari dilakukan • {Math.max(0, daysElapsed - c.days)} tidak</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tiles.map(t => {
                    const done = t.total > 0 && t.done === t.total
                    return (
                      <div
                        key={t.key}
                        className={cn(
                          'rounded-lg border py-1.5 px-0.5 flex flex-col items-center gap-0.5 flex-1 min-w-[30px]',
                          done ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'
                        )}
                      >
                        <span className="text-[10px] leading-tight text-center text-slate-600">{t.label}</span>
                        {done
                          ? <Check className="h-3 w-3 text-slate-700" />
                          : <span className="text-[10px] font-semibold tabular-nums text-slate-500">{t.done}/{t.total}</span>}
                      </div>
                    )
                  })}
                </div>
              </RoutineCard>
            )
          })
        )}
      </div>
    </section>
  )
}
