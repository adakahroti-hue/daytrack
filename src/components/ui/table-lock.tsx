"use client"

import { useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useMediaQuery'

// Revisi mobile (batch 8) — fitur lock/unlock tabel, khusus tampilan mobile (portrait & landscape).
// Mencegah tap tak sengaja mengubah isi tabel. Default di mobile: TERKUNCI.
// - effectiveLocked: true bila di mobile dan sedang terkunci → dipasang ke <tbody>
//   sebagai pointer-events-none (scroll tabel tetap jalan, tap sel tidak berefek)
// - lockControl: tombol toggle yang hanya dirender di mobile (< lg)
export function useTableLock() {
  const isMobile = useIsMobile()
  const [locked, setLocked] = useState(true)
  const effectiveLocked = isMobile && locked

  const lockControl = isMobile ? (
    <div className="flex items-center justify-end mb-2">
      <button
        type="button"
        onClick={() => setLocked(v => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
          locked
            ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
        )}
        aria-label={locked ? 'Buka kunci tabel untuk mengedit' : 'Kunci tabel'}
      >
        {locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
        {locked ? 'Buka Kunci Tabel' : 'Kunci Tabel'}
      </button>
    </div>
  ) : null

  return { effectiveLocked, lockControl }
}
