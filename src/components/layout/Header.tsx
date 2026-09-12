'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Menu, X, Plus, RefreshCw, Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, CalendarDays, CalendarRange, CheckCircle2, Trophy, LayoutDashboard, BookOpen, BookMarked, Mosque, Heart, Moon, GlassWater, Shield, Smile, Lightbulb, Sparkles, Target, History, Brain, Flame, ListMusic, StickyNote, ScanSearch, Timer } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useHeaderControls, formatDateForPeriod, formatIndonesianDate, formatIbadahShotLabel, GROUP_MODES } from './HeaderControls'
import { useTasks } from '@/hooks/useTasks'
import { useOverdueCount } from '@/hooks/useOverdueCount'
import { usePmoLogRange } from '@/hooks/usePmoLogs'
import { getEstimasiText } from '@/lib/utils'

interface HeaderProps {
  onMenuClick: () => void
}

// Inline stats for Hari Ini tab - shown next to date navigation
function HariIniHeaderStats() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayTasks = [] } = useTasks(today)

  const totalEstimatedMinutes = todayTasks
    .filter((t: any) => t.status !== 'selesai')
    .reduce((sum: number, t: any) => sum + t.estimasi_menit, 0)

  return (
    <div className="hidden md:flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
        <Clock className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs font-semibold text-slate-700">{getEstimasiText(totalEstimatedMinutes)}</span>
      </div>
    </div>
  )
}

// Rev 4: kalimat misi yang dipasang di CENTER header tab Hari Ini
function HariIniMissionSentence() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayTasks = [] } = useTasks(today)

  const completedMissions = todayTasks.filter((t: any) => t.status === 'selesai').length
  const remainingMissions = todayTasks.filter((t: any) => t.status === 'belum' || t.status === 'proses').length

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
      <span className="text-sm font-medium text-green-800 whitespace-nowrap">
        {completedMissions === 0
          ? 'Selesaikan 1 misi ini secepat yang kamu bisa'
          : `${completedMissions} misi penting selesai, tinggal ${remainingMissions} misi lagi.`}
      </span>
    </div>
  )
}

// Inline stats for Semua tab - Total (excluding completed), Terlambat, Proses
import { isBefore, startOfDay } from 'date-fns'
// Revisi batch 19: jumlah tugas terlambat — tampil di belakang teks filter Lambat
// Diperbarui: pakai RPC get_overdue_count (akurat dari DB, tidak bergantung limit/cache useTasks)
function SemuaOverdueCount() {
  const { data: overdue = 0 } = useOverdueCount()
  if (overdue === 0) return null
  return (
    <span className="ml-1 rounded-full bg-red-500 text-white text-[9px] leading-none px-1 py-0.5 font-bold">
      {overdue}
    </span>
  )
}


// Inline stats for Selesai tab - Total Selesai & Total Waktu
function SelesaiHeaderStats() {
  const { data: allTasks = [] } = useTasks()
  
  const totalSelesai = allTasks.filter((t: any) => t.status === 'selesai').length
  const totalEstimatedMinutes = allTasks
    .filter((t: any) => t.status === 'selesai')
    .reduce((sum: number, t: any) => sum + t.estimasi_menit, 0)

  return (
    <div className="hidden md:flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs font-semibold text-green-700">{totalSelesai}</span>
        <span className="text-[10px] text-green-600/70">Selesai</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
        <Clock className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs font-semibold text-slate-700">{getEstimasiText(totalEstimatedMinutes)}</span>
      </div>
    </div>
  )
}

// Ikon per tab — mengikuti icon sidebar (revisi 7). PMO memakai Shield (revisi batch 27)
const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/overview': LayoutDashboard,
  '/tugas/hari-ini': Clock,
  '/tugas/semua': CalendarDays,
  '/tugas/bank-ide': Lightbulb,
  '/tugas/selesai': CheckCircle2,
  '/sholat': Mosque,
  '/quran': BookOpen,
  '/doa': Heart,
  '/syukur': Sparkles,
  '/tidur': Moon,
  '/minum-air': GlassWater,
  '/masalah': Shield,
  '/mental-block': Brain,
  '/pmo': Shield,
  '/kesenangan': Smile,
  '/goal': Target,
}

// Revisi batch 19: rekor terbaik PMO — dipindah dari halaman ke header, di kiri navigasi tanggal
function PmoHeaderStats() {
  const { data: allLogs = [] } = usePmoLogRange('2000-01-01', format(new Date(), 'yyyy-MM-dd'))
  const bestStreak = useMemo(() => {
    const sorted = [...(allLogs as any[])].sort((a: any, b: any) => a.tanggal.localeCompare(b.tanggal))
    let cur = 0
    let best = 0
    for (const e of sorted) {
      if (e.status === 'berhasil') {
        cur += 1
        if (cur > best) best = cur
      } else if (e.status === 'relapse') {
        cur = 0
      }
    }
    return best
  }, [allLogs])
  return (
    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg shrink-0">
      <Trophy className="h-3.5 w-3.5 text-amber-600" />
      <span className="text-xs font-semibold text-slate-700">{bestStreak}</span>
      <span className="text-[10px] text-slate-500/70">Rekor</span>
    </div>
  )
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const {
    title,
    description,
    currentDate,
    period,
    navigate,
    goToToday,
    setPeriod,
    selectYesterday,
    isToday,
    ibadahPeriod,
    ibadahDate,
    setIbadahPeriod,
    navigateIbadah,
    groupMode,
    setGroupMode,
    arusKasShowAll,
    setArusKasShowAll,
    category,
    waktuPeriod,
    setWaktuPeriod,
    waktuDate,
    navigateWaktu,
    goToWaktuToday,
    alquranMode,
    setAlquranMode,
    headerAddAction,
    headerSelectAction,
    headerSelectDisabled,
    headerSelectActive,
  } = useHeaderControls()

  // Show period toggle only on Overview page
  const isOverviewPage = pathname === '/overview'
  // Show stats only on Hari Ini and Semua tabs
  const isHariIni = pathname === '/tugas/hari-ini'
  const isSemua = pathname === '/tugas/semua'
  const isSelesai = pathname === '/tugas/selesai'
  const isSholat = pathname === '/sholat' || pathname === '/sholat-sunnah'
  const isQuran = pathname === '/quran'
  const isMinumAir = pathname === '/minum-air'
  const isDoa = pathname === '/doa'
  const isSyukur = pathname === '/syukur'
  const isSedekah = pathname === '/sedekah'
  const isTidur = pathname === '/tidur'
  const isMakan = pathname === '/makan'
  const isPmo = pathname === '/pmo'
  const isMasalah = pathname === '/masalah'
  const isKesenangan = pathname === '/kesenangan'
  const isMentalBlock = pathname === '/mental-block'
  const isMaafkan = pathname === '/maafkan'
  // Tab keuangan (Arus Kas & Keranjang) ikut pakai toolbar navigasi tanggal + toggle periode ibadah-style di header
  const isArusKas = pathname === '/arus-kas'
  const isKeranjang = pathname === '/keranjang'
  const isGoal = pathname === '/goal'
  const isKeuangan = isArusKas || isKeranjang

  // Halaman yang menampilkan shortcut tab eksternal di header
  const isWaktu = pathname.startsWith('/jejak-waktu')
  const isBankIde = pathname === '/tugas/bank-ide'
  const isCatatan = pathname === '/catatan'
  const isSwot = pathname.startsWith('/swot')
  const isAlquran = pathname === '/alquran'
  const showShortcuts =
    isOverviewPage ||
    isHariIni ||
    isSemua ||
    isSelesai ||
    isGoal ||
    isWaktu ||
    isBankIde ||
    isCatatan ||
    isSwot ||
    isAlquran ||
    isKesenangan ||
    isMentalBlock ||
    isMaafkan ||
    isMasalah ||
    isSholat ||
    isQuran ||
    isMinumAir ||
    isDoa ||
    isSyukur ||
    isSedekah ||
    isPmo ||
    isTidur ||
    isMakan ||
    isKeuangan
  // Semua tab bergaya tabel Quran memakai toolbar navigasi tanggal + toggle periode di header.
  // Journal-type tabs sengaja TIDAK masuk isTableTab: data di-fetch semua (fetch all), tidak
  // terpengaruh filter waktu — termasuk Mental Block, Refleksi (masalah) & Playlist (kesenangan).
  const isTableTab = isSholat || isQuran || isMinumAir || isDoa || isSyukur || isTidur || isPmo || isSedekah || isKeuangan || isMakan
  // Revisi: tombol show/hide filter tanggal — toggle & navigasi tanggal mobile baru tampil setelah diklik
  const [showMobileControls, setShowMobileControls] = useState(false)

  const periodLabels = {
    yesterday: { label: 'Kemarin', icon: History },
    daily: { label: 'Harian', icon: Clock },
    shot: { label: 'Capture', icon: Flame },
    weekly: { label: 'Mingguan', icon: CalendarDays },
    monthly: { label: 'Bulanan', icon: CalendarRange },
    yearly: { label: 'Tahunan', icon: Calendar },
  }

  const ibadahPeriodOptions = [
    { value: 'daily', label: 'Harian' },
    { value: 'shot', label: 'Capture' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
    { value: 'yearly', label: 'Tahunan' },
  ] as const

  const handlePeriodChange = (key: 'yesterday' | 'daily' | 'shot' | 'weekly' | 'monthly' | 'yearly') => {
    if (key === 'yesterday') selectYesterday()
    else {
      // Revisi batch 14: klik Harian → tanggal navigasi kembali ke hari ini
      if (key === 'daily') goToToday()
      setPeriod(key)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex h-16 items-center gap-3 px-3 lg:px-4">
      {/* Mobile menu button — hamburger/X toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-10 w-10 flex-shrink-0"
        onClick={onMenuClick}
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5 text-primary" />
      </Button>

      {/* Shortcut tab eksternal — paling kiri (setelah hamburger, sebelum judul) */}
      {showShortcuts && (
        <div className="flex items-center gap-1 px-1.5 py-1 bg-muted/50 rounded-lg border border-border shrink-0">
          {!isWaktu && (
            <Link href="/jejak-waktu" title="Waktu" aria-label="Waktu" className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white/60 transition-colors">
              <Timer className="h-4 w-4" />
            </Link>
          )}
          {!isBankIde && (
            <Link href="/tugas/bank-ide" title="Bank Ide" aria-label="Bank Ide" className="p-1.5 rounded-md text-slate-500 hover:text-yellow-600 hover:bg-white/60 transition-colors">
              <Lightbulb className="h-4 w-4" />
            </Link>
          )}
          {!isKesenangan && (
            <Link href="/kesenangan" title="Playlist" aria-label="Playlist" className="p-1.5 rounded-md text-slate-500 hover:text-purple-600 hover:bg-white/60 transition-colors">
              <ListMusic className="h-4 w-4" />
            </Link>
          )}
          {!isCatatan && (
            <Link href="/catatan" title="Catatan" aria-label="Catatan" className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-white/60 transition-colors">
              <StickyNote className="h-4 w-4" />
            </Link>
          )}
          {!isSwot && (
            <Link href="/swot" title="SWOT" aria-label="SWOT" className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-white/60 transition-colors">
              <ScanSearch className="h-4 w-4" />
            </Link>
          )}
          {!isAlquran && (
            <Link href="/alquran" title="Alquran" aria-label="Alquran" className="p-1.5 rounded-md text-slate-500 hover:text-teal-600 hover:bg-white/60 transition-colors">
              <BookOpen className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {/* Page title & description — disembunyikan di tab yang punya header/konten sendiri */}
      {!(isOverviewPage || isGoal || isWaktu || isHariIni || isSemua || isSelesai || isKeuangan || isMasalah || isMentalBlock || isMaafkan || isSholat || isQuran || isDoa || isSyukur || isSedekah || isMinumAir || isPmo || isTidur || isMakan || isKesenangan || isBankIde || isCatatan || isSwot || isAlquran) && (
      <div className="flex-1 min-w-0">
        <h1 className="flex items-center gap-2 text-lg font-semibold truncate">
          {(() => {
            const Icon = NAV_ICONS[pathname] ?? LayoutDashboard
            return <Icon className="h-[18px] w-[18px] shrink-0 text-primary" />
          })()}
          <span className="truncate">{title}</span>
        </h1>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      )}

      {/* Center — kalimat misi Hari Ini (diposisikan di tengah header) */}
      {isHariIni && (
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="pointer-events-auto">
            <HariIniMissionSentence />
          </div>
        </div>
      )}

      {/* Right side controls — ml-auto agar selalu mentok ke ujung kanan (terutama saat judul disembunyikan) */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto scrollbar-none">
        {/* Hari Ini Stats — only on tugas/hari-ini */}
        {isHariIni && <HariIniHeaderStats />}

        {/* Revisi 1: toggle group (Prioritas/Tanggal/Durasi/Badge/Lambat) — di header */}
        {isSemua && (
          <div className="hidden md:flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-lg border border-border shrink-0">
            {GROUP_MODES.map((gm) => (
              <button
                key={gm.value}
                type="button"
                onClick={() => setGroupMode(gm.value)}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                  groupMode === gm.value
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white/60'
                )}
              >
                <gm.icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{gm.label}</span>
                {gm.value === 'lambat' && <SemuaOverdueCount />}
              </button>
            ))}
          </div>
        )}

        {/* Selesai Stats — only on tugas/selesai */}
        {isSelesai && <SelesaiHeaderStats />}

        {/* Revisi: tombol show/hide filter tanggal — kanan atas header (mobile saja) */}
        {(isOverviewPage || isTableTab) && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 flex-shrink-0"
            onClick={() => setShowMobileControls(v => !v)}
            aria-label={showMobileControls ? 'Sembunyikan filter tanggal' : 'Tampilkan filter tanggal'}
          >
            {showMobileControls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}

        {/* Navigasi tanggal tab Waktu — di header, desktop */}
        {isWaktu && (
          <div className="hidden sm:flex flex-1 items-center justify-start gap-2 min-w-0">
            <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateWaktu('prev')} aria-label="Periode sebelumnya">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium whitespace-nowrap">
                  {format(waktuDate, waktuPeriod === 'bulanan' ? 'MMMM yyyy' : waktuPeriod === 'tahunan' ? 'yyyy' : 'd MMM yyyy', { locale: id })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateWaktu('next')} aria-label="Periode selanjutnya">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Filter periode tab Waktu — dropdown di header (mobile, selalu tampil) */}
        {isWaktu && (
          <div className="sm:hidden flex items-center shrink-0">
            <select
              value={waktuPeriod}
              onChange={(e) => setWaktuPeriod(e.target.value as 'harian' | 'kemarin' | 'shot' | 'mingguan' | 'bulanan' | 'tahunan')}
              className="h-9 rounded-md border border-border bg-muted/50 px-2 text-sm text-slate-700 outline-none"
              aria-label="Filter periode waktu"
            >
              <option value="kemarin">Kemarin</option>
              <option value="harian">Harian</option>
              <option value="shot">Capture</option>
              <option value="mingguan">Mingguan</option>
              <option value="bulanan">Bulanan</option>
              <option value="tahunan">Tahunan</option>
            </select>
          </div>
        )}

        {/* Date Navigation — hidden on Hari Ini, Semua, Selesai, Sholat tabs; juga disembunyikan saat filter Kemarin (batch 25); rev mobile: disembunyikan di mobile (dobel dengan toolbar bawah header) */}
        {isOverviewPage && period !== 'yesterday' && (
        <div className="hidden sm:flex flex-1 items-center justify-start gap-2 min-w-0">
          {/* Desktop date navigation */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('prev')} aria-label="Periode sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium whitespace-nowrap">
                {formatDateForPeriod(currentDate, period)}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('next')} aria-label="Periode selanjutnya">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToToday} aria-label="Hari ini">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Mobile date display — hanya tampil setelah tombol show/hide ditekan */}
          {showMobileControls && (
          <div className="sm:hidden flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg border border-border">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {period === 'monthly'
                ? format(currentDate, 'MMM yyyy', { locale: id })
                : period === 'yearly'
                ? format(currentDate, 'yyyy', { locale: id })
                : formatDateForPeriod(currentDate, period)}
            </span>
          </div>
          )}
        </div>
        )}

        {/* Sholat, Quran & Minum Air toolbar — navigasi tanggal (kiri) + toggle group (kanan) di header */}
        {isTableTab && (
          <div className="flex items-center gap-1 sm:gap-2 max-md:portrait:hidden">
            {/* Revisi batch 19: rekor terbaik PMO di kiri navigasi tanggal (tab PMO) */}
            {isPmo && <PmoHeaderStats />}
            <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 bg-muted/50 rounded-lg border border-border">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateIbadah('prev')} aria-label="Periode sebelumnya">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium whitespace-nowrap hidden sm:inline">
                  {formatIbadahShotLabel(ibadahPeriod, ibadahDate)}
                </span>
                <span className="text-xs font-medium whitespace-nowrap sm:hidden">
                  {format(ibadahDate, 'd MMM yyyy', { locale: id })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateIbadah('next')} aria-label="Periode selanjutnya">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="hidden sm:inline-flex items-center gap-0.5 py-1 px-0.5 bg-muted/50 rounded-lg border border-border">
              {isArusKas && (
                <button
                  onClick={() => setArusKasShowAll(!arusKasShowAll)}
                  className={cn(
                    'px-2.5 h-8 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                    arusKasShowAll
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  )}
                >
                  Semua
                </button>
              )}
              {ibadahPeriodOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setIbadahPeriod(opt.value)}
                  className={cn(
                    'px-2.5 h-8 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                    ibadahPeriod === opt.value
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter periode tab Waktu — PALING KANAN */}
        {category === 'waktu' && (
          <div className="hidden sm:flex flex-shrink-0">
            <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border w-full justify-center">
              {([
                { key: 'kemarin', label: 'Kemarin', icon: History },
                { key: 'harian', label: 'Harian', icon: Clock },
                { key: 'shot', label: 'Capture', icon: Flame },
                { key: 'mingguan', label: 'Mingguan', icon: CalendarDays },
                { key: 'bulanan', label: 'Bulanan', icon: CalendarRange },
                { key: 'tahunan', label: 'Tahunan', icon: Calendar },
              ] as { key: 'harian' | 'kemarin' | 'shot' | 'mingguan' | 'bulanan' | 'tahunan'; label: string; icon: React.ComponentType<{ className?: string }> }[]).map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={waktuPeriod === key ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-2 gap-1 justify-center"
                  onClick={() => setWaktuPeriod(key)}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">{label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Catatan & Bank Ide — tombol Tambah pindah ke header kanan atas (rev mobile), warna cerah */}
        {(isCatatan || isBankIde) && (
          <Button
            onClick={() => headerAddAction?.()}
            className={cn(
              'flex-shrink-0 h-9 w-9 sm:h-8 sm:w-auto sm:px-3 sm:gap-1 rounded-lg text-white shadow-sm',
              isCatatan ? 'bg-slate-900 hover:bg-slate-800' : 'bg-amber-500 hover:bg-amber-600'
            )}
            aria-label={isCatatan ? 'Tambah Catatan' : 'Tambah Ide'}
          >
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline text-xs font-semibold'>{isCatatan ? 'Tambah Catatan' : 'Tambah Ide'}</span>
          </Button>
        )}

        {/* Goal — tombol Tambah Milestone di header kanan atas (rev mobile) */}
        {isGoal && (
          <Button
            onClick={() => headerAddAction?.()}
            className='flex-shrink-0 h-9 w-9 sm:h-8 sm:w-auto sm:px-3 sm:gap-1 rounded-lg text-white shadow-sm bg-slate-900 hover:bg-slate-800'
            aria-label='Tambah Milestone'
          >
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline text-xs font-semibold'>Tambah Milestone</span>
          </Button>
        )}

        {/* Refleksi — tombol Tambah Refleksi di header kanan atas (rev mobile) */}
        {isMasalah && (
          <Button
            onClick={() => headerAddAction?.()}
            className='flex-shrink-0 h-9 w-9 sm:h-8 sm:w-auto sm:px-3 sm:gap-1 rounded-lg text-white shadow-sm bg-slate-900 hover:bg-slate-800'
            aria-label='Tambah Refleksi'
          >
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline text-xs font-semibold'>Tambah Refleksi</span>
          </Button>
        )}

        {/* Maafkan — tombol Tambah Kejadian di header kanan atas (rev mobile) */}
        {isMaafkan && (
          <Button
            onClick={() => headerAddAction?.()}
            className='flex-shrink-0 h-9 w-9 sm:h-8 sm:w-auto sm:px-3 sm:gap-1 rounded-lg text-white shadow-sm bg-slate-900 hover:bg-slate-800'
            aria-label='Tambah Kejadian Maafkan'
          >
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline text-xs font-semibold'>Tambah</span>
          </Button>
        )}

        {/* Mental Block — tombol Tambah Mental Block di header kanan atas (rev mobile) */}
        {isMentalBlock && (
          <Button
            onClick={() => headerAddAction?.()}
            className='flex-shrink-0 h-9 w-9 sm:h-8 sm:w-auto sm:px-3 sm:gap-1 rounded-lg text-white shadow-sm bg-slate-900 hover:bg-slate-800'
            aria-label='Tambah Mental Block'
          >
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline text-xs font-semibold'>Tambah</span>
          </Button>
        )}

        {/* Playlist (Kesenangan) — tombol Tambah di header kanan atas (rev mobile) */}
        {isKesenangan && (
          <Button
            onClick={() => headerAddAction?.()}
            className='flex-shrink-0 h-9 w-9 sm:h-8 sm:w-auto sm:px-3 sm:gap-1 rounded-lg text-white shadow-sm bg-slate-900 hover:bg-slate-800'
            aria-label='Tambah Playlist'
          >
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline text-xs font-semibold'>Tambah</span>
          </Button>
        )}

        {/* Hari Ini — tombol Pilih Tugas di header kanan atas (rev mobile) */}
        {isHariIni && !headerSelectActive && (
          <Button
            variant="outline"
            onClick={() => headerSelectAction?.()}
            disabled={headerSelectDisabled}
            className='flex-shrink-0 h-9 sm:h-8 sm:px-3 rounded-lg text-xs font-semibold'
            aria-label='Pilih Tugas'
          >
            Pilih Tugas
          </Button>
        )}

        {/* Semua — tombol Tambah Tugas di header kanan atas (rev mobile) */}
        {isSemua && (
          <Button
            onClick={() => headerAddAction?.()}
            className='flex-shrink-0 h-9 w-9 sm:h-8 sm:w-auto sm:px-3 sm:gap-1 rounded-lg text-white shadow-sm bg-slate-900 hover:bg-slate-800'
            aria-label='Tambah Tugas'
          >
            <Plus className='h-4 w-4' />
            <span className='hidden sm:inline text-xs font-semibold'>Tambah Tugas</span>
          </Button>
        )}

        {/* Alquran: toggle Pilih Surah / Mode Mengaji — di header kanan (semua ukuran layar) */}
        {isAlquran && (
          <div className="flex flex-shrink-0">
            <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border">
              <Button
                variant={alquranMode === 'pilih' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-2 gap-1 justify-center"
                onClick={() => setAlquranMode('pilih')}
                aria-label="Pilih Surah"
              >
                <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Pilih Surah</span>
              </Button>
              <Button
                variant={alquranMode === 'mengaji' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-2 gap-1 justify-center"
                onClick={() => setAlquranMode('mengaji')}
                aria-label="Mode Mengaji"
              >
                <BookMarked className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Mode Mengaji</span>
              </Button>
            </div>
          </div>
        )}

        {/* Period Toggle Group — only on Overview page — PALING KANAN */}
        {isOverviewPage && (
          <div className="hidden sm:flex flex-shrink-0">
            <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border w-full justify-center">
              {Object.entries(periodLabels).map(([key, { label, icon: Icon }]) => (
                <Button
                  key={key}
                  variant={period === key ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-2 gap-1 justify-center"
                  onClick={() => handlePeriodChange(key as 'yesterday' | 'daily' | 'shot' | 'weekly' | 'monthly' | 'yearly')}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">{label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Revisi mobile (batch 8): toolbar dipindah ke bawah header, full width — khusus mobile portrait; desktop & landscape tidak berubah */}
      {(isSemua || isTableTab || isOverviewPage) && (
        <div className="hidden max-md:portrait:flex flex-col gap-2 px-3 pb-3">
          {/* Tab Overview: toggle periode 5 opsi (atas) + navigasi tanggal (bawah), full width — khusus mobile portrait */}
          {isOverviewPage && showMobileControls && (
            <>
              <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-lg border border-border w-full">
                {Object.entries(periodLabels).map(([key, { label }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePeriodChange(key as 'yesterday' | 'daily' | 'shot' | 'weekly' | 'monthly' | 'yearly')}
                    className={cn(
                      'flex-1 px-1 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap',
                      period === key
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {period !== 'yesterday' && (
              <div className="flex items-center justify-between gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border w-full">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('prev')} aria-label="Periode sebelumnya">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-medium truncate">
                    {formatDateForPeriod(currentDate, period)}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('next')} aria-label="Periode selanjutnya">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              )}
            </>
          )}
          {/* Tab Semua (rev 2): toggle group Prioritas/Tanggal/Durasi/Lambat */}
          {isSemua && (
            <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-lg border border-border w-full">
              {GROUP_MODES.map((gm) => (
                <button
                  key={gm.value}
                  type="button"
                  onClick={() => setGroupMode(gm.value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                    groupMode === gm.value
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white/60'
                  )}
                >
                  <gm.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{gm.label}</span>
                  {gm.value === 'lambat' && <SemuaOverdueCount />}
                </button>
              ))}
            </div>
          )}
          {/* Tab tabel (rev 3 & 4): card navigasi tanggal + toggle periode, masing-masing full width */}
          {isTableTab && showMobileControls && (
            <>
              {/* Revisi batch 10: toggle periode di ATAS, navigasi tanggal di BAWAH (khusus mobile) */}
              <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-lg border border-border w-full">
                {ibadahPeriodOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setIbadahPeriod(opt.value)}
                    className={cn(
                      'flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                      ibadahPeriod === opt.value
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border w-full">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigateIbadah('prev')} aria-label="Periode sebelumnya">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium truncate">
                    {formatIbadahShotLabel(ibadahPeriod, ibadahDate)}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigateIbadah('next')} aria-label="Periode selanjutnya">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          {/* Tab Waktu (mobile portrait): toggle periode 6 opsi serupa Overview, full width */}
          {category === 'waktu' && showMobileControls && (
            <div className="flex items-center gap-0.5 p-0.5 bg-muted/50 rounded-lg border border-border w-full">
              {([
                { key: 'kemarin', label: 'Kemarin' },
                { key: 'harian', label: 'Harian' },
                { key: 'shot', label: 'Capture' },
                { key: 'mingguan', label: 'Mingguan' },
                { key: 'bulanan', label: 'Bulanan' },
                { key: 'tahunan', label: 'Tahunan' },
              ] as { key: 'harian' | 'kemarin' | 'shot' | 'mingguan' | 'bulanan' | 'tahunan'; label: string }[]).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setWaktuPeriod(p.key)}
                  className={cn(
                    'flex-1 px-1 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap',
                    waktuPeriod === p.key
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          {/* Navigasi tanggal tab Waktu (mobile portrait) */}
          {category === 'waktu' && showMobileControls && (
            <div className="flex items-center justify-between gap-1 px-2 py-1 bg-muted/50 rounded-lg border border-border w-full">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigateWaktu('prev')} aria-label="Periode sebelumnya">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium truncate">
                  {format(waktuDate, waktuPeriod === 'bulanan' ? 'MMMM yyyy' : waktuPeriod === 'tahunan' ? 'yyyy' : 'd MMM yyyy', { locale: id })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigateWaktu('next')} aria-label="Periode selanjutnya">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
