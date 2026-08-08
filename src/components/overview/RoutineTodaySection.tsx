'use client'

import Link from 'next/link'
import { Check, Minus, Mosque, BookOpen, GlassWater, Repeat, Heart, Sparkles, Shield, Moon, ArrowRight, Brain } from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { JAM_TIDUR_OPTIONS } from '@/lib/tidur-options'
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

const WATER_PILL_LABELS: Record<string, string> = {
  setelah_bangun: 'Bangun', setelah_dzuhur: 'Dzuhur', setelah_ashar: 'Ashar',
  setelah_maghrib: 'Maghrib', sebelum_tidur: 'Tidur',
}

const QURAN_PILL_LABELS: Record<string, string> = {
  setelah_subuh: 'Subuh', setelah_dzuhur: 'Dzuhur', setelah_ashar: 'Ashar',
  setelah_maghrib: 'Maghrib', setelah_isya: 'Isya',
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
  // Refleksi & Kesenangan Ditunda (harian/kemarin — sebaris dengan checklist)
  const { data: masalahEntries = [] } = useMasalahLogRange(startStr, endStr)
  const masalahList = (masalahEntries as any[]).map(e => e.masalah as string).filter(Boolean).slice(0, 3)
  const { data: kesenanganEntries = [] } = useKesenanganRange(startStr, endStr)
  const funList = (kesenanganEntries as any[]).filter(e => e.status === 'belum').map(e => e.kesenangan as string).filter(Boolean).slice(0, 3)

  // Jam tidur terbanyak (untuk card tidur — mingguan/bulanan/tahunan)
  const tidurTopJam = (() => {
    const counts = new Map<string, number>()
    for (const e of tidurEntries as any[]) {
      if (e.jam_tidur) counts.set(e.jam_tidur, (counts.get(e.jam_tidur) ?? 0) + 1)
    }
    if (counts.size === 0) return null
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  })()
  // Rekor PMO — hari_ke terbesar dalam rentang (streak terpanjang tercatat)
  const pmoRekor = (pmoEntries as any[]).reduce((m, e) => Math.max(m, e.hari_ke || 0), 0)
  const label = PERIOD_LABEL[period]

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Repeat className="h-4 w-4 text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rutinitas {label}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kartu Tugas — full width (mockup batch 23) */}
        <div className="col-span-full">
          <FocusTodayCard startStr={startStr} endStr={endStr} period={period} />
        </div>

        {/* Ibadah — revisi batch 23: mengikuti mockup (angka kiri, pill kanan) */}
        <RoutineCard tint="bg-white border-slate-200" icon={Mosque} iconColor="text-emerald-500" title="Ibadah">
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Mosque className="h-3.5 w-3.5 text-emerald-500" /> Sholat 5 Waktu
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {sholatCount}<span className="text-sm font-medium text-slate-500">/{sholatTarget} sholat</span>
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {SHOLAT_5.map((s, i) => {
                  const done = isHarian ? sholatPerWaktu[i] > 0 : sholatPerWaktu[i] >= daysElapsed
                  return (
                    <div
                      key={s.key}
                      className={cn(
                        'rounded-lg border py-1.5 px-0.5 min-w-0 flex flex-col items-center gap-0.5',
                        done ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'
                      )}
                    >
                      <span className="text-[9px] leading-tight text-slate-600">{s.label}</span>
                      {isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-emerald-600" />
                          : <Minus className="h-3 w-3 text-slate-300" />
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
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-emerald-500" /> Baca Quran
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {quranCount}<span className="text-sm font-medium text-slate-500">/{quranTarget} sesi</span>
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {QURAN_SESSIONS.map((s, i) => {
                  const done = isHarian ? quranPerSesi[i] > 0 : quranPerSesi[i] >= daysElapsed
                  return (
                    <div
                      key={s.key}
                      className={cn(
                        'rounded-lg border py-1.5 px-0.5 min-w-0 flex flex-col items-center gap-0.5',
                        done ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'
                      )}
                    >
                      <span className="text-[9px] leading-tight text-slate-600">{QURAN_PILL_LABELS[s.key] ?? s.label}</span>
                      {isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-teal-600" />
                          : <Minus className="h-3 w-3 text-slate-300" />
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
          </div>
          {/* #3: Optimasi Hoki — isi card Optimasi Hidup dipindahkan sini (batch 25) */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Optimasi Hoki
            </p>
            <div className="mt-2 flex items-center gap-4 flex-wrap text-sm">
              <div className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-slate-700">Bersyukur</span>
                <span className={cn('font-semibold tabular-nums', checklist[0].days >= daysElapsed ? 'text-emerald-600' : 'text-slate-500')}>
                  {checklist[0].days}/{daysElapsed}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-slate-700">Mendoakan orang lain</span>
                <span className={cn('font-semibold tabular-nums', checklist[1].days >= daysElapsed ? 'text-emerald-600' : 'text-slate-500')}>
                  {checklist[1].days}/{daysElapsed}
                </span>
              </div>
            </div>
          </div>
        </RoutineCard>

        {/* Kesehatan — Minum Air + Waktu Tidur + Bebas PMO (mockup batch 23: kolom kanan) */}
        <RoutineCard tint="bg-white border-slate-200" icon={GlassWater} iconColor="text-sky-500" title="Kesehatan">
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <GlassWater className="h-3.5 w-3.5 text-sky-500" /> Minum Air
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {gelas}<span className="text-sm font-medium text-slate-500">/{targetGelasPeriod} gelas</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isHarian
                    ? (gelas >= TARGET_GELAS ? 'Target tercapai 🎉' : `${Math.max(0, TARGET_GELAS - gelas)} gelas tersisa`)
                    : `Rata-rata ${avgGelas} gelas per hari`}
                </p>
              </div>
              <div className="grid grid-cols-5 gap-1.5 shrink-0">
                {WATER_SESSIONS.map((s, i) => {
                  const done = isHarian ? waterPerSesi[i] > 0 : waterPerSesi[i] >= daysElapsed
                  return (
                    <div
                      key={s.key}
                      className={cn(
                        'rounded-lg border py-1.5 px-0.5 min-w-0 flex flex-col items-center gap-0.5',
                        done ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'
                      )}
                    >
                      <span className="text-[9px] leading-tight text-slate-600">{WATER_PILL_LABELS[s.key] ?? s.label}</span>
                      {isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-sky-600" />
                          : <Minus className="h-3 w-3 text-slate-300" />
                      ) : (
                        <span className={cn('text-[10px] font-semibold tabular-nums', done ? 'text-sky-600' : 'text-slate-400')}>
                          {waterPerSesi[i]}/{daysElapsed}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Moon className="h-3.5 w-3.5 text-sky-500" /> Waktu Tidur
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {checklist[3].days}<span className="text-sm font-medium text-slate-500">/{daysElapsed} tepat</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tidurTopJam ? `Jam tidur terbanyak: ${tidurTopJam.replace(':', '.')}` : 'Belum ada data'}
                </p>
              </div>
              <div className="grid grid-cols-5 gap-1.5 shrink-0">
                {JAM_TIDUR_OPTIONS.map(o => (
                  <div
                    key={o.value}
                    className={cn(
                      'rounded-lg border py-1.5 px-0.5 min-w-0 flex flex-col items-center gap-0.5',
                      o.status === 'tepat' ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <span className="text-[9px] leading-tight text-slate-600">{o.label}</span>
                    {o.status === 'tepat'
                      ? <Check className="h-3 w-3 text-indigo-600" />
                      : <Minus className="h-3 w-3 text-slate-300" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-sky-500" /> Bebas PMO
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {checklist[2].days}<span className="text-sm font-medium text-slate-500">/{daysElapsed} berhasil</span>
              </p>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Rekor</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums">{pmoRekor} <span className="text-xs font-medium text-slate-500">hari</span></p>
              </div>
            </div>
          </div>
        </RoutineCard>

        {/* Mental — full width (mockup batch 23: bawah) */}
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
      </div>
    </section>
  )
}
