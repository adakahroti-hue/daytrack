'use client'

import Link from 'next/link'
import { Check, Minus, Mosque, BookOpen, GlassWater, Repeat, Sparkles, Shield, Moon, ArrowRight, Wallet, HandCoins, Sun } from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'
import { cn, formatRupiah } from '@/lib/utils'
import { useSholatSunnahRange } from '@/hooks/useSholatSunnah'
import { usePrayerLogRange } from '@/hooks/usePrayerLogs'
import { useQuranLogRange } from '@/hooks/useQuranLogs'
import { useWaterLogRange } from '@/hooks/useMinumAirLogs'
import { useSyukurLogRange } from '@/hooks/useSyukurLogs'
import { useDoaLogRange } from '@/hooks/useDoaLogs'
import { useSedekahLogRange } from '@/hooks/useSedekahLogs'
import { usePmoLogRange } from '@/hooks/usePmoLogs'
import { useTidurLogRange } from '@/hooks/useTidurLogs'
import { useArusKasRange } from '@/hooks/useArusKas'
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

const SUNNAH_TIMES = [
  { key: 'dhuha', label: 'Dhuha' },
  { key: 'tahajud', label: 'Tahajud' },
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

const REASON_LABELS: Record<string, string> = {
  malas: 'Malas',
  lupa: 'Lupa',
  ketiduran: 'Ketiduran',
  sibuk: 'Sibuk',
  sakit: 'Sakit',
  perjalanan: 'Perjalanan',
  tak_ada_tempat: 'Tak ada tempat',
  bersama_teman: 'Bersama teman',
  lainnya: 'Lainnya',
  'Lambat Makan Pagi': 'Lambat Makan Pagi',
  'Lambat Makan Malam': 'Lambat Makan Malam',
  'Kurang Aktivitas': 'Kurang Aktivitas',
  'Makan Malam Sedikit': 'Makan Malam Sedikit',
  'Laptopan Lama': 'Laptopan Lama',
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
    <div className={cn('rounded-xl border px-4 py-3 flex flex-col', tint, className)}>
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

// ─── Donut x/y (pie chart) untuk card Ibadah & Kesehatan di filter mingguan ───
function XyDonut({
  value,
  target,
  color,
  size = 60,
  label,
}: {
  value: number
  target: number
  color: string
  size?: number
  label?: string
}) {
  const pct = target > 0 ? Math.max(0, Math.min(100, Math.round((value / target) * 100))) : 0
  const stroke = Math.max(5, Math.round(size * 0.11))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  const fontSize = Math.round(size * 0.24)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center leading-none">
          <span className="font-bold tabular-nums text-slate-900" style={{ fontSize }}>
            {value}<span style={{ fontSize: Math.round(fontSize * 0.7) }} className="text-slate-400">/{target}</span>
          </span>
        </div>
      </div>
      {label && <span className="text-[10px] sm:text-xs text-slate-700 text-center leading-tight">{label}</span>}
    </div>
  )
}

export function RoutineTodaySection({ startStr, endStr, metricEndStr, period }: { startStr: string; endStr: string; metricEndStr: string; period: OverviewPeriod }) {
  const isHarian = period === 'harian' || period === 'kemarin'
  const isKemarin = period === 'kemarin'
  // Shot = rentang Minggu–Sabtu (tampilan sama dengan mingguan, termasuk donut x/y)
  const isWeekly = period === 'mingguan' || period === 'shot'

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const cappedEnd = endStr < todayStr ? endStr : todayStr
  const daysElapsed = Math.max(
    1,
    differenceInCalendarDays(new Date(cappedEnd + 'T00:00:00'), new Date(startStr + 'T00:00:00')) + 1
  )

  // Revisi batch 35: angka di bawah subjudul — hijau saat target tercapai, merah khusus filter Kemarin
  const numColor = (reached: boolean) =>
    reached ? 'text-emerald-600' : isKemarin ? 'text-red-500' : 'text-slate-900'
  const numColorSoft = (reached: boolean) =>
    reached ? 'text-emerald-600/70' : isKemarin ? 'text-red-500/70' : 'text-slate-500'

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
    quranRows.filter(e => e.waktu_baca === s.key && e.status === 'sudah').length
  )
  const quranCount = quranPerSesi.reduce((a, b) => a + b, 0)
  const quranTarget = 5 * daysElapsed

  // Sholat Sunnah (Dhuha + Tahajud)
  const { data: sunnahRows = [] } = useSholatSunnahRange(startStr, endStr)
  const sunnahPerWaktu = SUNNAH_TIMES.map(s =>
    (sunnahRows as any[]).filter(row => !!row?.[`sholat_${s.key}`]).length
  )
  const sunnahCount = sunnahPerWaktu.reduce((a, b) => a + b, 0)
  const sunnahTarget = 2 * daysElapsed

  // Insight Sholat 5 Waktu: waktu paling sering terlewat + alasan paling sering
  const sholatMissedIdx = sholatPerWaktu.indexOf(Math.min(...sholatPerWaktu))
  const sholatMostMissed = daysElapsed - sholatPerWaktu[sholatMissedIdx]
  const sholatReasonCount = new Map<string, number>()
  ;(prayerRows as any[]).forEach(r => {
    SHOLAT_5.forEach(s => {
      if (!r?.[`sholat_${s.key}`] && r?.[`alasan_${s.key}`]) {
        const k = r[`alasan_${s.key}`] as string
        sholatReasonCount.set(k, (sholatReasonCount.get(k) || 0) + 1)
      }
    })
  })
  let sholatTopReason = null as string | null
  let sholatTopReasonCount = 0
  sholatReasonCount.forEach((v, k) => { if (v > sholatTopReasonCount) { sholatTopReasonCount = v; sholatTopReason = k } })

  // Insight Baca Quran: sesi paling sering terlewat + alasan paling sering
  const quranMissedIdx = quranPerSesi.indexOf(Math.min(...quranPerSesi))
  const quranMostMissed = daysElapsed - quranPerSesi[quranMissedIdx]
  const quranReasonCount = new Map<string, number>()
  ;(quranRows as any[]).forEach(e => {
    if (e.status !== 'sudah' && e.alasan) {
      const k = e.alasan as string
      quranReasonCount.set(k, (quranReasonCount.get(k) || 0) + 1)
    }
  })
  let quranTopReason = null as string | null
  let quranTopReasonCount = 0
  quranReasonCount.forEach((v, k) => { if (v > quranTopReasonCount) { quranTopReasonCount = v; quranTopReason = k } })

  // Minum Air
  const { data: waterEntries = [] } = useWaterLogRange(startStr, endStr)
  const totalMl = (waterEntries as any[]).reduce((sum, e) => sum + (e.jumlah_ml || 0), 0)
  const gelas = Math.round(totalMl / ML_PER_GELAS)
  const targetGelasPeriod = TARGET_GELAS * daysElapsed
  const waterPerSesi = WATER_SESSIONS.map(s =>
    (waterEntries as any[]).filter(e => e.waktu_minum === s.key && e.status === 'sudah').length
  )

  // Checklist
  const { data: syukurEntries = [] } = useSyukurLogRange(startStr, endStr)
  const { data: doaEntries = [] } = useDoaLogRange(startStr, endStr)
  const { data: sedekahEntries = [] } = useSedekahLogRange(startStr, endStr)
  const sedekahCount = (sedekahEntries as any[]).filter(e => e.status === 'sudah').length
  const { data: pmoEntries = [] } = usePmoLogRange(startStr, endStr)
  const { data: tidurEntries = [] } = useTidurLogRange(startStr, endStr)
  // Minum Air — insight waktu sering terlewat
  const waterMissedIdx = waterPerSesi.indexOf(Math.min(...waterPerSesi))
  const waterMostMissed = daysElapsed - waterPerSesi[waterMissedIdx]

  // Tidur — rata-rata durasi, tidur paling lambat, bangun paling lambat, alasan begadang terpopuler
  const tidurRows = tidurEntries as any[]
  const durasiVals = tidurRows.map(e => e.durasi_jam).filter((v: number | null) => typeof v === 'number' && v > 0)
  const avgDurasi = durasiVals.length ? Math.round(durasiVals.reduce((a: number, b: number) => a + b, 0) / durasiVals.length * 10) / 10 : 0
  const jamTidurList = tidurRows.map(e => e.jam_tidur).filter(Boolean).sort() as string[]
  const jamBangunList = tidurRows.map(e => e.jam_bangun).filter(Boolean).sort() as string[]
  const fmtJam = (v: string | null) => v ? v.slice(0, 5) : null
  const tidurPalingLambat = fmtJam(jamTidurList.length ? jamTidurList[jamTidurList.length - 1] : null)
  const bangunPalingLambat = fmtJam(jamBangunList.length ? jamBangunList[jamBangunList.length - 1] : null)
  const tidurAlasanCount = new Map<string, number>()
  tidurRows.forEach(e => { if (e.status === 'begadang' && e.alasan_tidak) { const k = e.alasan_tidak as string; tidurAlasanCount.set(k, (tidurAlasanCount.get(k) || 0) + 1) } })
  let tidurTopAlasan = null as string | null
  let tidurTopAlasanCount = 0
  tidurAlasanCount.forEach((v, k) => { if (v > tidurTopAlasanCount) { tidurTopAlasanCount = v; tidurTopAlasan = k } })

  // PMO — alasan relapse terpopuler (jika ada)
  const pmoRows = pmoEntries as any[]
  const pmoRelapse = pmoRows.filter(e => e.status === 'relapse')
  const pmoAlasanCount = new Map<string, number>()
  pmoRelapse.forEach(e => { if (e.alasan) { const k = e.alasan as string; pmoAlasanCount.set(k, (pmoAlasanCount.get(k) || 0) + 1) } })
  let pmoTopAlasan = null as string | null
  let pmoTopAlasanCount = 0
  pmoAlasanCount.forEach((v, k) => { if (v > pmoTopAlasanCount) { pmoTopAlasanCount = v; pmoTopAlasan = k } })

  // Syukur / Doa / Sedekah — alasan tidak melakukannya (terpopuler per masing-masing)
  const topReasonOf = (entries: any[], getKey: (e: any) => string | null) => {
    const m = new Map<string, number>()
    entries.forEach(e => { const k = getKey(e); if (k) m.set(k, (m.get(k) || 0) + 1) })
    let top: string | null = null; let c = 0
    m.forEach((v, k) => { if (v > c) { c = v; top = k } })
    return top ? { reason: top, count: c } : null
  }
  const syukurReason = topReasonOf(syukurEntries as any[], e => e.alasan_tidak ?? null)
  const doaReason = topReasonOf(doaEntries as any[], e => e.alasan ?? null)
  const sedekahReason = topReasonOf(sedekahEntries as any[], e => e.alasan_tidak ?? null)


  // Arus Kas — saldo & sisa alokasi kebutuhan (range di-cap ke today, sama seperti tab Arus Kas)
  const akTodayStr = format(new Date(), 'yyyy-MM-dd')
  const akEndStr = endStr > akTodayStr ? akTodayStr : endStr
  const { data: arusKasEntries = [] } = useArusKasRange(startStr, akEndStr)
  const arusKas = (arusKasEntries as any[]) || []
  const akMasuk = arusKas.filter(e => e.kategori === 'uang_masuk').reduce((s, e) => s + (e.nominal || 0), 0)
  const akKeluar = arusKas.filter(e => e.kategori === 'uang_keluar').reduce((s, e) => s + (e.nominal || 0), 0)
  const akSaldo = akMasuk - akKeluar
  const akPakaiKebutuhan = arusKas.filter(e => e.kategori === 'uang_keluar' && e.dompet === 'kebutuhan').reduce((s, e) => s + (e.nominal || 0), 0)
  const akKebutuhanSisa = Math.max(0, Math.round((akMasuk * 70) / 100) - akPakaiKebutuhan)
  const countDays = (entries: any[], match: (e: any) => boolean) =>
    new Set(entries.filter(match).map(e => e.tanggal)).size
  const checklist = [
    { label: 'Bersyukur', days: countDays(syukurEntries as any[], e => e.status === 'sudah') },
    { label: 'Mendoakan orang lain', days: countDays(doaEntries as any[], e => e.status === 'sudah') },
    { label: 'Bebas PMO', days: countDays(pmoEntries as any[], e => e.status === 'berhasil') },
    { label: 'Tidur tepat waktu', days: countDays(tidurEntries as any[], e => e.status === 'tepat') },
  ]
  // Rekor PMO — hari_ke terbesar dalam rentang (streak terpanjang tercatat)
  const pmoRekor = (pmoEntries as any[]).reduce((m, e) => Math.max(m, e.hari_ke || 0), 0)
  const label = PERIOD_LABEL[period]

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Repeat className="h-4 w-4 text-slate-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rutinitas {label}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Kartu Tugas — full width (mockup batch 23) */}
        <div className="col-span-full">
          <FocusTodayCard startStr={startStr} endStr={metricEndStr} period={period} />
        </div>

        {/* Ibadah — revisi batch 23: mengikuti mockup (angka kiri, pill kanan) */}
        <RoutineCard tint="bg-white border-slate-200" icon={Mosque} iconColor="text-emerald-500" title="Ibadah">
          <div className="mt-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 lg:flex-1 flex items-center gap-3">
                {isWeekly && <XyDonut value={sholatCount} target={sholatTarget} color="#10b981" />}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                    <Mosque className="h-3.5 w-3.5 text-emerald-500" /> Sholat 5 Waktu
                  </p>
                  {isWeekly ? (
                    <p className="mt-1 text-sm text-slate-500"><span className="font-semibold text-slate-900 tabular-nums">{sholatCount}/{sholatTarget}</span> sholat</p>
                  ) : (
                    <p className="mt-2 pl-[18px] flex items-baseline gap-1.5 leading-none">
                      <span className={cn('text-[22px] font-bold tabular-nums', numColor(sholatCount >= sholatTarget))}>{sholatCount}<span className={cn('text-lg', numColorSoft(sholatCount >= sholatTarget))}>/{sholatTarget}</span></span>
                      <span className="text-sm font-medium text-slate-500">sholat</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-x-2 lg:gap-x-6 shrink-0 w-full lg:w-auto">
                {SHOLAT_5.map((s, i) => {
                  const done = isHarian ? sholatPerWaktu[i] > 0 : sholatPerWaktu[i] >= daysElapsed
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-0.5 min-w-0">
                      <span className="text-xs leading-tight text-slate-500">{s.label}</span>
                      {isWeekly ? (
                        <XyDonut value={sholatPerWaktu[i]} target={daysElapsed} color="#10b981" size={40} />
                      ) : isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-emerald-600" />
                          : <Minus className="h-3 w-3 text-slate-300" />
                      ) : (
                        <span className={cn('text-[11px] font-semibold tabular-nums', done ? 'text-emerald-600' : 'text-slate-500')}>
                          {sholatPerWaktu[i]}/{daysElapsed}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          {/* Insight Sholat 5 Waktu */}
          {sholatMostMissed > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1 ml-auto">
                <span className="font-medium text-slate-700">Sering terlewat:</span>
                <span className="font-semibold text-rose-600">{SHOLAT_5[sholatMissedIdx].label}</span>
                <span className="text-slate-400">({sholatMostMissed}×)</span>
              </span>
              {sholatTopReason && (
                <span className="flex items-center gap-1">
                  <span className="font-medium text-slate-700">Alasan:</span>
                  <span className="font-semibold text-slate-800">{REASON_LABELS[sholatTopReason] ?? sholatTopReason}</span>
                  <span className="text-slate-400">({sholatTopReasonCount}×)</span>
                </span>
              )}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 lg:flex-1 flex items-center gap-3">
                {isWeekly && <XyDonut value={sunnahCount} target={sunnahTarget} color="#22c55e" />}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                    <Sun className="h-3.5 w-3.5 text-amber-500" /> Sholat Sunnah
                  </p>
                  {isWeekly ? (
                    <p className="mt-1 text-sm text-slate-500"><span className="font-semibold text-slate-900 tabular-nums">{sunnahCount}/{sunnahTarget}</span> sholat</p>
                  ) : (
                    <p className="mt-2 pl-[18px] flex items-baseline gap-1.5 leading-none">
                      <span className={cn('text-[22px] font-bold tabular-nums', numColor(sunnahCount >= sunnahTarget))}>{sunnahCount}<span className={cn('text-lg', numColorSoft(sunnahCount >= sunnahTarget))}>/{sunnahTarget}</span></span>
                      <span className="text-sm font-medium text-slate-500">sholat</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-2 lg:gap-x-6 shrink-0 w-full lg:w-auto">
                {SUNNAH_TIMES.map((s, i) => {
                  const done = isHarian ? sunnahPerWaktu[i] > 0 : sunnahPerWaktu[i] >= daysElapsed
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-0.5 min-w-0">
                      <span className="text-xs leading-tight text-slate-500">{s.label}</span>
                      {isWeekly ? (
                        <XyDonut value={sunnahPerWaktu[i]} target={daysElapsed} color="#22c55e" size={40} />
                      ) : isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-amber-600" />
                          : <Minus className="h-3 w-3 text-slate-300" />
                      ) : (
                        <span className={cn('text-[11px] font-semibold tabular-nums', done ? 'text-amber-600' : 'text-slate-500')}>
                          {sunnahPerWaktu[i]}/{daysElapsed}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 lg:flex-1 flex items-center gap-3">
                {isWeekly && <XyDonut value={quranCount} target={quranTarget} color="#14b8a6" />}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-500" /> Baca Quran
                  </p>
                  {isWeekly ? (
                    <p className="mt-1 text-sm text-slate-500"><span className="font-semibold text-slate-900 tabular-nums">{quranCount}/{quranTarget}</span> sesi</p>
                  ) : (
                    <p className="mt-2 pl-[18px] flex items-baseline gap-1.5 leading-none">
                      <span className={cn('text-[22px] font-bold tabular-nums', numColor(quranCount >= quranTarget))}>{quranCount}<span className={cn('text-lg', numColorSoft(quranCount >= quranTarget))}>/{quranTarget}</span></span>
                      <span className="text-sm font-medium text-slate-500">sesi</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-x-2 lg:gap-x-6 shrink-0 w-full lg:w-auto">
                {QURAN_SESSIONS.map((s, i) => {
                  const done = isHarian ? quranPerSesi[i] > 0 : quranPerSesi[i] >= daysElapsed
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-0.5 min-w-0">
                      <span className="text-xs leading-tight text-slate-500">{QURAN_PILL_LABELS[s.key] ?? s.label}</span>
                      {isWeekly ? (
                        <XyDonut value={quranPerSesi[i]} target={daysElapsed} color="#14b8a6" size={40} />
                      ) : isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-teal-600" />
                          : <Minus className="h-3 w-3 text-slate-300" />
                      ) : (
                        <span className={cn('text-[11px] font-semibold tabular-nums', done ? 'text-teal-600' : 'text-slate-500')}>
                          {quranPerSesi[i]}/{daysElapsed}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          {/* Insight Baca Quran */}
          {quranMostMissed > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1 ml-auto">
                <span className="font-medium text-slate-700">Sering terlewat:</span>
                <span className="font-semibold text-rose-600">{QURAN_SESSIONS[quranMissedIdx].label}</span>
                <span className="text-slate-400">({quranMostMissed}×)</span>
              </span>
              {quranTopReason && (
                <span className="flex items-center gap-1">
                  <span className="font-medium text-slate-700">Alasan:</span>
                  <span className="font-semibold text-slate-800">{REASON_LABELS[quranTopReason] ?? quranTopReason}</span>
                  <span className="text-slate-400">({quranTopReasonCount}×)</span>
                </span>
              )}
            </div>
          )}
          {/* #3: Optimasi Hoki dipindah jadi card tersendiri di bawah */}

        </RoutineCard>

        {/* Kesehatan — Minum Air + Waktu Tidur + Bebas PMO (mockup batch 23: kolom kanan) */}
        <RoutineCard tint="bg-white border-slate-200" icon={Shield} iconColor="text-sky-500" title="Kesehatan">
          <div className="mt-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 lg:flex-1 flex items-center gap-3">
                {isWeekly && <XyDonut value={gelas} target={targetGelasPeriod} color="#0ea5e9" />}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                    <GlassWater className="h-3.5 w-3.5 text-sky-500" /> Minum Air
                  </p>
                  {isWeekly ? (
                    <p className="mt-1 text-sm text-slate-500"><span className="font-semibold text-slate-900 tabular-nums">{gelas}/{targetGelasPeriod}</span> gelas</p>
                  ) : (
                    <p className="mt-2 pl-[18px] flex items-baseline gap-1.5 leading-none">
                      <span className={cn('text-[22px] font-bold tabular-nums', numColor(gelas >= targetGelasPeriod))}>{gelas}<span className={cn('text-lg', numColorSoft(gelas >= targetGelasPeriod))}>/{targetGelasPeriod}</span></span>
                      <span className="text-sm font-medium text-slate-500">gelas</span>
                    </p>
                  )}
                  {isHarian && gelas >= TARGET_GELAS && (
                    <p className="text-xs text-slate-500 mt-1">
                      Target tercapai 🎉
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-x-2 lg:gap-x-6 shrink-0 w-full lg:w-auto">
                {WATER_SESSIONS.map((s, i) => {
                  const done = isHarian ? waterPerSesi[i] > 0 : waterPerSesi[i] >= daysElapsed
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-0.5 min-w-0">
                      <span className="text-xs leading-tight text-slate-500">{WATER_PILL_LABELS[s.key] ?? s.label}</span>
                      {isWeekly ? (
                        <XyDonut value={waterPerSesi[i]} target={daysElapsed} color="#0ea5e9" size={40} />
                      ) : isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-sky-600" />
                          : <Minus className="h-3 w-3 text-slate-300" />
                      ) : (
                        <span className={cn('text-[11px] font-semibold tabular-nums', done ? 'text-sky-600' : 'text-slate-500')}>
                          {waterPerSesi[i]}/{daysElapsed}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Insight Minum Air */}
            {waterMostMissed > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1 ml-auto">
                  <span className="font-medium text-slate-700">Sering terlewat:</span>
                  <span className="font-semibold text-rose-600">{WATER_PILL_LABELS[WATER_SESSIONS[waterMissedIdx].key] ?? WATER_SESSIONS[waterMissedIdx].label}</span>
                  <span className="text-slate-400">({waterMostMissed}×)</span>
                </span>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
              <Moon className="h-3.5 w-3.5 text-sky-500" /> Waktu Tidur
            </p>
            <div className="mt-1.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex items-center gap-3">
                {isWeekly ? (
                  <XyDonut value={checklist[3].days} target={daysElapsed} color="#0ea5e9" size={52} />
                ) : (
                  <div className="flex items-baseline gap-1.5 leading-none pl-[2px]">
                    <span className={cn('text-[22px] font-bold tabular-nums', numColor(checklist[3].days >= daysElapsed))}>{checklist[3].days}<span className={cn('text-lg', numColorSoft(checklist[3].days >= daysElapsed))}>/{daysElapsed}</span></span>
                  </div>
                )}
                <span className="text-sm font-medium text-slate-500">hari tepat</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm lg:justify-end">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Avg Durasi</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{avgDurasi > 0 ? `${avgDurasi} jam` : '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Tidur lambat</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{tidurPalingLambat ?? '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Bangun lambat</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{bangunPalingLambat ?? '—'}</span>
                </div>
                {tidurTopAlasan && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Alasan</span>
                    <span className="font-semibold text-rose-600">{REASON_LABELS[tidurTopAlasan] ?? tidurTopAlasan}</span>
                    <span className="text-xs text-slate-400">({tidurTopAlasanCount}×)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-sky-500" /> Bebas PMO
            </p>
            <div className="mt-1.5 flex items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                {isWeekly && <XyDonut value={checklist[2].days} target={daysElapsed} color="#0ea5e9" size={52} />}
                {isWeekly ? (
                  <p className="text-sm text-slate-500"><span className="font-semibold text-slate-900 tabular-nums">{checklist[2].days}/{daysElapsed}</span> berhasil</p>
                ) : (
                  <p className="pl-[18px] flex items-baseline gap-1.5 leading-none">
                    <span className={cn('text-[22px] font-bold tabular-nums', numColor(checklist[2].days >= daysElapsed))}>{checklist[2].days}<span className={cn('text-lg', numColorSoft(checklist[2].days >= daysElapsed))}>/{daysElapsed}</span></span>
                    <span className="text-sm font-medium text-slate-500">berhasil</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rekor</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums">{pmoRekor} <span className="text-xs font-medium text-slate-500">hari</span></p>
              </div>
            </div>
            {pmoTopAlasan && (
              <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1 ml-auto">
                  <span className="font-medium text-slate-700">Alasan relapse:</span>
                  <span className="font-semibold text-rose-600">{pmoTopAlasan}</span>
                  <span className="text-slate-400">({pmoTopAlasanCount}×)</span>
                </span>
              </div>
            )}
          </div>
        </RoutineCard>

        {/* Keuangan + Optimasi Hoki — sebaris (grid 2 kolom) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Keuangan — Kebutuhan & Saldo dari tab Arus Kas */}
        <RoutineCard tint="bg-white border-slate-200" icon={Wallet} iconColor="text-emerald-500" title="Keuangan">
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kebutuhan</p>
              <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatRupiah(akKebutuhanSisa)}</p>
              <p className="text-[11px] text-slate-400">sisa alokasi</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo</p>
              <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatRupiah(akSaldo)}</p>
              <p className="text-[11px] text-slate-400">masuk − keluar</p>
            </div>
          </div>
        </RoutineCard>

        {/* Optimasi Hoki — card tersendiri (sebaris dengan Keuangan) */}
        <RoutineCard tint="bg-white border-slate-200" icon={Sparkles} iconColor="text-emerald-500" title="Optimasi Hoki">
          {period === 'mingguan' ? (
            <div className="mt-3 flex items-center gap-x-4 sm:gap-x-8 gap-y-3 flex-wrap text-sm">
              <XyDonut value={checklist[0].days} target={daysElapsed} color="#10b981" size={44} label="Bersyukur" />
              <XyDonut value={checklist[1].days} target={daysElapsed} color="#10b981" size={44} label="Doakan" />
              <XyDonut value={sedekahCount} target={daysElapsed} color="#10b981" size={44} label="Sedekah" />
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-y-3 text-sm">
              <div>
                <div className="flex items-center gap-1">
                  <span className={cn('text-[18px] sm:text-[22px] font-bold leading-none tabular-nums', numColor(checklist[0].days >= daysElapsed))}>{checklist[0].days}<span className={cn('text-sm sm:text-lg', numColorSoft(checklist[0].days >= daysElapsed))}>/{daysElapsed}</span></span>
                  <span className="text-[10px] sm:text-xs text-slate-700">Bersyukur</span>
                </div>
                {syukurReason && <p className="mt-0.5 text-[11px] text-rose-500">Alasan: {REASON_LABELS[syukurReason.reason] ?? syukurReason.reason}</p>}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className={cn('text-[18px] sm:text-[22px] font-bold leading-none tabular-nums', numColor(checklist[1].days >= daysElapsed))}>{checklist[1].days}<span className={cn('text-sm sm:text-lg', numColorSoft(checklist[1].days >= daysElapsed))}>/{daysElapsed}</span></span>
                  <span className="text-[10px] sm:text-xs text-slate-700">Doakan orang</span>
                </div>
                {doaReason && <p className="mt-0.5 text-[11px] text-rose-500">Alasan: {doaReason.reason}</p>}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className={cn('text-[18px] sm:text-[22px] font-bold leading-none tabular-nums', numColor(sedekahCount >= daysElapsed))}>{sedekahCount}<span className={cn('text-sm sm:text-lg', numColorSoft(sedekahCount >= daysElapsed))}>/{daysElapsed}</span></span>
                  <span className="text-[10px] sm:text-xs text-slate-700">Sedekah</span>
                </div>
                {sedekahReason && <p className="mt-0.5 text-[11px] text-rose-500">Alasan: {REASON_LABELS[sedekahReason.reason] ?? sedekahReason.reason}</p>}
              </div>
            </div>
          )}
        </RoutineCard>
        </div>

      </div>
    </section>
  )
}
