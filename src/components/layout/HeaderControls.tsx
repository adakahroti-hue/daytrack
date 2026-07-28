"use client"

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react'
import { format, isSameDay, subDays, addDays, subWeeks, addWeeks, subMonths, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { id } from 'date-fns/locale'

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
}

const HeaderControlsContext = createContext<HeaderControls | null>(null)

export function HeaderControlsProvider({
  children,
  title = 'Daytrack',
  description,
  initialDate,
  initialPeriod = 'daily',
  onRefresh,
  isLoading = false,
}: {
  children: ReactNode
  title?: string
  description?: string
  initialDate?: Date
  initialPeriod?: Period
  onRefresh?: () => void
  isLoading?: boolean
}) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())
  const [period, setPeriod] = useState<Period>(initialPeriod)

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

  // For overview pages - navigate to start of current period
  const navigateToPeriodStart = useCallback(() => {
    setCurrentDate(prev => {
      switch (period) {
        case 'monthly':
          return startOfMonth(prev)
        case 'weekly':
          return startOfWeek(prev, { weekStartsOn: 1 }) // Monday start
        case 'daily':
        default:
          return prev
      }
    })
  }, [period])

  const value = useMemo(() => ({
    title,
    description,
    currentDate,
    period,
    setPeriod,
    navigate,
    goToToday,
    onRefresh: onRefresh || (() => window.location.reload()),
    isLoading,
    isToday,
    navigateToPeriodStart,
  }), [title, description, currentDate, period, setPeriod, navigate, goToToday, onRefresh, isLoading, isToday, navigateToPeriodStart])

  return (
    <HeaderControlsContext.Provider value={value}>
      {children}
    </HeaderControlsContext.Provider>
  )
}

export function useHeaderControls() {
  const context = useContext(HeaderControlsContext)
  if (!context) {
    return {
      title: 'Daytrack',
      description: undefined,
      currentDate: new Date(),
      period: 'daily' as Period,
      setPeriod: () => {},
      navigate: () => {},
      goToToday: () => {},
      onRefresh: () => {},
      isLoading: false,
      isToday: false,
      navigateToPeriodStart: () => {},
    }
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