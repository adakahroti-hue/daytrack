"use client"

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react'
import { format, isSameDay, subDays, addDays, subWeeks, addWeeks, subMonths, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { id } from 'date-fns/locale'
import { usePathname } from 'next/navigation'

type Period = 'monthly' | 'weekly' | 'daily'

interface HeaderControls {
  title: string
  description?: string
  currentDate: Date
  period: Period
  setPeriod: (period: Period) => void
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
  tugasView: 'hari-ini' | 'semua'
  setTugasView: (view: 'hari-ini' | 'semua') => void
}

const HeaderControlsContext = createContext<HeaderControls | null>(null)

// Map pathnames to categories
function getCategoryFromPath(pathname: string): string {
  if (pathname === '/overview') return 'overview'
  if (pathname.startsWith('/tugas')) return 'tugas'
  if (pathname.startsWith('/sholat') || pathname.startsWith('/quran') || pathname.startsWith('/doa') || pathname.startsWith('/syukur')) return 'ibadah'
  if (pathname.startsWith('/tidur') || pathname.startsWith('/minum-air')) return 'kesehatan'
  if (pathname.startsWith('/masalah') || pathname.startsWith('/pmo')) return 'mental'
  if (pathname.startsWith('/kesenangan') || pathname.startsWith('/saran-perbaikan')) return 'perbaikan'
  return 'overview'
}

// Get sub-page from pathname for specific categories
function getSubPageFromPath(pathname: string): string | null {
  if (pathname.startsWith('/tugas/hari-ini')) return 'hari-ini'
  if (pathname.startsWith('/tugas/semua')) return 'semua'
  if (pathname.startsWith('/sholat')) return 'sholat'
  if (pathname.startsWith('/quran')) return 'quran'
  if (pathname.startsWith('/doa')) return 'doa'
  if (pathname.startsWith('/syukur')) return 'syukur'
  if (pathname.startsWith('/tidur')) return 'tidur'
  if (pathname.startsWith('/minum-air')) return 'minum-air'
  if (pathname.startsWith('/masalah')) return 'masalah'
  if (pathname.startsWith('/pmo')) return 'pmo'
  if (pathname.startsWith('/kesenangan')) return 'kesenangan'
  if (pathname.startsWith('/saran-perbaikan')) return 'saran-perbaikan'
  return null
}

function getCategoryTitle(category: string, period: Period, subPage: string | null, tugasView?: 'hari-ini' | 'semua'): string {
  // Special handling for Tugas category - use internal view state
  if (category === 'tugas' && tugasView) {
    switch (tugasView) {
      case 'hari-ini': return 'Hari Ini'
      case 'semua': return 'Semua Tugas'
    }
  }

  // Sub-page specific titles
  if (category === 'ibadah' && subPage) {
    switch (subPage) {
      case 'sholat': return 'Sholat'
      case 'quran': return 'Quran'
      case 'doa': return 'Doa'
      case 'syukur': return 'Syukur'
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
      case 'masalah': return 'Masalah'
      case 'pmo': return 'PMO'
    }
  }
  if (category === 'perbaikan' && subPage) {
    switch (subPage) {
      case 'kesenangan': return 'Kesenangan'
      case 'saran-perbaikan': return 'Saran Perbaikan'
    }
  }

  // Category-level titles (fallback)
  switch (category) {
    case 'overview':
      switch (period) {
        case 'daily': return 'Overview Harian'
        case 'weekly': return 'Overview Mingguan'
        case 'monthly': return 'Overview Bulanan'
      }
    case 'tugas': return 'Jadwal Tugas'
    case 'ibadah': return 'Ibadah'
    case 'kesehatan': return 'Kesehatan'
    case 'mental': return 'Kesehatan Mental'
    case 'perbaikan': return 'Perbaikan Diri'
    default: return 'Daytrack'
  }
}

function getCategoryDescription(category: string, period: Period, subPage: string | null, tugasView?: 'hari-ini' | 'semua'): string {
  // Special handling for Tugas category - use internal view state
  if (category === 'tugas' && tugasView) {
    switch (tugasView) {
      case 'hari-ini': return 'Kelola tugas-tugas hari ini'
      case 'semua': return 'Kelola seluruh daftar tugas Anda'
    }
  }

  // Sub-page specific descriptions
  if (category === 'ibadah' && subPage) {
    switch (subPage) {
      case 'sholat': return 'Catat dan pantau sholat harian Anda'
      case 'quran': return 'Baca dan catat progres Quran'
      case 'doa': return 'Hafalkan dan catat doa harian'
      case 'syukur': return 'Catat rasa syukur hari ini'
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
      case 'pmo': return 'Pantau progres PMO'
    }
  }
  if (category === 'perbaikan' && subPage) {
    switch (subPage) {
      case 'kesenangan': return 'Catat momen bahagia hari ini'
      case 'saran-perbaikan': return 'Catat saran perbaikan dan lacak progres'
    }
  }

  // Category-level descriptions (fallback)
  switch (category) {
    case 'overview':
      switch (period) {
        case 'daily': return 'Ringkasan aktivitas harian Anda'
        case 'weekly': return 'Ringkasan aktivitas mingguan Anda'
        case 'monthly': return 'Ringkasan aktivitas bulanan Anda'
      }
    case 'tugas': return 'Kelola dan lacak tugas harian Anda'
    case 'ibadah': return 'Kelola dan pantau aktivitas ibadah harian Anda'
    case 'kesehatan': return 'Pantau dan bangun kebiasaan sehat Anda'
    case 'mental': return 'Kelola kondisi mental dan perkembangan diri Anda'
    case 'perbaikan': return 'Evaluasi dan tingkatkan diri'
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
  const [tugasView, setTugasView] = useState<'hari-ini' | 'semua'>('hari-ini')

  // Update category and sub-page when pathname changes
  useEffect(() => {
    if (pathname) {
      setCategory(getCategoryFromPath(pathname))
      setSubPage(getSubPageFromPath(pathname))
    }
  }, [pathname])

  const isToday = isSameDay(currentDate, new Date())

  const navigate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const amount = direction === 'prev' ? -1 : 1
      switch (period) {
        case 'monthly':
          return addMonths(prev, amount)
        case 'weekly':
          return addWeeks(prev, amount)
        case 'daily':
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
        case 'daily':
        default:
          return prev
      }
    })
  }, [period])

  const dynamicTitle = getCategoryTitle(category, period, subPage, tugasView)
  const dynamicDescription = getCategoryDescription(category, period, subPage, tugasView)

  const value = useMemo(() => ({
    title: dynamicTitle,
    description: dynamicDescription,
    currentDate,
    period,
    setPeriod,
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
  }), [dynamicTitle, dynamicDescription, currentDate, period, setPeriod, page, setPage, navigate, goToToday, onRefresh, isLoading, isToday, navigateToPeriodStart, category, subPage, setSubPage, tugasView, setTugasView])

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

// Format date based on period
export function formatDateForPeriod(date: Date, period: Period) {
  switch (period) {
    case 'monthly':
      return format(date, 'MMMM yyyy', { locale: id })
    case 'weekly':
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
      return `${format(weekStart, 'd MMM', { locale: id })} - ${format(weekEnd, 'd MMM yyyy', { locale: id })}`
    case 'daily':
    default:
      return formatIndonesianDate(date)
  }
}