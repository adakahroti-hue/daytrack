"use client"

import { useEffect, useMemo, useState } from "react"
import { Play, Square, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useJejakWaktu } from "@/hooks/useJejakWaktu"
import { cn } from "@/lib/utils"

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "-"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const j = Math.floor(m / 60)
    const sisa = m % 60
    if (sisa > 0) return `${j}j ${sisa}m`
    return `${j}j`
  }
  if (m > 0) return s > 0 ? `${m}m ${s}d` : `${m}m`
  return `${s}d`
}

export default function JejakWaktuPage() {
  const { data: items = [], isLoading, start, complete } = useJejakWaktu()
  const [name, setName] = useState("")
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)

  // Tick tiap detik untuk timer live (dihitung dari started_at, bukan counter)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const running = useMemo(() => items.find((i) => i.status === "running") || null, [items])
  const today = useMemo(() => items.filter((i) => i.status === "completed"), [items])

  const handleStart = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Nama kegiatan tidak boleh kosong.")
      return
    }
    setError(null)
    try {
      await start.mutateAsync({ name: trimmed })
      setName("")
    } catch (e: any) {
      setError(e?.message || "Gagal memulai aktivitas.")
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await complete.mutateAsync(id)
    } catch (e: any) {
      setError(e?.message || "Gagal menyelesaikan aktivitas.")
    }
  }

  const elapsed = running ? Date.now() - new Date(running.started_at).getTime() : 0

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Timer className="h-5 w-5 text-slate-700" /> Jejak Waktu
        </h1>
        <p className="text-sm text-slate-500">Lacak aktivitas yang sedang kamu lakukan</p>
      </div>

      {/* Panel timer */}
      <Card className="rounded-xl border-slate-200">
        <CardContent className="pt-4 pb-4 space-y-3">
          {!running ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="Nama kegiatan"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
              <Button onClick={handleStart} disabled={start.isPending} className="gap-1.5">
                <Play className="h-4 w-4" /> Mulai
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                Sedang berjalan
              </div>
              <p className="text-lg font-semibold text-slate-900">{running.name}</p>
              <p className="text-3xl font-bold tabular-nums text-slate-900">{formatElapsed(elapsed)}</p>
              <Button onClick={() => handleComplete(running.id)} disabled={complete.isPending} variant="default" className="gap-1.5">
                <Square className="h-4 w-4" /> Selesai
              </Button>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {/* Daftar Aktivitas Hari Ini */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">Aktivitas Hari Ini</h2>
        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Memuat…</div>
        ) : today.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Belum ada aktivitas hari ini.
          </div>
        ) : (
          <div className="space-y-2">
            {today.map((a) => (
              <div
                key={a.id}
                className={cn("flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3")}
              >
                <p className="font-medium text-slate-900 truncate">{a.name}</p>
                <div className="flex items-center gap-3 shrink-0 text-sm text-slate-600 tabular-nums">
                  <span>
                    {formatClock(a.started_at)} - {a.ended_at ? formatClock(a.ended_at) : "—"}
                  </span>
                  <span className="font-semibold text-slate-900">{formatDuration(a.duration_seconds)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
