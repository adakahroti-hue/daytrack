"use client"

import { useEffect, useMemo, useState } from "react"
import { Play, Square, Timer, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useJejakWaktu } from "@/hooks/useJejakWaktu"
import { cn, BRAND_COLORS } from "@/lib/utils"

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
  const { data: items = [], isLoading, start, complete, remove, continue: continueMut } = useJejakWaktu()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Tick tiap detik untuk timer live (dihitung dari started_at, bukan counter)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const running = useMemo(() => items.find((i) => i.status === "running") || null, [items])
  const completed = useMemo(() => items.filter((i) => i.status === "completed"), [items])

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

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id)
    } catch (e: any) {
      setError(e?.message || "Gagal menghapus aktivitas.")
    }
  }

  const elapsed = running ? now - new Date(running.started_at).getTime() : 0

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
          <Timer className="h-6 w-6 text-slate-700" /> Jejak Waktu
        </h1>
        <p className="mt-1 text-sm text-slate-500">Lacak aktivitas yang sedang kamu lakukan.</p>
      </div>

      {/* INPUT AKTIVITAS */}
      <Card className="rounded-xl border border-slate-200 shadow-sm">
        <CardContent className="pt-5 pb-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Nama kegiatan
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              placeholder="Apa yang sedang kamu lakukan?"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 transition-colors"
            />
            <Button
              onClick={handleStart}
              disabled={start.isPending}
              className={cn("gap-1.5 sm:w-auto w-full", BRAND_COLORS.primary, BRAND_COLORS.primaryHover)}
            >
              <Play className="h-4 w-4" /> Mulai
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {/* CARD TIMER AKTIF */}
      {running && (
        <Card className="rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-sm">
          <CardContent className="pt-6 pb-6 flex flex-col items-center text-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium px-2.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Sedang berjalan
            </span>
            <p className="text-base font-semibold text-slate-900">{running.name}</p>
            <p className="text-5xl font-bold tabular-nums text-slate-900 tracking-tight">{formatElapsed(elapsed)}</p>
            <Button
              onClick={() => handleComplete(running.id)}
              disabled={complete.isPending}
              className={cn("gap-1.5", BRAND_COLORS.primary, BRAND_COLORS.primaryHover)}
            >
              <Square className="h-4 w-4" /> Selesai
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDelete(running.id)}
              disabled={remove.isPending}
              className="gap-1.5 border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4" /> Hapus
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AKTIVITAS HARI INI */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Aktivitas Hari Ini</h2>
        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Memuat…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Belum ada aktivitas hari ini.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => {
              const isRun = a.status === "running"
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{a.name}</p>
                    {isRun ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-600">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        Sedang berjalan
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatClock(a.started_at)} - {a.ended_at ? formatClock(a.ended_at) : "—"}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right flex items-center gap-2">
                    <button
                      onClick={() => continueMut.mutate(a.name)}
                      disabled={continueMut.isPending}
                      aria-label="Lanjutkan tugas"
                      title="Lanjutkan dengan nama sama"
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-bold tabular-nums text-slate-900">
                      {isRun ? formatElapsed(now - new Date(a.started_at).getTime()) : formatDuration(a.duration_seconds)}
                    </p>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={remove.isPending}
                      aria-label="Hapus aktivitas"
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
