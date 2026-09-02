"use client"

import { useEffect, useState } from "react"
import { Bell, X } from "lucide-react"
import { usePengingat } from "@/hooks/usePengingat"
import type { Pengingat } from "@/app/actions/pengingat"

function nowHHMM(): string {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, "0")
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function PengingatNotif() {
  const { data: items = [] } = usePengingat()
  const [due, setDue] = useState<Pengingat[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const check = () => {
      const tgl = todayStr()
      const jam = nowHHMM()
      const matched = items.filter(
        (p) => p.tanggal === tgl && p.jam === jam && !dismissed.has(p.id)
      )
      setDue(matched)
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [items, dismissed])

  if (due.length === 0) return null

  return (
    <div className="space-y-2">
      {due.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="h-5 w-5 shrink-0 text-slate-900" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{p.nama}</p>
              <p className="text-xs text-slate-500">
                Pengingat — {p.tanggal} ⏰ {p.jam}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed((prev) => new Set(prev).add(p.id))}
            aria-label="Tutup notifikasi"
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
