"use client"

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react'
import { format, isSameDay, subDays, addDays, subWeeks, addWeeks, subMonths, addMonths, addYears, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, startOfYear, endOfYear, addDays as addDaysFn } from 'date-fns'
import { id } from 'date-fns/locale'
import { usePathname } from 'next/navigation'
import { Flag, Calendar, Clock, Hourglass, Layers, type LucideIcon } from 'lucide-react'

type Period = 'monthly' | 'weekly' | 'daily' | 'yesterday' | 'yearly' | 'shot'

export type IbadahPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'shot'

// Group mode untuk board tugas tab Semua — state-nya dipakai bersama:
// Header merender toggle-nya (di samping kartu Proses), halaman semua memakai nilainya untuk grouping
export type GroupMode = 'prioritas' | 'tanggal' | 'durasi' | 'lambat' | 'badge'

export const GROUP_MODES: { value: GroupMode; label: string; icon: LucideIcon }[] = [
  { value: 'prioritas', label: 'Prioritas', icon: Flag },
  { value: 'tanggal', label: 'Tanggal', icon: Calendar },
  { value: 'durasi', label: 'Durasi', icon: Clock },
  { value: 'badge', label: 'Badge', icon: Layers },
  { value: 'lambat', label: 'Lambat', icon: Hourglass },
]

interface HeaderControls {
  title: string
  description?: string
  currentDate: Date
  period: Period
  setPeriod: (period: Period) => void
  selectYesterday: () => void
  navigate: (direction: 'prev' | 'next') => void
  goToToday: () => void
  onRefresh: () => void
  isLoading?: boolean
  isToday: boolean
  navigateToPeriodStart: () => void
  page: string
  setPage: (page: string) => void
  category: string
  subPage: string | null
  setSubPage: (subPage: string | null) => void
  tugasView: 'hari-ini' | 'semua' | 'bank-ide' | 'selesai'
  setTugasView: (view: 'hari-ini' | 'semua' | 'bank-ide' | 'selesai') => void
  groupMode: GroupMode
  setGroupMode: (mode: GroupMode) => void
  ibadahPeriod: IbadahPeriod
  ibadahDate: Date
  setIbadahPeriod: (period: IbadahPeriod) => void
  navigateIbadah: (direction: 'prev' | 'next') => void
}

const HeaderControlsContext = createContext<HeaderControls | null>(null)

// Map pathnames to categories
function getCategoryFromPath(pathname: string): string {
  if (pathname === '/overview') return 'overview'
  if (pathname.startsWith('/tugas')) return 'tugas'
  if (pathname.startsWith('/sholat') || pathname.startsWith('/quran') || pathname.startsWith('/doa') || pathname.startsWith('/syukur') || pathname.startsWith('/sedekah')) return 'ibadah'
  if (pathname.startsWith('/tidur') || pathname.startsWith('/minum-air')) return 'kesehatan'
  if (pathname.startsWith('/masalah') || pathname.startsWith('/pmo') || pathname.startsWith('/kesenangan') || pathname.startsWith('/mental-block')) return 'mental'
  if (pathname.startsWith('/saran-perbaikan')) return 'perbaikan'
  if (pathname.startsWith('/saran-perbaikan')) return 'perbaikan'
  if (pathname.startsWith('/goal')) return 'goal'
  if (pathname.startsWith('/swot')) return 'swot'
  if (pathname.startsWith('/arus-kas') || pathname.startsWith('/keranjang')) return 'keuangan'
  return 'overview'
}

// Get sub-page from pathname for specific categories
function getSubPageFromPath(pathname: string): string | null {
  if (pathname.startsWith('/tugas/hari-ini')) return 'hari-ini'
  if (pathname.startsWith('/tugas/semua')) return 'semua'
  if (pathname.startsWith('/tugas/bank-ide')) return 'bank-ide'
  if (pathname.startsWith('/tugas/selesai')) return 'selesai'
  if (pathname.startsWith('/sholat-sunnah')) return 'sholat-sunnah'
  if (pathname.startsWith('/sholat')) return 'sholat'
  if (pathname.startsWith('/quran')) return 'quran'
  if (pathname.startsWith('/doa')) return 'doa'
  if (pathname.startsWith('/syukur')) return 'syukur'
  if (pathname.startsWith('/sedekah')) return 'sedekah'
  if (pathname.startsWith('/tidur')) return 'tidur'
  if (pathname.startsWith('/minum-air')) return 'minum-air'
  if (pathname.startsWith('/masalah')) return 'masalah'
  if (pathname.startsWith('/mental-block')) return 'mental-block'
  if (pathname.startsWith('/pmo')) return 'pmo'
  if (pathname.startsWith('/kesenangan')) return 'kesenangan'
  if (pathname.startsWith('/saran-perbaikan')) return 'saran-perbaikan'
  if (pathname.startsWith('/arus-kas')) return 'arus-kas'
  if (pathname.startsWith('/keranjang')) return 'keranjang'
  if (pathname.startsWith('/goal')) return 'goal'
  if (pathname.startsWith('/swot')) return 'swot'
  return null
}

function getCategoryTitle(category: string, period: Period, subPage: string | null, tugasView?: 'hari-ini' | 'semua' | 'bank-ide' | 'selesai'): string {
  // Special handling for Tugas category - use internal view state
  if (category === 'tugas' && tugasView) {
    switch (tugasView) {
      case 'hari-ini': return 'Hari Ini'
      case 'semua': return 'Semua'
      case 'bank-ide': return 'Bank Ide'
      case 'selesai': return 'Tugas Selesai'
    }
  }

  // Sub-page specific titles
  if (category === 'ibadah' && subPage) {
    switch (subPage) {
      case 'sholat': return 'Sholat Wajib'
      case 'sholat-sunnah': return 'Sholat Sunnah'
      case 'quran': return 'Quran'
      case 'doa': return 'Doa'
      case 'syukur': return 'Syukur'
      case 'sedekah': return 'Sedekah'
    }
  }
  if (category === 'kesehatan' && subPage) {
    switch (subPage) {
      case 'tidur': return 'Tidur'
      case 'minum-air': return 'Minum Air'
    }
  }
  if (category === 'mental' && subPage) {
    switch (subPage) {
      case 'masalah': return 'Refleksi'
      case 'mental-block': return 'Mental Block'
      case 'pmo': return 'PMO'
    }
  }
  if (category === 'perbaikan' && subPage) {
    switch (subPage) {
      case 'kesenangan': return 'Kesenangan'
      case 'saran-perbaikan': return 'Masukan'
    }
  }
  if (category === 'goal') return 'Goal'
  if (category === 'keuangan' && subPage) {
    switch (subPage) {
      case 'arus-kas': return 'Arus Kas'
      case 'keranjang': return 'Belanja'
    }
  }

  // Category-level titles (fallback)
  switch (category) {
    case 'overview':
      switch (period) {
        case 'daily': return 'Overview Harian'
        case 'yesterday': return 'Overview Kemarin'
        case 'weekly': return 'Overview Mingguan'
        case 'shot': return 'Overview Shot'
        case 'monthly': return 'Overview Bulanan'
        case 'yearly': return 'Overview Tahunan'
      }
    case 'tugas': return 'Jadwal Tugas'
    case 'ibadah': return 'Ibadah'
    case 'kesehatan': return 'Kesehatan'
    case 'mental':
      if (subPage === 'kesenangan') return 'Playlist'
      return 'Kesehatan Mental'
    case 'perbaikan': return 'Perbaikan Diri'
    case 'keuangan': return 'Keuangan'
    case 'swot': return 'Analisis SWOT'
    default: return 'Daytrack'
  }
}

function getCategoryDescription(category: string, period: Period, subPage: string | null, tugasView?: 'hari-ini' | 'semua' | 'bank-ide' | 'selesai'): string {
  // Special handling for Tugas category - use internal view state
  if (category === 'tugas' && tugasView) {
    switch (tugasView) {
      case 'hari-ini': return 'Kelola tugas-tugas hari ini'
      case 'semua': return 'Kelola seluruh daftar tugas Anda'
      case 'bank-ide': return 'Kumpulan ide yang belum matang — jadikan tugas bila sudah siap.'
      case 'selesai': return 'Tugas yang sudah kamu selesaikan akan muncul di sini.'
    }
  }

  // Sub-page specific descriptions
  if (category === 'ibadah' && subPage) {
    switch (subPage) {
      case 'sholat': return 'Catat dan pantau sholat wajib harian Anda'
      case 'sholat-sunnah': return 'Catat dan pantau sholat sunnah (Dhuha & Tahajud)'
      case 'quran': return 'Baca dan catat progres Quran'
      case 'doa': return 'Hafalkan dan catat doa harian'
      case 'syukur': return 'Catat rasa syukur hari ini'
      case 'sedekah': return 'Catat sedekah harian Anda'
    }
  }
  if (category === 'kesehatan' && subPage) {
    switch (subPage) {
      case 'tidur': return 'Pantau pola tidur Anda'
      case 'minum-air': return 'Catat konsumsi air minum harian'
    }
  }
  if (category === 'mental' && subPage) {
    switch (subPage) {
      case 'masalah': return 'Catat tantangan dan solusi'
      case 'mental-block': return 'Catat mental block yang menghambatmu'
      case 'pmo': return 'Pantau progres PMO'
    }
  }
  if (category === 'perbaikan' && subPage) {
    switch (subPage) {
      case 'kesenangan': return 'Catat momen bahagia hari ini'
      case 'saran-perbaikan': return 'Sampaikan masukan untuk Daytrack'
    }
  }
  if (category === 'goal') return 'Target barang belanjaan & kebiasaan harian'
  if (category === 'keuangan' && subPage) {
    switch (subPage) {
      case 'arus-kas': return 'Catat pemasukan dan pengeluaran harian Anda'
      case 'keranjang': return 'Catat rencana belanja Anda'
    }
  }

  // Category-level descriptions (fallback)
  switch (category) {
    case 'overview':
      switch (period) {
        case 'daily': return 'Ringkasan aktivitas harian Anda'
        case 'yesterday': return 'Ringkasan aktivitas kemarin'
        case 'weekly': return 'Ringkasan aktivitas mingguan Anda'
        case 'shot': return 'Ringkasan aktivitas Minggu\u2013Sabtu Anda'
        case 'monthly': return 'Ringkasan aktivitas bulanan Anda'
        case 'yearly': return 'Ringkasan aktivitas tahunan Anda'
      }
    case 'tugas': return 'Kelola dan lacak tugas harian Anda'
    case 'ibadah': return 'Kelola dan pantau aktivitas ibadah harian Anda'
    case 'kesehatan': return 'Pantau dan bangun kebiasaan sehat Anda'
    case 'mental': return 'Kelola kondisi mental dan perkembangan diri Anda'
    case 'perbaikan': return 'Evaluasi dan tingkatkan diri'
    case 'keuangan': return 'Kelola keuangan Anda'
    default: return 'Kelola dan lacak aktivitas Anda'
  }
}

export function HeaderControlsProvider({
  children,
  title = 'Daytrack',
  description,
  initialDate,
  initialPeriod = 'daily',
  initialPage = 'overview',
  onRefresh,
  isLoading = false,
}: {
  children: ReactNode
  title?: string
  description?: string
  initialDate?: Date
  initialPeriod?: Period
  initialPage?: string
  onRefresh?: () => void
  isLoading?: boolean
}) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [page, setPage] = useState(initialPage)
  const pathname = usePathname()
  const [category, setCategory] = useState('overview')
  const [subPage, setSubPage] = useState<string | null>(null)
  const [tugasView, setTugasView] = useState<'hari-ini' | 'semua' | 'bank-ide' | 'selesai'>('hari-ini')
  // Group mode board tugas tab Semua (prioritas/tanggal/durasi)
  const [groupMode, setGroupMode] = useState<GroupMode>('prioritas')

  // Update category and sub-page when pathname changes
  useEffect(() => {
    if (pathname) {
      setCategory(getCategoryFromPath(pathname))
      const sp = getSubPageFromPath(pathname)
      setSubPage(sp)
      // Sync tugasView from URL so header title/description matches the active tab
      if (sp === 'semua') setTugasView('semua')
      else if (sp === 'hari-ini') setTugasView('hari-ini')
      else if (sp === 'bank-ide') setTugasView('bank-ide')
      else if (sp === 'selesai') setTugasView('selesai')
    }
  }, [pathname])

  const isToday = isSameDay(currentDate, new Date())

  // Revisi batch 12: opsi "Kemarin" — tampilan harian dengan tanggal kemarin
  const selectYesterday = useCallback(() => {
    setCurrentDate(subDays(new Date(), 1))
    setPeriod('yesterday')
  }, [])

  const navigate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const amount = direction === 'prev' ? -1 : 1
      switch (period) {
        case 'monthly':
          return addMonths(prev, amount)
        case 'weekly':
          return addWeeks(prev, amount)
        case 'shot':
          return addWeeks(prev, amount)
        case 'yearly':
          return amount === -1 ? subYears(prev, 1) : addYears(prev, 1)
        case 'daily':
        case 'yesterday':
        default:
          return addDays(prev, amount)
      }
    })
  }, [period])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const navigateToPeriodStart = useCallback(() => {
    setCurrentDate(prev => {
      switch (period) {
        case 'monthly':
          return startOfMonth(prev)
        case 'weekly':
          return startOfWeek(prev, { weekStartsOn: 1 })
        case 'shot':
          return startOfWeek(prev, { weekStartsOn: 0 })
        case 'daily':
        default:
          return prev
      }
    })
  }, [period])

  // Rev 10: state periode & tanggal untuk tab Sholat/Quran — toolbar dirender di header
  const [ibadahPeriod, setIbadahPeriodState] = useState<IbadahPeriod>('weekly')
  const [ibadahDate, setIbadahDate] = useState<Date>(new Date())

  const setIbadahPeriod = useCallback((p: IbadahPeriod) => {
    setIbadahPeriodState(p)
    setIbadahDate(new Date()) // reset ke periode saat ini
  }, [])

  const navigateIbadah = useCallback((direction: 'prev' | 'next') => {
    setIbadahDate(prev => {
      switch (ibadahPeriod) {
        case 'daily':
          return addDays(prev, direction === 'prev' ? -1 : 1)
        case 'weekly':
        case 'shot':
          return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1)
        case 'monthly':
          return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
        case 'yearly':
          return direction === 'prev' ? subYears(prev, 1) : addYears(prev, 1)
      }
    })
  }, [ibadahPeriod])

  const dynamicTitle = getCategoryTitle(category, period, subPage, tugasView)
  const dynamicDescription = getCategoryDescription(category, period, subPage, tugasView)

  const value = useMemo(() => ({
    title: dynamicTitle,
    description: dynamicDescription,
    currentDate,
    period,
    setPeriod,
    selectYesterday,
    page,
    setPage,
    navigate,
    goToToday,
    onRefresh: onRefresh || (() => window.location.reload()),
    isLoading,
    isToday,
    navigateToPeriodStart,
    category,
    subPage,
    setSubPage,
    tugasView,
    setTugasView,
    groupMode,
    setGroupMode,
    ibadahPeriod,
    ibadahDate,
    setIbadahPeriod,
    navigateIbadah,
  }), [dynamicTitle, dynamicDescription, currentDate, period, setPeriod, selectYesterday, page, setPage, navigate, goToToday, onRefresh, isLoading, isToday, navigateToPeriodStart, category, subPage, setSubPage, tugasView, setTugasView, groupMode, ibadahPeriod, ibadahDate, setIbadahPeriod, navigateIbadah])

  return (
    <HeaderControlsContext.Provider value={value}>
      {children}
    </HeaderControlsContext.Provider>
  )
}

export function useHeaderControls(): HeaderControls {
  const context = useContext(HeaderControlsContext)
  if (!context) {
    throw new Error('useHeaderControls must be used within a HeaderControlsProvider')
  }
  return context
}

// Helper to format date in Indonesian
export function formatIndonesianDate(date: Date) {
  return format(date, 'EEEE, d MMMM yyyy', { locale: id })
}

export function useIsToday(date: Date) {
  return isSameDay(date, new Date())
}

// Shot: rentang Minggu–Sabtu (7 hari). Kalau hari ini Minggu, mundur 1 minggu
// supaya pagi Minggu menampilkan minggu yang baru lewat (bisa di-review).
export function getShotRange(date: Date): [Date, Date] {
  const base = startOfWeek(date, { weekStartsOn: 0 })
  const shift = date.getDay() === 0 ? -7 : 0
  const start = addDays(base, shift)
  return [start, addDays(start, 6)]
}

// Format date based on period
export function formatDateForPeriod(date: Date, period: Period) {
  switch (period) {
    case 'monthly':
      return format(date, 'MMMM yyyy', { locale: id })
    case 'weekly':
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
      return `${format(weekStart, 'd MMM', { locale: id })} - ${format(weekEnd, 'd MMM yyyy', { locale: id })}`
    case 'shot': {
      const [shotStart, shotEnd] = getShotRange(date)
      return `${format(shotStart, 'd MMM', { locale: id })} - ${format(shotEnd, 'd MMM yyyy', { locale: id })}`
    }
    case 'yearly':
      return format(date, 'yyyy', { locale: id })
    case 'daily':
    case 'yesterday':
    default:
      return formatIndonesianDate(date)
  }
}

// Hitung rentang (start,end) untuk periode ibadah/table berdasarkan anchorDate.
// shot = Minggu–Sabtu (7 hari), sama seperti overview.
export function getIbadahRange(period: IbadahPeriod, anchorDate: Date): { start: Date; end: Date } {
  let start: Date
  let end: Date
  if (period === 'daily') {
    start = startOfDay(anchorDate)
    end = anchorDate
  } else if (period === 'weekly') {
    start = startOfWeek(anchorDate, { weekStartsOn: 1 })
    end = endOfWeek(anchorDate, { weekStartsOn: 1 })
  } else if (period === 'shot') {
    const [s, e] = getShotRange(anchorDate)
    start = s
    end = e
  } else if (period === 'monthly') {
    start = startOfMonth(anchorDate)
    end = endOfMonth(anchorDate)
  } else {
    start = startOfYear(anchorDate)
    end = endOfYear(anchorDate)
  }
  return { start, end }
}

// Rev 10: format label periode untuk tab Sholat/Quran (toolbar di header)
export function formatIbadahPeriodLabel(date: Date, period: IbadahPeriod) {
  switch (period) {
    case 'daily':
      return format(date, 'EEEE, d MMMM yyyy', { locale: id })
    case 'weekly':
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
      return `${format(weekStart, 'd MMM', { locale: id })} - ${format(weekEnd, 'd MMM yyyy', { locale: id })}`
    case 'monthly':
      return format(date, 'MMMM yyyy', { locale: id })
    case 'yearly':
    default:
      return format(date, 'yyyy', { locale: id })
  }
}

// Label rentang untuk periode ibadah (termasuk shot).
export function formatIbadahShotLabel(period: IbadahPeriod, anchorDate: Date): string {
  if (period === 'shot') {
    const [s, e] = getShotRange(anchorDate)
    return `${format(s, 'd MMM', { locale: id })} – ${format(e, 'd MMM yyyy', { locale: id })}`
  }
  return formatIbadahPeriodLabel(anchorDate, period)
}