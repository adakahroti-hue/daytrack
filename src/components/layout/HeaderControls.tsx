"use client"

import { createContext, useContext, useState, ReactNode } from 'react'
import { format, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'

interface HeaderControls {
  title: string
  description?: string
  currentDate: Date
  onNavigateDay: (direction: 'prev' | 'next') => void
  onGoToToday: () => void
  onRefresh: () => void
  isLoading?: boolean
}

const HeaderControlsContext = createContext<HeaderControls | null>(null)

export function HeaderControlsProvider({
  children,
  title,
  description,
  currentDate,
  onNavigateDay,
  onGoToToday,
  onRefresh,
  isLoading = false,
}: {
  children: ReactNode
} & HeaderControls) {
  return (
    <HeaderControlsContext.Provider
      value={{
        title,
        description,
        currentDate,
        onNavigateDay,
        onGoToToday,
        onRefresh,
        isLoading,
      }}
    >
      {children}
    </HeaderControlsContext.Provider>
  )
}

export function useHeaderControls() {
  const context = useContext(HeaderControlsContext)
  if (!context) {
    // Default values for pages that don't provide controls
    return {
      title: 'Daytrack',
      description: undefined,
      currentDate: new Date(),
      onNavigateDay: () => {},
      onGoToToday: () => {},
      onRefresh: () => {},
      isLoading: false,
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