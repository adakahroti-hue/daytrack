"use client"

import { useEffect, useMemo, useState } from "react"
import { Play, Square, Timer, Trash2, RotateCcw, MoreVertical, Plus, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useJejakWaktu, useJejakWaktuNames } from "@/hooks/useJejakWaktu"
import { useHeaderControls } from "@/components/layout/HeaderControls"
import { cn, BRAND_COLORS } from "@/lib/utils"

type Item = {
  id: string
  name: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  status: "running" | "completed"
}

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

function pad2(n: number) {
  return n.toString().padStart(2, "0")
}

function fmtGap(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0) return m > 0 ? `${h}j ${m}m` : `${h}j`
  return `${m}m`
}

// Palette warna untuk slice pie & titik timeline aktivitas (style Daytrack: soft & kontras)
const PIE_COLORS = [
  "#3b82f6", // blue (ganti navy hitam)
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#ef4444", // red
  "#6366f1", // indigo
  "#84cc16", // lime
]

type DonutSegment = { label: string; value: number; color: string }

function DonutChart({ segments, size = 180 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 2

  // Buat path irisan pie (terisi penuh, tanpa lubang)
  const slices = (() => {
    if (total === 0) return []
    let acc = 0
    return segments.map((s, i) => {
      const frac = s.value / total
      const a0 = acc * 2 * Math.PI - Math.PI / 2
      acc += frac
      const a1 = acc * 2 * Math.PI - Math.PI / 2
      const x0 = cx + r * Math.cos(a0)
      const y0 = cy + r * Math.sin(a0)
      const x1 = cx + r * Math.cos(a1)
      const y1 = cy + r * Math.sin(a1)
      const largeArc = frac > 0.5 ? 1 : 0
      const d = `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
      // posisi tengah irisan (centroid kasar di 0.6r)
      const mid = (a0 + a1) / 2
      const lx = cx + r * 0.62 * Math.cos(mid)
      const ly = cy + r * 0.62 * Math.sin(mid)
      return { d, color: s.color, key: i, pct: Math.round(frac * 100), lx, ly }
    })
  })()

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="#e2e8f0" />
        ) : (
          slices.map((s) => (
            <path key={s.key} d={s.d} fill={s.color} className="transition-all duration-500" />
          ))
        )}
        {total > 0 &&
          slices.map(
            (s) =>
              s.pct >= 6 && (
                <text
                  key={`t-${s.key}`}
                  x={s.lx}
                  y={s.ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white"
                  style={{ fontSize: 11, fontWeight: 700 }}
                >
                  {s.pct}%
                </text>
              )
          )}
      </svg>
      <div className="flex-1 min-w-0 space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-slate-700 break-words">{s.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{formatDuration(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WaktuPage() {
  const { waktuPeriod, waktuDate } = useHeaderControls()
  const { data: items = [], isLoading, start, complete, remove, continue: continueMut } = useJejakWaktu(waktuPeriod, waktuDate)
  const { data: allNames = [] } = useJejakWaktuNames()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showSuggest, setShowSuggest] = useState(false)

  // Saran nama dari inputan sebelumnya (all-time, lintas hari) — unik, case-insensitive contains
  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase()
    if (!q) return []
    const seen = new Set<string>()
    const list: string[] = []
    for (const n of allNames) {
      const t = n.trim()
      if (t && t.toLowerCase().includes(q) && !seen.has(t.toLowerCase())) {
        seen.add(t.toLowerCase())
        list.push(t)
      }
      if (list.length >= 6) break
    }
    return list
  }, [name, allNames])

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const running = useMemo(() => items.find((i) => i.status === "running") || null, [items])

  // Urutkan ascending by started_at untuk timeline
  const sorted = useMemo(
    () => [...items].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()),
    [items]
  )

  // Hitung gap (slot kosong) antar aktivitas yang sudah selesai
  const gaps = useMemo(() => {
    const out: { id: string; start: Date; end: Date; ms: number }[] = []
    const done = sorted.filter((i) => i.status === "completed" && i.ended_at)
    for (let i = 0; i < done.length - 1; i++) {
      const endCur = new Date(done[i].ended_at as string).getTime()
      const startNext = new Date(done[i + 1].started_at).getTime()
      const ms = startNext - endCur
      if (ms >= 5 * 60 * 1000) {
        out.push({ id: `gap-${done[i].id}`, start: new Date(endCur), end: new Date(startNext), ms })
      }
    }
    return out
  }, [sorted])

  // Total waktu per nama kegiatan (akumulasi completed + running saat ini)
  const totalsByName = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of sorted) {
      let secs = 0
      if (it.status === "completed") {
        secs = it.duration_seconds || 0
      } else if (it.status === "running") {
        secs = Math.max(0, Math.round((now - new Date(it.started_at).getTime()) / 1000))
      }
      if (secs <= 0) continue
      map.set(it.name, (map.get(it.name) || 0) + secs)
    }
    return Array.from(map.entries())
      .map(([name, secs]) => ({ name, secs }))
      .sort((a, b) => b.secs - a.secs)
  }, [sorted, now])

  const grandTotal = totalsByName.reduce((s, x) => s + x.secs, 0)

  // Map warna tetap per NAMA aktivitas — SAMA PERSIS dengan irisan donut (Ringkasan Waktu)
  // Indexing disamakan dengan DonutChart: totalsByName.slice(0,10) index ke-i -> PIE_COLORS[i]
  const colorByName = useMemo(() => {
    const map: Record<string, string> = {}
    totalsByName.slice(0, 10).forEach((x, i) => {
      map[x.name] = PIE_COLORS[i % PIE_COLORS.length]
    })
    return map
  }, [totalsByName])

  const elapsed = running ? now - new Date(running.started_at).getTime() : 0

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

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-3 sm:px-4 sm:py-5">
      {/* HEADER filter dipindah ke global HeaderControls (sejajar judul) */}

      {/* INPUT AKTIVITAS */}
      <Card className="rounded-xl border border-slate-200 shadow-sm">
        <CardContent className="pt-5 pb-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2.5">
            Nama kegiatan
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setShowSuggest(true)
                }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (showSuggest && suggestions.length > 0) {
                      setName(suggestions[0])
                      setShowSuggest(false)
                    } else {
                      handleStart()
                    }
                  }
                  if (e.key === "Escape") setShowSuggest(false)
                }}
                placeholder="Apa yang sedang kamu lakukan?"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 transition-colors"
              />
              {showSuggest && suggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-md overflow-hidden">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setName(s)
                        setShowSuggest(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
          <CardContent className="pt-6 pb-6 flex flex-col items-center text-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium px-2.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Sedang berjalan
            </span>
            <p className="text-base font-semibold text-slate-900">{running.name}</p>
            <p className="text-5xl font-bold tabular-nums text-slate-900 tracking-tight">{formatElapsed(elapsed)}</p>
            <div className="flex gap-2">
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* AKTIVITAS HARI INI — VERTICAL TIMELINE */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">Aktivitas Hari Ini</h2>
        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Memuat…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Belum ada aktivitas hari ini.
          </div>
        ) : (
          <div className="relative">
            {/* Garis vertikal timeline */}
            <div className="absolute top-2 bottom-2 left-[9px] w-px bg-slate-200" aria-hidden />
            <div className="space-y-3">
              {(() => {
                // Gabungkan aktivitas + gap (slot kosong), urut kronologis lalu tampil terbaru di atas
                const merged: ({ type: "act"; a: Item } | { type: "gap"; g: { id: string; start: Date; end: Date; ms: number } })[] = []
                const acts = [...sorted]
                let gi = 0
                for (const a of acts) {
                  while (gi < gaps.length && new Date(gaps[gi].start).getTime() < new Date(a.started_at).getTime()) {
                    merged.push({ type: "gap", g: gaps[gi] })
                    gi++
                  }
                  merged.push({ type: "act", a })
                }
                while (gi < gaps.length) {
                  merged.push({ type: "gap", g: gaps[gi] })
                  gi++
                }
                return merged.reverse().map((row) =>
                  row.type === "gap" ? (
                    // SLOT KOSONG — card dashed di jalur timeline
                    <div key={row.g.id} className="relative pl-8">
                      <span className="absolute left-[5px] top-1/2 -translate-y-1/2 z-10 h-[9px] w-[9px] rounded-full border-2 border-slate-300 bg-white" />
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="shrink-0 text-[11px] text-slate-400 tabular-nums leading-tight">
                          {formatClock(row.g.start.toISOString())} – {formatClock(row.g.end.toISOString())}
                        </span>
                        <span className="flex-1 min-w-0 text-sm text-slate-400 truncate">Belum ada aktivitas</span>
                        <span className="shrink-0 text-xs text-slate-400">{fmtGap(row.g.ms)}</span>
                        <button
                          onClick={() => setName("")}
                          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          <Plus className="h-3.5 w-3.5" /> Tambah
                        </button>
                      </div>
                    </div>
                  ) : (
                    // AKTIVITAS — node berwarna di jalur + card
                    <div key={row.a.id} className="relative pl-8">
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-[19px] w-[19px] rounded-full border-[3px] border-white shadow"
                        style={{ background: colorByName[row.a.name] || "#94a3b8" }}
                      >
                        {row.a.status === "running" && (
                          <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-60" />
                        )}
                      </span>
                      <div
                        className={cn(
                          "rounded-xl border shadow-sm px-4 py-3 transition-colors",
                          row.a.status === "running"
                            ? "border-emerald-200 bg-emerald-50/50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                          {/* Waktu — desktop: kolom kiri; mobile: di bawah nama */}
                          <span className="hidden sm:block shrink-0 w-[168px] border-r border-slate-200 pr-4 text-xs text-slate-500 tabular-nums leading-snug">
                            {formatClock(row.a.started_at)}
                            <span className="text-slate-300"> – </span>
                            {row.a.ended_at
                              ? formatClock(row.a.ended_at)
                              : row.a.status === "running"
                              ? "sekarang"
                              : "—"}
                          </span>
                          {/* Nama */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 break-words">{row.a.name}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums sm:hidden">
                              {formatClock(row.a.started_at)} –{" "}
                              {row.a.ended_at
                                ? formatClock(row.a.ended_at)
                                : row.a.status === "running"
                                ? "sekarang"
                                : "—"}
                            </p>
                          </div>
                          {/* Durasi */}
                          <span className="shrink-0 sm:w-[76px] sm:text-right text-sm font-bold tabular-nums text-slate-900">
                            {row.a.status === "running"
                              ? formatElapsed(now - new Date(row.a.started_at).getTime())
                              : formatDuration(row.a.duration_seconds)}
                          </span>
                          {/* Aksi — selalu tampil (mobile & desktop) */}
                          <div className="shrink-0 flex justify-end gap-0.5 sm:pl-1">
                            <button
                              onClick={() => continueMut.mutate(row.a.name)}
                              disabled={continueMut.isPending}
                              aria-label="Lanjutkan tugas"
                              title="Lanjutkan dengan nama sama"
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(row.a.id)}
                              disabled={remove.isPending}
                              aria-label="Hapus aktivitas"
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {row.a.status === "running" && (
                          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium px-2 py-0.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            Sedang berjalan
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* RINGKASAN WAKTU */}
      <div>
        <button className="flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900 mb-3">
          Ringkasan Waktu per Kegiatan <ChevronRight className="h-4 w-4" />
        </button>
        <Card className="rounded-xl border border-slate-200 shadow-none">
          <CardContent className="pt-5 pb-5">
            {totalsByName.length === 0 ? (
              <p className="text-sm text-slate-400 text-center">Belum ada aktivitas tercatat.</p>
            ) : (
              <DonutChart
                segments={totalsByName.slice(0, 10).map((x, i) => ({
                  label: x.name,
                  value: x.secs,
                  color: PIE_COLORS[i % PIE_COLORS.length],
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
