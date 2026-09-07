"use client"

import { useEffect, useMemo, useState } from "react"
import { Play, Square, Timer, Trash2, RotateCcw, MoreVertical, Plus, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useJejakWaktu } from "@/hooks/useJejakWaktu"
import { cn, BRAND_COLORS } from "@/lib/utils"

type Item = {
  id: string
  name: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  status: "running" | "completed"
}

type Category = "Personal" | "Makan" | "Tugas" | "Kerja" | "Hiburan" | "Ibadah" | "Lainnya"

const CATEGORY_STYLE: Record<Category, { pill: string; dot: string }> = {
  Personal: { pill: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-400" },
  Makan: { pill: "bg-orange-50 text-orange-700 border border-orange-200", dot: "bg-orange-400" },
  Tugas: { pill: "bg-purple-50 text-purple-700 border border-purple-200", dot: "bg-purple-400" },
  Kerja: { pill: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-400" },
  Hiburan: { pill: "bg-pink-50 text-pink-700 border border-pink-200", dot: "bg-pink-400" },
  Ibadah: { pill: "bg-indigo-50 text-indigo-700 border border-indigo-200", dot: "bg-indigo-400" },
  Lainnya: { pill: "bg-slate-100 text-slate-600 border border-slate-200", dot: "bg-slate-400" },
}

function inferCategory(name: string): Category {
  const n = name.toLowerCase()
  if (/(makan|sarapan|makan siang|makan malam|snack|ngemil|minum)/.test(n)) return "Makan"
  if (/(tidur|istirahat|rehat|napu|ngecas)/.test(n)) return "Tidur" as Category
  if (/(ibadah|sholat|solat|ngaji|doa|puasa|dzikir)/.test(n)) return "Ibadah"
  if (/(kerja|meeting|rapat|kantor|project|office)/.test(n)) return "Kerja"
  if (/(tugas|task|belajar|kuliah|skripsi|pr|assignment)/.test(n)) return "Tugas"
  if (/(main|game|netflix|hantu|tiktok|yt|youtube|hiburan|nonton|musik|spotify)/.test(n)) return "Hiburan"
  if (/(mandi|olahraga|gym|senam|belanja|beli|antar|jalan|beres|bersih|pikir|rencan|catat|call|chat)/.test(n))
    return "Personal"
  return "Lainnya"
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

export default function WaktuPage() {
  const { data: items = [], isLoading, start, complete, remove, continue: continueMut } = useJejakWaktu()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)

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

  // Ringkasan per kategori (hanya completed)
  const summary = useMemo(() => {
    const map = new Map<Category, number>()
    for (const it of sorted) {
      if (it.status !== "completed") continue
      const cat = inferCategory(it.name)
      map.set(cat, (map.get(cat) || 0) + (it.duration_seconds || 0))
    }
    return Array.from(map.entries()).map(([cat, secs]) => ({ cat, secs }))
  }, [sorted])

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
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
          <Timer className="h-6 w-6 text-slate-700" /> Waktu
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

      {/* AKTIVITAS HARI INI - TIMELINE */}
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
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Build list: aktivitas + gap */}
            {(() => {
              const merged: ({ type: "act"; a: Item } | { type: "gap"; g: any })[] = []
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
              return merged.map((row, idx) =>
                row.type === "gap" ? (
                  <div
                    key={row.g.id}
                    className="flex items-center gap-3 px-4 py-3 bg-slate-50/60 border-t border-slate-100"
                    style={{ minHeight: 56 }}
                  >
                    <span className="shrink-0 w-2.5 h-2.5 rounded-full border-2 border-slate-300" />
                    <span className="shrink-0 w-[120px] sm:w-[180px] text-xs text-slate-400 tabular-nums">
                      {formatClock(row.g.start.toISOString())} - {formatClock(row.g.end.toISOString())}
                    </span>
                    <span className="flex-1 text-sm text-slate-400">Belum ada aktivitas</span>
                    <span className="shrink-0 text-xs text-slate-400">{fmtGap(row.g.ms)}</span>
                    <button
                      onClick={() => setName("")}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                    >
                      <Plus className="h-3.5 w-3.5" /> Tambah
                    </button>
                  </div>
                ) : (
                  <div
                    key={row.a.id}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 hover:bg-slate-50/60 transition-colors",
                      idx === 0 && "border-t-0"
                    )}
                    style={{ minHeight: 58 }}
                  >
                    {/* timeline dot */}
                    <span
                      className={cn(
                        "shrink-0 w-2.5 h-2.5 rounded-full",
                        row.a.status === "running" ? "bg-emerald-500" : "bg-slate-300"
                      )}
                    />
                    {/* jam */}
                    <span className="shrink-0 w-[120px] sm:w-[180px] text-xs text-slate-400 tabular-nums">
                      {formatClock(row.a.started_at)} -{" "}
                      {row.a.ended_at ? formatClock(row.a.ended_at) : row.a.status === "running" ? "sekarang" : "—"}
                    </span>
                    {/* nama + kategori */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{row.a.name}</p>
                      <div className="mt-1 sm:hidden">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            CATEGORY_STYLE[inferCategory(row.a.name)].pill
                          )}
                        >
                          {inferCategory(row.a.name)}
                        </span>
                      </div>
                    </div>
                    {/* kategori (desktop) */}
                    <span
                      className={cn(
                        "hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        CATEGORY_STYLE[inferCategory(row.a.name)].pill
                      )}
                    >
                      {inferCategory(row.a.name)}
                    </span>
                    {/* durasi */}
                    <span className="shrink-0 w-[80px] text-right text-sm font-bold tabular-nums text-slate-900">
                      {row.a.status === "running"
                        ? formatElapsed(now - new Date(row.a.started_at).getTime())
                        : formatDuration(row.a.duration_seconds)}
                    </span>
                    {/* action menu */}
                    <div className="shrink-0 w-[40px] flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                )
              )
            })()}
          </div>
        )}
        <button className="mt-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          Lihat semua aktivitas <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* RINGKASAN WAKTU */}
      <div>
        <button className="flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900 mb-3">
          Ringkasan Waktu <ChevronRight className="h-4 w-4" />
        </button>
        <Card className="rounded-xl border border-slate-200 shadow-none">
          <CardContent className="pt-4 pb-4">
            {summary.length === 0 ? (
              <p className="text-sm text-slate-400 text-center">Belum ada data untuk dirangkum.</p>
            ) : (
              <div className="flex flex-wrap divide-x divide-slate-100">
                {summary.map(({ cat, secs }) => (
                  <div key={cat} className="flex-1 min-w-[110px] px-4 py-2 text-center">
                    <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", CATEGORY_STYLE[cat].dot)} />
                      {cat}
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{formatDuration(secs)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
