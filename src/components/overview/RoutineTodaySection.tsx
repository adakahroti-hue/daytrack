'use client'

import Link from 'next/link'
import { Check, Minus, Mosque, BookOpen, GlassWater, ClipboardCheck, Repeat, Heart, Sparkles, Shield, Moon, ArrowRight, Brain } from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { usePrayerLogRange } from '@/hooks/usePrayerLogs'
import { useQuranLogRange } from '@/hooks/useQuranLogs'
import { useWaterLogRange } from '@/hooks/useMinumAirLogs'
import { useSyukurLogRange } from '@/hooks/useSyukurLogs'
import { useDoaLogRange } from '@/hooks/useDoaLogs'
import { usePmoLogRange } from '@/hooks/usePmoLogs'
import { useTidurLogRange } from '@/hooks/useTidurLogs'
import { useMasalahLogRange } from '@/hooks/useMasalahLogs'
import { useKesenanganRange } from '@/hooks/useKesenangan'
import { PERIOD_LABEL, type OverviewPeriod, FocusTodayCard } from './FocusTodaySection'
import { MentalCard } from './ReflectionSection'

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

const SYUKUR_ALASAN_LABELS: Record<string, string> = {
  sibuk: 'Sibuk', malas: 'Malas', tidak_fokus: 'Tidak Fokus', lupa: 'Lupa', tidak_terpikir: 'Tidak Terpikir', lainnya: 'Lainnya',
}

function topReasonFn(entries: any[], match: (e: any) => boolean, extract: (e: any) => string | null): string | null {
  const counts = new Map<string, number>()
  for (const e of entries) {
    if (!match(e)) continue
    const r = extract(e)
    if (r) counts.set(r, (counts.get(r) ?? 0) + 1)
  }
  if (counts.size === 0) return null
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

const TARGET_GELAS = 5
const ML_PER_GELAS = 250

function RoutineCard({
  tint,
  icon: Icon,
  iconColor,
  title,
  href,
  linkColor,
  className,
  children,
}: {
  tint: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  href?: string
  linkColor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-xl border p-4 flex flex-col', tint, className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700 truncate">{title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {href && (
            <Link
              href={href}
              aria-label={`Buka ${title}`}
              className={cn('p-1.5 rounded-lg transition-colors hover:bg-slate-100', linkColor ?? 'text-slate-400')}
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <div className="p-1.5 rounded-lg bg-slate-100">
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
        </div>
      </div>
      {children}
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

  // Refleksi & Kesenangan Ditunda (harian/kemarin — sebaris dengan checklist)
  const { data: masalahEntries = [] } = useMasalahLogRange(startStr, endStr)
  const masalahList = (masalahEntries as any[]).map(e => e.masalah as string).filter(Boolean).slice(0, 3)
  const { data: kesenanganEntries = [] } = useKesenanganRange(startStr, endStr)
  const funList = (kesenanganEntries as any[]).filter(e => e.status === 'belum').map(e => e.kesenangan as string).filter(Boolean).slice(0, 3)

  // Alasan terbanyak tak melakukan (mingguan/bulanan/tahunan)
  const syukurTopReason = topReasonFn(syukurEntries as any[], e => e.status === 'belum', e => e.alasan_tidak ? (SYUKUR_ALASAN_LABELS[e.alasan_tidak] ?? e.alasan_tidak) : null)
  const doaTopReason = topReasonFn(doaEntries as any[], e => e.status === 'belum', e => e.keterangan?.startsWith('Tidak doa:') ? e.keterangan.replace('Tidak doa: ', '').trim() : null)
  const pmoTopReason = topReasonFn(pmoEntries as any[], e => e.status === 'relapse', e => e.catatan?.startsWith('Relapse:') ? e.catatan.replace('Relapse: ', '').trim() : null)

  // Jam tidur terbanyak (untuk card tidur — mingguan/bulanan/tahunan)
  const tidurTopJam = (() => {
    const counts = new Map<string, number>()
    for (const e of tidurEntries as any[]) {
      if (e.jam_tidur) counts.set(e.jam_tidur, (counts.get(e.jam_tidur) ?? 0) + 1)
    }
    if (counts.size === 0) return null
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  })()
  const checklistCards = [
    { key: 'syukur', title: 'Syukur', days: checklist[0].days, doneDates: doneDateSets[0], tint: 'bg-white border-slate-200', icon: Heart, iconColor: 'text-violet-500', linkColor: 'text-slate-500 hover:text-slate-700', href: '/syukur', topReason: syukurTopReason, topJam: null as string | null },
    { key: 'doa', title: 'Doa', days: checklist[1].days, doneDates: doneDateSets[1], tint: 'bg-white border-slate-200', icon: Sparkles, iconColor: 'text-rose-500', linkColor: 'text-slate-500 hover:text-slate-700', href: '/doa', topReason: doaTopReason, topJam: null as string | null },
    { key: 'pmo', title: 'PMO', days: checklist[2].days, doneDates: doneDateSets[2], tint: 'bg-white border-slate-200', icon: Shield, iconColor: 'text-orange-500', linkColor: 'text-slate-500 hover:text-slate-700', href: '/pmo', topReason: pmoTopReason, topJam: null as string | null },
    { key: 'tidur', title: 'Tidur', days: checklist[3].days, doneDates: doneDateSets[3], tint: 'bg-white border-slate-200', icon: Moon, iconColor: 'text-indigo-500', linkColor: 'text-slate-500 hover:text-slate-700', href: '/tidur', topReason: null as string | null, topJam: tidurTopJam },
  ]
  const label = PERIOD_LABEL[period]

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="h-4 w-4 text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rutinitas {label}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Kartu Tugas — revisi batch 18: digabung ke grid rutinitas */}
        <div className="col-span-full">
          <FocusTodayCard startStr={startStr} endStr={endStr} period={period} />
        </div>

        {/* Ibadah — revisi batch 22: card Sholat + Quran digabung jadi satu */}
        <RoutineCard tint="bg-white border-slate-200" icon={Mosque} iconColor="text-emerald-500" title="Ibadah" href="/sholat" linkColor="text-slate-500 hover:text-slate-700" className="xl:col-span-2">
          <div className="mt-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Mosque className="h-3.5 w-3.5" /> Sholat 5 Waktu
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {sholatCount}/{sholatTarget} <span className="text-sm font-medium text-slate-500">sholat</span>
            </p>
            <div className="grid grid-cols-5 gap-1.5 mt-2">
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
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" /> Baca Quran
            </p>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {quranCount}/{quranTarget} <span className="text-sm font-medium text-slate-500">sesi quran</span>
            </p>
            <div className="grid grid-cols-5 gap-1.5 mt-2">
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
          </div>
        </RoutineCard>

        {/* Minum Air + Checklist Harian — revisi batch 22: digabung jadi satu card (harian/kemarin).
            Mingguan/bulanan/tahunan: Minum Air tetap sendiri + 4 kartu checklist. */}
        {isHarian ? (
          <>
          <RoutineCard tint="bg-white border-slate-200" icon={GlassWater} iconColor="text-sky-500" title="Minum Air & Checklist" className="xl:col-span-2">
            <p className="text-2xl font-bold text-slate-900 mt-1.5">
              {gelas}/{targetGelasPeriod} <span className="text-sm font-medium text-slate-500">gelas</span>
            </p>
            <p className="text-xs text-slate-500">
              {gelas >= TARGET_GELAS ? 'Target tercapai 🎉' : `${Math.max(0, TARGET_GELAS - gelas)} gelas tersisa`}
            </p>
            <div className="grid grid-cols-5 gap-1.5 mt-3">
              {WATER_SESSIONS.map((s, i) => {
                const done = waterPerSesi[i] > 0
                return (
                  <div
                    key={s.key}
                    className={cn(
                      'rounded-lg border py-2 px-1 flex flex-col items-center gap-1',
                      done ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <span className="text-[10px] leading-tight text-center text-slate-600">{s.label}</span>
                    {done
                      ? <Check className="h-3.5 w-3.5 text-sky-600" />
                      : <Minus className="h-3.5 w-3.5 text-slate-300" />}
                  </div>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Checklist Harian
                </p>
                <p className="text-xs font-medium text-slate-500">{checklistDone}/4 selesai</p>
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
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
            </div>
          </RoutineCard>
          <div className="col-span-full">
            <MentalCard
              tint="bg-white border-slate-200"
              icon={Brain}
              iconColor="text-purple-500"
              dotColor="bg-slate-400"
              linkColor="text-slate-500 hover:text-slate-700"
              title="Mental"
              masalahItems={masalahList}
              funItems={funList}
              masalahEmptyText="Tidak ada refleksi tercatat."
              funEmptyText="Tidak ada kesenangan ditunda."
              href="/masalah"
            />
          </div>
          </>
        ) : (
          <>
          <RoutineCard tint="bg-white border-slate-200" icon={GlassWater} iconColor="text-sky-500" title="Minum Air" href="/minum-air" linkColor="text-slate-500 hover:text-slate-700">
            <p className="text-2xl font-bold text-slate-900 mt-1.5">
              {gelas}/{targetGelasPeriod} <span className="text-sm font-medium text-slate-500">gelas</span>
            </p>
            <p className="text-xs text-slate-500">Rata-rata {avgGelas} gelas per hari</p>
            <div className="grid grid-cols-5 gap-1.5 mt-3">
              {WATER_SESSIONS.map((s, i) => {
                const done = waterPerSesi[i] >= daysElapsed
                return (
                  <div
                    key={s.key}
                    className={cn(
                      'rounded-lg border py-2 px-1 flex flex-col items-center gap-1',
                      done ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <span className="text-[10px] leading-tight text-center text-slate-600">{s.label}</span>
                    <span className={cn('text-[10px] font-semibold tabular-nums', done ? 'text-sky-600' : 'text-slate-400')}>
                      {waterPerSesi[i]}/{daysElapsed}
                    </span>
                  </div>
                )
              })}
            </div>
          </RoutineCard>
          {checklistCards.map(c => {
            return (
              <RoutineCard key={c.key} tint={c.tint} icon={c.icon} iconColor={c.iconColor} title={c.title} href={c.href} linkColor={c.linkColor}>
                <p className="text-2xl font-bold text-slate-900 mt-1.5">
                  {c.days}<span className="text-sm font-medium text-slate-500">/{daysElapsed} hari</span>
                </p>
                <p className="text-xs text-slate-500">{c.days} hari dilakukan • {Math.max(0, daysElapsed - c.days)} tidak</p>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {c.topReason ? (
                    <p className="text-xs text-slate-500">Alasan terbanyak: <span className="font-medium text-slate-700">{c.topReason}</span></p>
                  ) : c.topJam ? (
                    <p className="text-xs text-slate-500">Jam tidur terbanyak: <span className="font-medium text-slate-700">{c.topJam.replace(':', '.')}</span></p>
                  ) : (
                    <p className="text-xs text-slate-400">Belum ada data</p>
                  )}
                </div>
              </RoutineCard>
            )
          })}
          </>
        )}
      </div>
    </section>
  )
}
