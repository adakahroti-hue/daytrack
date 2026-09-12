'use client'

import Link from 'next/link'
import { Check, Minus, Mosque, BookOpen, GlassWater, Sparkles, Shield, Moon, ArrowRight, Wallet, HandCoins, Sun, PersonStanding } from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { cn, formatRupiah } from '@/lib/utils'
import { useOverviewData } from "@/hooks/useOverviewData"
import { PERIOD_LABEL, type OverviewPeriod } from './FocusTodaySection'
import { MaafkanSection } from './MaafkanSection'

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
  hideIcon,
  arrowLeft,
  children,
}: {
  tint: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  title: string
  href?: string
  linkColor?: string
  className?: string
  hideIcon?: boolean
  arrowLeft?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-xl border px-4 py-3 flex flex-col', tint, className)}>
      <div className="flex items-center gap-2">
        {/* Rev: arrowLeft — ikon panah di sebelah kiri teks nama section */}
        {arrowLeft && href && (
          <Link
            href={href}
            aria-label={`Buka ${title}`}
            className={cn('p-1.5 rounded-lg transition-colors hover:bg-slate-100 shrink-0', linkColor ?? 'text-slate-400')}
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <p className="text-sm font-medium text-slate-700 truncate">{title}</p>
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {!arrowLeft && href && (
            <Link
              href={href}
              aria-label={`Buka ${title}`}
              className={cn('p-1.5 rounded-lg transition-colors hover:bg-slate-100', linkColor ?? 'text-slate-400')}
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {!hideIcon && (
            <div className="p-1.5 rounded-lg bg-slate-100">
              <Icon className={cn('h-4 w-4', iconColor)} />
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── Donut x/y (ring berlubang) untuk SUB-bagian card Ibadah & Kesehatan ───
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
  const fontSize = Math.round(size * 0.28)
  const reached = value >= target && target > 0
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
          {reached ? (
            <Check className="text-slate-900 drop-shadow" style={{ width: Math.round(size * 0.42), height: Math.round(size * 0.42) }} strokeWidth={3} />
          ) : (
            <span className="font-bold tabular-nums text-slate-900" style={{ fontSize }}>
              {value}<span style={{ fontSize: Math.round(fontSize * 0.7) }} className="text-slate-400">/{target}</span>
            </span>
          )}
        </div>
      </div>
      {label && <span className="text-[10px] sm:text-xs text-slate-700 text-center leading-tight">{label}</span>}
    </div>
  )
}

// ─── Pie chart penuh (tanpa lubang) untuk diagram di sebelah kiri judul section ───
function XyPie({
  value,
  target,
  color,
  size = 60,
  label,
  percentLabel,
  percentOnSlice,
}: {
  value: number
  target: number
  color: string
  size?: number
  label?: string
  percentLabel?: boolean
  percentOnSlice?: boolean
}) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 1
  const frac = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0
  const segs =
    frac <= 0
      ? [{ d: fullCircle(cx, cy, r), color: 'rgba(148,163,184,0.35)' }]
      : frac >= 1
      ? [{ d: fullCircle(cx, cy, r), color }]
      : (() => {
          const a0 = -Math.PI / 2
          const a1 = -Math.PI / 2 + frac * 2 * Math.PI
          const x0 = cx + r * Math.cos(a0)
          const y0 = cy + r * Math.sin(a0)
          const x1 = cx + r * Math.cos(a1)
          const y1 = cy + r * Math.sin(a1)
          const largeArc = frac > 0.5 ? 1 : 0
          return [
            { d: `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`, color },
            { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc === 0 ? 1 : 0} 1 ${x0} ${y0} Z`, color: 'rgba(148,163,184,0.35)' },
          ]
        })()
  const fontSize = Math.round(size * 0.28)
  const pct = Math.round(frac * 100)
  // posisi label persen di centroid irisan warna (jika ada irisan warna)
  const midAngle = -Math.PI / 2 + (frac / 2) * 2 * Math.PI
  const lx = cx + r * 0.6 * Math.cos(midAngle)
  const ly = cy + r * 0.6 * Math.sin(midAngle)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segs.map((s, i) => (
            <path key={i} d={s.d} fill={s.color} className="transition-all duration-700 ease-out" />
          ))}
        </svg>
        {percentLabel && (
          frac >= 1 ? (
            /* 100% — tampilkan centang di tengah (latar putih agar kontras di atas pie hitam) */
            <div className="absolute inset-0 flex items-center justify-center leading-none pointer-events-none">
              <span className="flex items-center justify-center rounded-full bg-white" style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5) }}>
                <Check className="text-slate-900 drop-shadow" style={{ width: Math.round(size * 0.34), height: Math.round(size * 0.34) }} strokeWidth={3} />
              </span>
            </div>
          ) : percentOnSlice && frac > 0 ? (
            /* Persen HANYA di irisan berwarna (centroid); area abu-abu bersih */
            <div className="absolute inset-0 flex items-center justify-center leading-none pointer-events-none">
              <span className="font-bold tabular-nums" style={{
                fontSize: Math.max(6, Math.round(size * 0.11)),
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0,0,0,0.55)',
                transform: `translate(${(r * 0.55 * Math.cos(midAngle)).toFixed(1)}px, ${(r * 0.55 * Math.sin(midAngle)).toFixed(1)}px)`,
              }}>{pct}%</span>
            </div>
          ) : (
            frac > 0 ? (
              <div className="absolute inset-0 flex items-center justify-center leading-none pointer-events-none">
                <span className="font-bold tabular-nums" style={{ fontSize: Math.round(size * 0.2), color }}>{pct}%</span>
              </div>
            ) : null
          )
        )}
      </div>
      {label && <span className="text-[10px] sm:text-xs text-slate-700 text-center leading-tight">{label}</span>}
    </div>
  )
}

function fullCircle(cx: number, cy: number, r: number) {
  return `M ${cx} ${cy} m -${r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0 Z`
}

export function RoutineTodaySection({ startStr, endStr, metricEndStr, period }: { startStr: string; endStr: string; metricEndStr: string; period: OverviewPeriod }) {
  const isHarian = period === 'harian' || period === 'kemarin'
  const isKemarin = period === 'kemarin'
  // Shot = rentang Minggu–Sabtu (tampilan sama dengan mingguan, termasuk donut x/y)
  // Bulanan & tahunan juga pakai tampilan donut/angka x/y seperti capture (batch: seragam)
  const isWeekly = period === 'mingguan' || period === 'shot' || period === 'bulanan' || period === 'tahunan'

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const cappedEnd = endStr < todayStr ? endStr : todayStr
  const daysElapsed = Math.max(
    1,
    differenceInCalendarDays(new Date(cappedEnd + 'T00:00:00'), new Date(startStr + 'T00:00:00')) + 1
  )

  // 1 RPC menggantikan ~12 query paralel (sholat, quran, sunnah, air, syukur, doa, sedekah, pmo, tidur, arus kas, masalah)
  const { data: ov = {} as Record<string, any[]> } = useOverviewData(startStr, endStr)
  const numColor = (reached: boolean) =>
    reached ? 'text-emerald-600' : isKemarin ? 'text-slate-900' : 'text-slate-900'
  const numColorSoft = (reached: boolean) =>
    reached ? 'text-emerald-600/70' : isKemarin ? 'text-slate-900/70' : 'text-slate-500'

  // Sholat 5 waktu
  const prayerRows = (ov.prayer ?? []) as any[]
  const sholatPerWaktu = SHOLAT_5.map(s =>
    (prayerRows as any[]).filter(row => !!row?.[`sholat_${s.key}`]).length
  )


  // Baca Quran
  const quranEntries = (ov.quran ?? []) as any[]
  const quranRows = quranEntries as any[]
  const quranPerSesi = QURAN_SESSIONS.map(s =>
    quranRows.filter(e => e.waktu_baca === s.key && e.status === 'sudah').length
  )


  // Sholat Sunnah (Dhuha + Tahajud)
  const sunnahRows = (ov.sunnah ?? []) as any[]
  const sunnahPerWaktu = SUNNAH_TIMES.map(s =>
    (sunnahRows as any[]).filter(row => !!row?.[`sholat_${s.key}`]).length
  )


  // Minum Air
  const waterEntries = (ov.water ?? []) as any[]
  const totalMl = (waterEntries as any[]).reduce((sum, e) => sum + (e.jumlah_ml || 0), 0)
  const gelas = Math.round(totalMl / ML_PER_GELAS)

  const waterPerSesi = WATER_SESSIONS.map(s =>
    (waterEntries as any[]).filter(e => e.waktu_minum === s.key && e.status === 'sudah').length
  )

  // Checklist
  const syukurEntries = (ov.syukur ?? []) as any[]
  const doaEntries = (ov.doa ?? []) as any[]
  const sedekahEntries = (ov.sedekah ?? []) as any[]
  const sedekahCount = (sedekahEntries as any[]).filter(e => e.status === 'sudah').length
  const pmoEntries = (ov.pmo ?? []) as any[]
  const pmoAllEntries = (ov.pmo_all ?? []) as any[]
  const tidurEntries = (ov.tidur ?? []) as any[]
  // Tidur — data jam & durasi
  const tidurRows = tidurEntries as any[]
  const jamTidurList = tidurRows.map(e => e.jam_tidur).filter(Boolean).sort() as string[]
  const jamBangunList = tidurRows.map(e => e.jam_bangun).filter(Boolean).sort() as string[]
  const fmtJam = (v: string | null) => v ? v.slice(0, 5) : null
  const tidurPalingLambat = fmtJam(jamTidurList.length ? jamTidurList[jamTidurList.length - 1] : null)
  const bangunPalingLambat = fmtJam(jamBangunList.length ? jamBangunList[jamBangunList.length - 1] : null)
  // Durasi tidur per hari (untuk card Kesehatan → Tidur)
  const tidurDurasiList = tidurRows
    .map((e) => ({ tgl: e.tanggal, jam: typeof e.durasi_jam === 'number' ? e.durasi_jam : 0 }))
    .filter((d) => d.jam > 0)


  // Arus Kas — saldo & sisa alokasi kebutuhan (ALL-TIME, TIDAK dipengaruhi filter periode mana pun)
  const arusKasEntries = (ov.arus_kas ?? []) as any[]
  const arusKas = (arusKasEntries as any[]) || []
  const akMasuk = arusKas.filter(e => e.kategori === 'uang_masuk').reduce((s, e) => s + (e.nominal || 0), 0)
  const akKeluar = arusKas.filter(e => e.kategori === 'uang_keluar').reduce((s, e) => s + (e.nominal || 0), 0)
  const akSaldo = akMasuk - akKeluar
  const akPakaiKebutuhan = arusKas.filter(e => e.kategori === 'uang_keluar' && e.dompet === 'kebutuhan').reduce((s, e) => s + (e.nominal || 0), 0)
  const akKebutuhanSisa = Math.max(0, Math.round((akMasuk * 70) / 100) - akPakaiKebutuhan)
  const akPakaiSelfReward = arusKas.filter(e => e.kategori === 'uang_keluar' && e.dompet === 'self_reward').reduce((s, e) => s + (e.nominal || 0), 0)
  const akSelfRewardSisa = Math.max(0, Math.round((akMasuk * 10) / 100) - akPakaiSelfReward)
  const akPakaiTabung = arusKas.filter(e => e.kategori === 'uang_keluar' && e.dompet === 'tabung').reduce((s, e) => s + (e.nominal || 0), 0)
  const akTabungSisa = Math.max(0, Math.round((akMasuk * 10) / 100) - akPakaiTabung)
  const akPakaiSedekah = arusKas.filter(e => e.kategori === 'uang_keluar' && e.dompet === 'sedekah').reduce((s, e) => s + (e.nominal || 0), 0)
  const akSedekahSisa = Math.max(0, Math.round((akMasuk * 10) / 100) - akPakaiSedekah)
  const countDays = (entries: any[], match: (e: any) => boolean) =>
    new Set(entries.filter(match).map(e => e.tanggal)).size
  const checklist = [
    { label: 'Bersyukur', days: countDays(syukurEntries as any[], e => e.status === 'sudah') },
    { label: 'Mendoakan orang lain', days: countDays(doaEntries as any[], e => e.status === 'sudah') },
    { label: 'Bebas PMO', days: countDays(pmoEntries as any[], e => e.status === 'berhasil') },
    { label: 'Tidur tepat waktu', days: countDays(tidurEntries as any[], e => e.status === 'tepat') },
  ]
  // Posisi saat ini = streak berjalan (hari berhasil beruntun terakhir)
  const pmoCurrentStreak = (() => {
    const sorted = [...(pmoAllEntries as any[])].sort((a: any, b: any) => (a.tanggal || '').localeCompare(b.tanggal || ''))
    let cur = 0
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].status === 'berhasil') cur += 1
      else break
    }
    return cur
  })()
  // Skor Hoki akumulasi = Bersyukur + Doakan + Sedekah (untuk bar chart di card Hoki)
  const hokiParts = [
    { label: 'Bersyukur', v: checklist[0].days, c: '#fde047' },
    { label: 'Doakan', v: checklist[1].days, c: '#facc15' },
    { label: 'Sedekah', v: sedekahCount, c: '#eab308' },
  ]
  const hokiDone = hokiParts.reduce((a, b) => a + b.v, 0)
  const hokiMax = 3 * daysElapsed
  const hokiPct = hokiMax > 0 ? Math.round((hokiDone / hokiMax) * 100) : 0

  const label = PERIOD_LABEL[period]

  // Refleksi (journal) — 3 poin terbaru dari SELURUH data (sumber: tab Refleksi /masalah, tidak dibatasi periode)
  const refleksiEntries = (ov.masalah ?? []) as any[]
  const refleksiList = (refleksiEntries as any[])
    .filter(e => e.masalah)
    .sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0
      const db = b.created_at ? new Date(b.created_at).getTime() : 0
      return db - da
    })
    .map(e => ({ id: e.id, masalah: e.masalah as string }))

  return (
    <section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Keuangan — posisi tukar dengan Refleksi di desktop (rev desktop); order mengikuti grid */}
        <RoutineCard tint="bg-white border-slate-200" icon={Wallet} iconColor="text-emerald-500" title="Keuangan" href="/arus-kas" linkColor="text-emerald-500 hover:text-emerald-700" hideIcon arrowLeft className="order-5">
          {/* Mobile: grid 2×2 (Saldo+Pokok atas, Reward+Tabung bawah); Desktop: layout lama */}
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:flex sm:items-stretch sm:gap-4">
            {/* Saldo — kiri, besar */}
            <div className="sm:shrink-0 sm:pr-4 sm:border-r border-slate-100 flex flex-col justify-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Saldo</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums leading-none break-words">{formatRupiah(akSaldo)}</p>
            </div>
            {/* 4 nilai — mobile tersusun vertikal, desktop 1 baris */}
            <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-0 sm:flex-1 sm:min-w-0">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pokok</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums break-words">{formatRupiah(akKebutuhanSisa)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Reward</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums break-words">{formatRupiah(akSelfRewardSisa)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tabung</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums break-words">{formatRupiah(akTabungSisa)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sedekah</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums break-words">{formatRupiah(akSedekahSisa)}</p>
              </div>
            </div>
          </div>
        </RoutineCard>

        {/* Optimasi Hoki — dipindah ke sebaris Keuangan (posisi kanan baris 1) */}
        <RoutineCard tint="bg-white border-slate-200" icon={Sparkles} iconColor="text-purple-500" title="Hoki" hideIcon className="order-2">
          <div className="mt-3 px-2 sm:px-3 py-1 grid grid-cols-3 gap-2 sm:gap-3">
            {/* Bersyukur */}
            <div className="relative flex items-center gap-2 text-left">
              <XyPie value={checklist[0].days} target={daysElapsed} color="#111827" size={52} percentLabel percentOnSlice />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700">Bersyukur <span className="text-slate-900 tabular-nums">{checklist[0].days}/{daysElapsed}</span></p>
              </div>
              <Link href="/syukur" aria-label="Buka tab Syukur" className="absolute top-0 right-0 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {/* Doakan */}
            <div className="relative flex items-center gap-2 text-left border-l border-slate-100 pl-3 sm:pl-4">
              <XyPie value={checklist[1].days} target={daysElapsed} color="#111827" size={52} percentLabel percentOnSlice />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700">Doakan <span className="text-slate-900 tabular-nums">{checklist[1].days}/{daysElapsed}</span></p>
              </div>
              <Link href="/doa" aria-label="Buka tab Doa" className="absolute top-0 right-0 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {/* Sedekah */}
            <div className="relative flex items-center gap-2 text-left border-l border-slate-100 pl-3 sm:pl-4">
              <XyPie value={sedekahCount} target={daysElapsed} color="#111827" size={52} percentLabel percentOnSlice />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700">Sedekah <span className="text-slate-900 tabular-nums">{sedekahCount}/{daysElapsed}</span></p>
              </div>
              <Link href="/sedekah" aria-label="Buka tab Sedekah" className="absolute top-0 right-0 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          {/* Bar skor Hoki akumulasi (Bersyukur + Doakan + Sedekah) — balok nyambung tanpa jeda */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Skor Hoki</p>
              <span className="text-xs font-bold tabular-nums bg-yellow-200/70 text-yellow-900 rounded px-1.5 py-0.5">{hokiPct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-sm bg-slate-100">
              <div
                className="h-full rounded-sm bg-slate-900 transition-all duration-700 ease-out"
                style={{ width: `${hokiPct}%` }}
                title={`Skor Hoki: ${hokiDone}/${hokiMax} (${hokiPct}%)`}
              />
            </div>
          </div>
        </RoutineCard>

        {/* Refleksi — list semua (tak dipengaruhi filter) */}
        <RoutineCard tint="bg-white border-slate-200" icon={PersonStanding} iconColor="text-slate-700" title="Refleksi" href="/masalah" linkColor="text-slate-700 hover:text-slate-900" className="col-span-1 order-1" hideIcon>
            {refleksiList.length > 0 ? (
              <ul className="space-y-1.5 max-h-[7.5rem] overflow-y-auto pr-1">
                {refleksiList.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-sm text-slate-600 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-800 shrink-0" />
                    <span className="line-clamp-2 min-w-0">{r.masalah}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Belum ada refleksi pada periode ini.</p>
            )}
        </RoutineCard>


        {/* Maafkan — list semua (tak dipengaruhi filter), sebaris dengan Refleksi */}
        <MaafkanSection className="order-6" />

        {/* Ibadah — baris 2 (setelah Keuangan & Hoki) */}
        <RoutineCard tint="bg-white border-slate-200" icon={Mosque} iconColor="text-emerald-500" title="Ibadah" hideIcon className="order-3">
          <div className="mt-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 lg:flex-1">
                <div className="min-w-0">
                  {/* Rev: ikon panah di sebelah kiri teks nama section */}
                  <div className="flex items-center gap-1">
                    <Link href="/sholat" aria-label="Buka tab Sholat Wajib" className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      Sholat 5 Waktu
                    </p>
                  </div>

                </div>
              </div>
              <div className="grid grid-cols-5 gap-x-2 lg:gap-x-6 shrink-0 w-full lg:w-auto">
                {SHOLAT_5.map((s, i) => {
                  const done = isHarian ? sholatPerWaktu[i] > 0 : sholatPerWaktu[i] >= daysElapsed
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-0.5 min-w-0">
                      <span className="text-xs leading-tight text-slate-500">{s.label}</span>
                      {isWeekly ? (
                        <XyDonut value={sholatPerWaktu[i]} target={daysElapsed} color="#111827" size={40} />
                      ) : isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-slate-900" />
                          : <Minus className="h-3 w-3 text-slate-300" />
                      ) : (
                        <span className={cn('text-[11px] font-semibold tabular-nums', done ? 'text-slate-900' : 'text-slate-500')}>
                          {sholatPerWaktu[i]}/{daysElapsed}
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
              <div className="min-w-0 lg:flex-1">
                <div className="min-w-0">
                  {/* Rev: ikon panah di sebelah kiri teks nama section */}
                  <div className="flex items-center gap-1">
                    <Link href="/sholat-sunnah" aria-label="Buka tab Sholat Sunnah" className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      Sholat Sunnah
                    </p>
                  </div>

                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-2 lg:gap-x-6 shrink-0 w-full lg:w-auto">
                {SUNNAH_TIMES.map((s, i) => {
                  const done = isHarian ? sunnahPerWaktu[i] > 0 : sunnahPerWaktu[i] >= daysElapsed
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-0.5 min-w-0">
                      <span className="text-xs leading-tight text-slate-500">{s.label}</span>
                      {isWeekly ? (
                        <XyDonut value={sunnahPerWaktu[i]} target={daysElapsed} color="#111827" size={40} />
                      ) : isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-slate-900" />
                          : <Minus className="h-3 w-3 text-slate-300" />
                      ) : (
                        <span className={cn('text-[11px] font-semibold tabular-nums', done ? 'text-slate-900' : 'text-slate-500')}>
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
              <div className="min-w-0 lg:flex-1">
                <div className="min-w-0">
                  {/* Rev: ikon panah di sebelah kiri teks nama section */}
                  <div className="flex items-center gap-1">
                    <Link href="/quran" aria-label="Buka tab Quran" className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      Baca Quran
                    </p>
                  </div>

                </div>
              </div>
              <div className="grid grid-cols-5 gap-x-2 lg:gap-x-6 shrink-0 w-full lg:w-auto">
                {QURAN_SESSIONS.map((s, i) => {
                  const done = isHarian ? quranPerSesi[i] > 0 : quranPerSesi[i] >= daysElapsed
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-0.5 min-w-0">
                      <span className="text-xs leading-tight text-slate-500">{QURAN_PILL_LABELS[s.key] ?? s.label}</span>
                      {isWeekly ? (
                        <XyDonut value={quranPerSesi[i]} target={daysElapsed} color="#111827" size={40} />
                      ) : isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-slate-900" />
                          : <Minus className="h-3 w-3 text-slate-300" />
                      ) : (
                        <span className={cn('text-[11px] font-semibold tabular-nums', done ? 'text-slate-900' : 'text-slate-500')}>
                          {quranPerSesi[i]}/{daysElapsed}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </RoutineCard>

        {/* Kesehatan — dipindah ke paling bawah */}
        <RoutineCard tint="bg-white border-slate-200" icon={Shield} iconColor="text-sky-500" title="Habit" hideIcon className="order-4">
          <div className="mt-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 lg:flex-1">
                <div className="min-w-0">
                  {/* Rev: ikon panah di sebelah kiri teks nama section */}
                  <div className="flex items-center gap-1">
                    <Link href="/minum-air" aria-label="Buka tab Minum Air" className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      Minum Air
                    </p>
                  </div>

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
                        <XyDonut value={waterPerSesi[i]} target={daysElapsed} color="#111827" size={40} />
                      ) : isHarian ? (
                        done
                          ? <Check className="h-3 w-3 text-slate-900" />
                          : <Minus className="h-3 w-3 text-slate-300" />
                      ) : (
                        <span className={cn('text-[11px] font-semibold tabular-nums', done ? 'text-slate-900' : 'text-slate-500')}>
                          {waterPerSesi[i]}/{daysElapsed}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="mt-1.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex items-center gap-3">

                <div className="min-w-0">
                  {/* Rev: ikon panah di sebelah kiri teks nama section */}
                  <div className="flex items-center gap-1">
                    <Link href="/tidur" aria-label="Buka tab Tidur" className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      Tidur
                    </p>
                  </div>

                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm lg:justify-end">

                {tidurDurasiList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tidurDurasiList.slice(-7).map((d) => {
                      const hariNama = format(new Date(d.tgl + 'T00:00:00'), 'EEEE', { locale: id })
                      const hariShort = hariNama.slice(0, 3)
                      // Rev: ≥7 jam = hijau muda transparan, <7 jam = merah transparan
                      const isEnough = d.jam >= 7
                      return (
                        <span
                          key={d.tgl}
                          className={cn(
                            'flex flex-col items-center rounded-md px-2 py-1',
                            isEnough ? 'bg-green-100/70' : 'bg-red-100/70'
                          )}
                          title={`${hariNama} — ${d.jam} jam${isEnough ? ' (cukup)' : ' (kurang)'}`}
                        >
                          <span className={cn('text-[10px] font-medium leading-none', isEnough ? 'text-green-800' : 'text-red-800')}>{hariShort}</span>
                          <span className={cn('mt-0.5 text-xs font-semibold tabular-nums leading-none', isEnough ? 'text-green-900' : 'text-red-900')}>{d.jam}j</span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="mt-1.5 flex items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  {/* Rev: ikon panah di sebelah kiri teks; XyPie dihilangkan */}
                  <div className="flex items-center gap-1">
                    <Link href="/pmo" aria-label="Buka tab PMO" className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      Bebas PMO
                    </p>
                  </div>
                  {isWeekly ? (
                    <p className="mt-1 text-sm text-slate-500"><span className="font-semibold text-slate-900 tabular-nums">{checklist[2].days}/{daysElapsed}</span> berhasil</p>
                  ) : (
                    <p className="mt-1 flex items-baseline gap-1.5 leading-none">
                      <span className={cn('text-[22px] font-bold tabular-nums', numColor(checklist[2].days >= daysElapsed))}>{checklist[2].days}<span className={cn('text-lg', numColorSoft(checklist[2].days >= daysElapsed))}>/{daysElapsed}</span></span>
                      <span className="text-sm font-medium text-slate-500">berhasil</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Posisi Saat Ini</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums"><span className="bg-yellow-200/70 rounded px-1.5 py-0.5">{pmoCurrentStreak}</span> <span className="text-xs font-medium text-slate-500">hari</span></p>
              </div>
            </div>
          </div>
        </RoutineCard>

      </div>
    </section>
  )
}
