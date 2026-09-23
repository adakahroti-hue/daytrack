"use client"
import { useCallback, useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((callback: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener('change', callback)
    return () => media.removeEventListener('change', callback)
  }, [query])

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  // SSR: selalu false; client: baca matchMedia langsung — tanpa setState di effect
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1023px)')
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
