"use client"
import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

/**
 * True setelah komponen ter-mount di client (pola hydration-safe).
 * Pengganti `useState(false)` + `useEffect(() => setMounted(true), [])`
 * yang memicu error react-hooks/set-state-in-effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)
}
