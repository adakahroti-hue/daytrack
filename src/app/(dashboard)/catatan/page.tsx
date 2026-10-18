"use client"

import { useState, useRef, useEffect, useMemo, type ReactNode } from "react"
import { Pencil, Trash2, List, ListOrdered, Copy, X, Plus, Bold, Italic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useCatatanAll, useCreateCatatan, useUpdateCatatan, useDeleteCatatan } from "@/hooks/useCatatan"
import { useRealtime } from "@/hooks/useRealtime"
import { useHeaderControls } from "@/components/layout/HeaderControls"

// Palet 12 warna cerah (hindari hitam/navy). Dipakai untuk assign otomatis ke kategori.
type CategoryColor = {
  key: string
  bar: string
  badge: string
  card: string
  hover: string
  pillBase: string
  pillHover: string
}

const CATEGORY_PALETTE: CategoryColor[] = [
  { key: "amber",   bar: "bg-amber-400",   badge: "bg-amber-400 text-white",   card: "bg-amber-50 border-amber-200",   hover: "hover:bg-amber-100",   pillBase: "bg-amber-50 border-amber-200 text-amber-800", pillHover: "hover:bg-amber-100" },
  { key: "emerald", bar: "bg-emerald-400", badge: "bg-emerald-400 text-white", card: "bg-emerald-50 border-emerald-200", hover: "hover:bg-emerald-100", pillBase: "bg-emerald-50 border-emerald-200 text-emerald-800", pillHover: "hover:bg-emerald-100" },
  { key: "sky",     bar: "bg-sky-400",     badge: "bg-sky-400 text-white",     card: "bg-sky-50 border-sky-200",       hover: "hover:bg-sky-100",     pillBase: "bg-sky-50 border-sky-200 text-sky-800",       pillHover: "hover:bg-sky-100" },
  { key: "pink",    bar: "bg-pink-400",    badge: "bg-pink-400 text-white",    card: "bg-pink-50 border-pink-200",     hover: "hover:bg-pink-100",    pillBase: "bg-pink-50 border-pink-200 text-pink-800",    pillHover: "hover:bg-pink-100" },
  { key: "orange",  bar: "bg-orange-400",  badge: "bg-orange-400 text-white",  card: "bg-orange-50 border-orange-200", hover: "hover:bg-orange-100",  pillBase: "bg-orange-50 border-orange-200 text-orange-800", pillHover: "hover:bg-orange-100" },
  { key: "violet",  bar: "bg-violet-400",  badge: "bg-violet-400 text-white",  card: "bg-violet-50 border-violet-200", hover: "hover:bg-violet-100",  pillBase: "bg-violet-50 border-violet-200 text-violet-800", pillHover: "hover:bg-violet-100" },
  { key: "teal",    bar: "bg-teal-400",    badge: "bg-teal-400 text-white",    card: "bg-teal-50 border-teal-200",     hover: "hover:bg-teal-100",    pillBase: "bg-teal-50 border-teal-200 text-teal-800",     pillHover: "hover:bg-teal-100" },
  { key: "rose",    bar: "bg-rose-400",    badge: "bg-rose-400 text-white",    card: "bg-rose-50 border-rose-200",     hover: "hover:bg-rose-100",    pillBase: "bg-rose-50 border-rose-200 text-rose-800",     pillHover: "hover:bg-rose-100" },
  { key: "indigo",  bar: "bg-indigo-400",  badge: "bg-indigo-400 text-white",  card: "bg-indigo-50 border-indigo-200", hover: "hover:bg-indigo-100",  pillBase: "bg-indigo-50 border-indigo-200 text-indigo-800", pillHover: "hover:bg-indigo-100" },
  { key: "lime",    bar: "bg-lime-400",    badge: "bg-lime-400 text-white",    card: "bg-lime-50 border-lime-200",     hover: "hover:bg-lime-100",    pillBase: "bg-lime-50 border-lime-200 text-lime-800",     pillHover: "hover:bg-lime-100" },
  { key: "cyan",    bar: "bg-cyan-400",    badge: "bg-cyan-400 text-white",    card: "bg-cyan-50 border-cyan-200",     hover: "hover:bg-cyan-100",    pillBase: "bg-cyan-50 border-cyan-200 text-cyan-800",     pillHover: "hover:bg-cyan-100" },
  { key: "red",     bar: "bg-red-400",     badge: "bg-red-400 text-white",     card: "bg-red-50 border-red-200",       hover: "hover:bg-red-100",     pillBase: "bg-red-50 border-red-200 text-red-800",       pillHover: "hover:bg-red-100" },
] as const

// Kunci localStorage untuk mapping kategori → index palet
const CAT_COLOR_STORAGE_KEY = "daytrack:catatan:categoryColors"

// Kolom DB `catatan.warna` masih punya CHECK constraint lama yang HANYA mengizinkan
// 5 nilai: yellow/green/blue/pink/orange (migration 20260816000003). Warna tampilan
// sekarang dihitung dari kategori (localStorage), BUKAN dari kolom ini — tapi insert/update
// tetap divalidasi constraint. Jadi petakan key palet → nilai legacy yang valid, agar
// simpan tidak gagal (error 23514). Kalau nanti constraint dihapus via SQL Editor,
// mapping ini tetap aman (nilainya subset yang valid).
const DB_WARNA_VALID = ["yellow", "green", "blue", "pink", "orange"] as const
const PALETTE_KEY_TO_DB: Record<string, (typeof DB_WARNA_VALID)[number]> = {
  amber: "yellow", emerald: "green", sky: "blue", pink: "pink", orange: "orange",
  violet: "blue", teal: "green", rose: "pink", indigo: "blue", lime: "green",
  cyan: "blue", red: "orange",
}
function toDbWarna(key: string): (typeof DB_WARNA_VALID)[number] {
  return PALETTE_KEY_TO_DB[key] ?? "yellow"
}

// Default warna untuk catatan TANPA kategori (hitam/slate-900)
const NO_CATEGORY_COLOR = {
  bar: "bg-slate-900",
  badge: "bg-slate-900 text-white",
  card: "bg-slate-50 border-slate-200",
  hover: "hover:bg-slate-100",
  pillBase: "bg-white text-slate-600 border-slate-200",
  pillHover: "hover:bg-slate-100",
} as const

// Helper: ambil mapping dari localStorage (client-only)
function getStoredCategoryColors(): Record<string, number> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(CAT_COLOR_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

// Helper: simpan mapping ke localStorage
function setStoredCategoryColors(map: Record<string, number>) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(CAT_COLOR_STORAGE_KEY, JSON.stringify(map)) } catch {}
}

// Helper: dapatkan warna untuk kategori (assign otomatis jika belum ada)
function getColorForCategory(category: string, allCategories: string[]): CategoryColor | typeof NO_CATEGORY_COLOR {
  if (!category) return NO_CATEGORY_COLOR
  const stored = getStoredCategoryColors()
  let idx = stored[category]
  if (idx === undefined) {
    // Kategori BARU (belum ada di daftar catatan) → indexOf = -1; pakai 0 sebagai basis.
    const pos = Math.max(0, allCategories.indexOf(category))
    idx = pos % CATEGORY_PALETTE.length
    // Cari slot warna yang belum terpakai — TAPI berhenti setelah 1 putaran penuh
    // supaya tidak infinite loop saat semua 12 warna sudah terpakai (kategori ke-13+
    // boleh berbagi warna dengan kategori lama).
    const used = new Set(Object.values(stored))
    if (used.size < CATEGORY_PALETTE.length) {
      for (let i = 0; i < CATEGORY_PALETTE.length && used.has(idx); i++) {
        idx = (idx + 1) % CATEGORY_PALETTE.length
      }
    }
    stored[category] = idx
    setStoredCategoryColors(stored)
  }
  return CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length] ?? CATEGORY_PALETTE[0]
}

// Row catatan dari getCatatanAll — field yang dipakai halaman ini.
interface Note {
  id: string
  judul: string
  isi: string
  label?: string | null
  warna: string // legacy field, dipakai fallback kalau category-color belum ter-set
}

interface EditState {
  id: string | null
  judul: string
  isi: string
  label: string
  // warna tidak lagi di state — dihitung dari kategori pertama
}

interface ViewState {
  id: string
  judul: string
  isi: string
  label: string
  // warna dihitung dari kategori pertama
}

// Rev mobile: kategori multi — disimpan di kolom label sebagai teks terpisah koma ("Ide, Belajar")
function parseKats(raw: string | null | undefined): string[] {
  return (raw || "").split(",").map((t) => t.trim()).filter(Boolean)
}

// Render inline formatting **bold** dan *italic* — marker ditambahkan tombol Bold/Italic di toolbar Isi.
// Tanpa ini, marker akan tampil mentah di kartu & dialog view.
function renderInline(ln: string, keyPrefix: number): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0
  let i = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(ln)) !== null) {
    if (m.index > last) parts.push(ln.slice(last, m.index))
    parts.push(
      m[1] !== undefined
        ? <strong key={`${keyPrefix}-${i}`} className="font-bold">{m[1]}</strong>
        : <em key={`${keyPrefix}-${i}`} className="italic">{m[2]}</em>
    )
    last = m.index + m[0].length
    i += 1
  }
  if (last < ln.length) parts.push(ln.slice(last))
  return parts
}

function NoteLines({ text, maxLines, className }: { text: string; maxLines?: number; className?: string }) {
  const lines = (text || "").split("\n")
  const shown = maxLines ? lines.slice(0, maxLines) : lines
  return (
    <div className={className}>
      {shown.map((ln, i) => {
        const isList = /^(•\s|\d+\.\s)/.test(ln)
        const style = isList
          ? ln.startsWith("• ")
            ? { paddingLeft: "1.1em", textIndent: "-1.1em" }
            : { paddingLeft: "1.5em", textIndent: "-1.5em" }
          : undefined
        return (
          <div key={i} style={style} className="whitespace-pre-wrap break-words">
            {ln ? renderInline(ln, i) : " "}
          </div>
        )
      })}
    </div>
  )
}

// Row catatan dari getCatatanAll — field yang dipakai halaman ini.
interface Note {
  id: string
  judul: string
  isi: string
  label?: string | null
  warna: string
}

interface EditState {
  id: string | null
  judul: string
  isi: string
  label: string
  // warna tidak lagi di state — dihitung dari kategori pertama
}

interface ViewState {
  id: string
  judul: string
  isi: string
  label: string
  // warna dihitung dari kategori pertama
}

export default function CatatanPage() {
  const { data: notes = [], isLoading } = useCatatanAll()
  useRealtime({ table: "catatan", queryKeys: [["catatan"]] })

  const createCatatan = useCreateCatatan()
  const updateCatatan = useUpdateCatatan()
  const deleteCatatan = useDeleteCatatan()

  const [editState, setEditState] = useState<EditState | null>(null)
  const [viewState, setViewState] = useState<ViewState | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [filterKat, setFilterKat] = useState<string>("semua") // 'semua' | 'lainnya' | <nama kategori>
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [newKat, setNewKat] = useState("")
  const isiRef = useRef<HTMLTextAreaElement>(null)
  // Pencarian lewat context header — state bersama antara input (Header/desktop) & input konten (mobile)
  const { setHeaderAddAction, headerSearchQuery, setHeaderSearchQuery } = useHeaderControls()

  // Kategori unik dari seluruh catatan (multi-kategori per catatan, dipisah koma)
  const categories = Array.from(
    new Set((notes as Note[]).flatMap((n) => parseKats(n.label)))
  ).sort((a, b) => a.localeCompare(b))

  // Warna per kategori (memo agar stabil antar render)
  const categoryColors = useMemo(() => {
    const map: Record<string, CategoryColor | typeof NO_CATEGORY_COLOR> = {}
    categories.forEach(cat => { map[cat] = getColorForCategory(cat, categories) })
    return map
  }, [categories])

  // Daftar kategori yang bisa dipilih di dialog: existing + yang sedang dipilih (termasuk baru diketik)
  const availableKats = Array.from(new Set([...categories, ...parseKats(editState?.label ?? "")]))

  // Filter catatan berdasarkan kategori (cocokkan per token, bukan string penuh)
  // tambahan: match searchQuery ke judul atau isi (case-insensitive)
  const filteredNotes = (notes as Note[]).filter((n) => {
    const labs = parseKats(n.label)
    // Kategori filter
    const katMatch =
      filterKat === "semua"
        ? true
        : filterKat === "lainnya"
        ? labs.length === 0
        : labs.includes(filterKat)
    // Search teks lewat judul + isi (case-insensitive, token per-token)
    const textMatch =
      !headerSearchQuery.trim() ||
      (n.judul.toLowerCase().includes(headerSearchQuery.toLowerCase()) ||
        (n.isi ?? "").toLowerCase().includes(headerSearchQuery.toLowerCase()))
    return katMatch && textMatch
  })

  // Batasi maksimal 10 baris (kartu) kecuali showAll aktif
  const visibleNotes = showAll ? filteredNotes : filteredNotes.slice(0, 10)

  // Sisipkan awalan di baris kursor: bullet ("• ") atau number ("N. ")
  const insertPrefix = (mode: "bullet" | "number") => {
    const el = isiRef.current
    if (!el || !editState) return
    const value = editState.isi
    const pos = el.selectionStart ?? value.length
    const before = value.slice(0, pos)
    const after = value.slice(pos)
    // Tentukan awal baris saat ini
    const lineStart = before.lastIndexOf("\n") + 1
    const lineSoFar = before.slice(lineStart)
    let prefix = ""
    if (mode === "bullet") {
      prefix = "• "
    } else {
      // Hitung nomor berdasarkan jumlah baris bernomor sebelumnya di teks
      const headText = before.slice(0, lineStart)
      const prevNumbered = (headText.match(/^\d+\.\s/gm) || []).length
      prefix = `${prevNumbered + 1}. `
    }
    // Jika baris sudah punya prefix yang sama, jangan dobel
    if (lineSoFar.startsWith(prefix)) return
    const newValue = before + prefix + after
    setEditState(prev => prev ? { ...prev, isi: newValue } : prev)
    // Kembalikan fokus & letakkan kursor setelah prefix
    requestAnimationFrame(() => {
      const np = pos + prefix.length
      el.focus()
      el.setSelectionRange(np, np)
    })
  }

  // Sisipkan penanda bold/italic mengelilingi teks terpilih.
  // Toggle: kalau seleksi SUDAH dibungkus marker yang sama, penanda dilepas (jadi batal).
  const wrapSelection = (kind: "bold" | "italic") => {
    const el = isiRef.current
    if (!el || !editState) return
    const marker = kind === "bold" ? "**" : "*"
    const value = editState.isi
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const sel = value.slice(start, end)
    const isWrapped = sel.startsWith(marker) && sel.endsWith(marker) && sel.length >= marker.length * 2
    const inner = isWrapped ? sel.slice(marker.length, -marker.length) : marker + sel + marker
    const newValue = value.slice(0, start) + inner + value.slice(end)
    setEditState(prev => prev ? { ...prev, isi: newValue } : prev)
    // Seleksi kembali isi di antara marker (atau kursor di tengah marker kalau seleksi kosong)
    const ns = start + (isWrapped ? 0 : marker.length)
    const ne = start + inner.length - (isWrapped ? 0 : marker.length)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(ns, ne)
    })
  }

  const openAdd = () => { setNewKat(""); setEditState({ id: null, judul: "", isi: "", label: "" }) }
  const openEdit = (n: Note) => {
    setNewKat("")
    const { warna, ...rest } = n
    setEditState({ id: rest.id, judul: rest.judul, isi: rest.isi, label: rest.label ?? "" })
  }
  const openEditFromView = (v: ViewState) => {
    setNewKat("")
    setEditState({ id: v.id, judul: v.judul, isi: v.isi, label: v.label })
  }

  // Rev mobile: toggle kategori terpilih (multiselect) di dialog tambah/edit
  const toggleKat = (cat: string) => {
    setEditState(prev => {
      if (!prev) return prev
      const cur = parseKats(prev.label)
      const next = cur.includes(cat) ? cur.filter(c => c !== cat) : [...cur, cat]
      return { ...prev, label: next.join(", ") }
    })
  }
  // Rev mobile: buat kategori baru dari input lalu langsung terpilih
  const addNewKat = () => {
    const name = newKat.trim().slice(0, 50)
    if (!name) return
    setEditState(prev => {
      if (!prev) return prev
      const cur = parseKats(prev.label)
      if (cur.includes(name)) return prev
      return { ...prev, label: [...cur, name].join(", ") }
    })
    setNewKat("")
  }

  const openView = (n: Note) =>
    setViewState({ id: n.id, judul: n.judul, isi: n.isi, label: n.label ?? "" })

  // Rev mobile: tombol "Tambah Catatan" pindah ke header kanan atas — registrasi handler via context
  useEffect(() => {
    setHeaderAddAction(() => openAdd)
    return () => setHeaderAddAction(null)
  }, [setHeaderAddAction])

  // Salin isi dialog edit (judul + label + isi) ke clipboard — dipakai tombol ikon di toolbar Isi
  const copyEdit = () => {
    const e = editState
    if (!e) return
    // Rev mobile: salin ISI saja — judul & label tidak ikut
    const text = e.isi
    navigator.clipboard.writeText(text)
      .then(() => import("sonner").then(({ toast }) => toast.success("Catatan disalin")))
      .catch(() => import("sonner").then(({ toast }) => toast.error("Gagal menyalin catatan")))
  }

  const handleSave = async () => {
    if (!editState) return
    if (!editState.judul.trim() || !editState.isi.trim()) return
    // Fix: kategori baru yang diketik tapi belum diklik "+" jangan hilang —
    // gabungkan otomatis ke label saat simpan
    const pendingKat = newKat.trim().slice(0, 50)
    let label = editState.label
    if (pendingKat) {
      const cur = parseKats(label)
      if (!cur.includes(pendingKat)) label = [...cur, pendingKat].join(", ")
    }
    // Warna dari kategori pertama.
    // PENTING: pakai getColorForCategory langsung (bukan categoryColors[firstCat]) —
    // kategori BARU belum ada di map `categoryColors` (map hanya berisi kategori dari
    // catatan tersimpan), jadi lookup-nya undefined → crash `"key" in undefined`.
    const cats = parseKats(label)
    const firstCat = cats[0]
    const colorObj = getColorForCategory(firstCat ?? "", [...categories, ...(firstCat ? [firstCat] : [])])
    const paletteKey = "key" in colorObj ? colorObj.key : ""
    // Kolom DB `warna` masih dibatasi CHECK constraint 5 nilai — kirim nilai legacy valid
    // (tampilan warna sebenarnya dihitung dari kategori, kolom ini sekadar pengisi NOT NULL).
    const warnaFromCat = toDbWarna(paletteKey)
    setIsBusy(true)
    try {
      if (editState.id) {
        await updateCatatan.mutateAsync({
          id: editState.id,
          data: { judul: editState.judul.trim(), isi: editState.isi.trim(), label: label.trim(), warna: warnaFromCat },
        })
      } else {
        await createCatatan.mutateAsync({
          judul: editState.judul.trim(),
          isi: editState.isi.trim(),
          label: label.trim(),
          warna: warnaFromCat,
        })
      }
      setEditState(null)
      setNewKat("")
    } finally {
      setIsBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan ini?")) return
    await deleteCatatan.mutateAsync(id)
  }

  return (
    <div className="max-w-[1440px] mx-auto py-4 sm:py-6 lg:pt-2 space-y-4">
      {/* Rev mobile: padding kiri-kanan mobile dihapus (main layout sudah p-4) */}
      {/* Rev mobile: judul "Catatan" dihapus — deretan kategori jadi baris pertama; tombol tambah pindah ke header */}
      {/* Rev: Input search di header, fokus langsung bisa ditulis */}
      {/* Desktop: pencarian pindah ke header (sebelah kiri tombol Tambah) — input hanya untuk mobile */}
      <div className="flex items-center gap-2 mb-4 sm:hidden">
        <Input
          placeholder="Judul atau isi..."
          value={headerSearchQuery}
          onChange={(e) => setHeaderSearchQuery(e.target.value)}
          className="h-10 sm:h-12 rounded-md border-slate-300 px-3 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {notes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:flex-wrap sm:overflow-visible">
            <button
              type="button"
              onClick={() => { setFilterKat("semua"); setShowAll(false) }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors shrink-0 whitespace-nowrap",
                filterKat === "semua"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              Semua
            </button>
            {categories.map((cat) => {
              const color = categoryColors[cat] ?? NO_CATEGORY_COLOR
              const isActive = filterKat === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => { setFilterKat(cat); setShowAll(false) }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors shrink-0 whitespace-nowrap",
                    isActive
                      ? `${color.bar} text-white border-transparent`
                      : `${color.pillBase ?? "bg-white text-slate-600 border-slate-200"} ${color.pillHover ?? "hover:bg-slate-50"}`
                  )}
                  style={{ backgroundColor: isActive ? undefined : undefined }} // className handles it
                >
                  {cat}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => { setFilterKat("lainnya"); setShowAll(false) }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors shrink-0 whitespace-nowrap",
                filterKat === "lainnya"
                  ? NO_CATEGORY_COLOR.bar + " text-white border-transparent"
                  : NO_CATEGORY_COLOR.pillBase + " " + NO_CATEGORY_COLOR.pillHover
              )}
            >
              Lainnya
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Memuat...</p>
      ) : filteredNotes.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          {notes.length === 0 ? "Belum ada catatan. Klik tombol tambah (+) di kanan atas." : "Tidak ada catatan pada kategori ini."}
        </p>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {visibleNotes.map((n) => {
            const cats = parseKats(n.label)
            const firstCat = cats[0]
            const c = (firstCat ? categoryColors[firstCat] : NO_CATEGORY_COLOR) ?? NO_CATEGORY_COLOR
            const isiLines = (n.isi || "").split("\n")
            const isExpanded = expanded.has(n.id)
            // Preview maksimal 10 baris; jika lebih, tampilkan tombol Selengkapnya per kartu
            const MAX_LINES = 10
            const isLong = isiLines.length > MAX_LINES
            const shownLines = !isLong || isExpanded ? isiLines : isiLines.slice(0, MAX_LINES)
            const isiPreview = shownLines.join("\n")
            return (
              <div key={n.id}
                role="button" tabIndex={0}
                onClick={() => openView(n)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openView(n) } }}
                className={cn("rounded-lg border shadow-sm p-2.5 sm:p-3 flex flex-col min-h-[120px] sm:min-h-[140px] cursor-pointer transition-colors hover:brightness-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-300")}>
                <div className={cn("h-1 w-10 rounded-full mb-2", c.bar)} />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-bold break-words leading-snug text-slate-900">{n.judul}</p>
                  {parseKats(n.label).length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end shrink-0">
                      {parseKats(n.label).map((k) => {
                        const catColor = categoryColors[k] ?? NO_CATEGORY_COLOR
                        return (
                          <span key={k} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", catColor.badge)}>
                            {k}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
                <NoteLines text={isiPreview} className="mt-1 text-sm leading-snug flex-1 text-slate-900" />
                {isLong && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpanded(prev => {
                        const next = new Set(prev)
                        if (next.has(n.id)) next.delete(n.id)
                        else next.add(n.id)
                        return next
                      })
                    }}
                    className="text-[11px] text-purple-600 hover:text-purple-700 hover:underline mt-1 text-left"
                  >
                    {isExpanded ? "Sembunyikan" : "Selengkapnya"}
                  </button>
                )}
                <div className="flex items-center justify-end gap-1 pt-2 mt-auto">
                  {/* Rev mobile: tombol edit & hapus hitam, ikon putih */}
                  <Button size="icon" aria-label="Edit catatan" onClick={(e) => { e.stopPropagation(); openEdit(n) }}
                    className="h-8 w-8 sm:h-6 sm:w-6 p-0 bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
                    <Pencil className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </Button>
                  <Button size="icon" aria-label="Hapus catatan" onClick={(e) => { e.stopPropagation(); handleDelete(n.id) }}
                    className="h-8 w-8 sm:h-6 sm:w-6 p-0 bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
                    <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        {filteredNotes.length > 10 && (
          <div className="flex justify-center pt-1">
            <Button variant="outline" size="sm" onClick={() => setShowAll(v => !v)} className="text-xs">
              {showAll ? "Sembunyikan" : `Selengkapnya (${filteredNotes.length - 10})`}
            </Button>
          </div>
        )}
        </>
      )}

      <Dialog open={!!viewState} onOpenChange={(open) => !open && setViewState(null)}>
        <DialogContent className="max-w-[calc(100vw-16px)] sm:max-w-[calc(100vw-32px)] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewState && parseKats(viewState.label).length > 0 && (
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", categoryColors[parseKats(viewState.label)[0]]?.bar ?? NO_CATEGORY_COLOR.bar)} />
              )}
              <span className="break-words">{viewState?.judul}</span>
              {viewState && parseKats(viewState.label).length > 0 && (
                <span className="flex flex-wrap gap-1 shrink-0">
                  {parseKats(viewState.label).map((k) => (
                    <span key={k} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", categoryColors[k]?.badge ?? NO_CATEGORY_COLOR.badge)}>
                      {k}
                    </span>
                  ))}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <NoteLines text={viewState?.isi ?? ""} className="text-sm leading-snug max-h-[60vh] overflow-y-auto text-slate-700" />
          {/* Rev mobile: Tutup & Edit di kiri, Salin paling kanan — ikon saja */}
          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="icon" onClick={() => setViewState(null)} aria-label="Tutup" title="Tutup" className="h-9 w-9 p-0">
              <X className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={() => {
              const v = viewState
              setViewState(null)
              if (v) openEditFromView(v)
            }} aria-label="Edit" title="Edit" className="h-9 w-9 p-0 bg-slate-900 hover:bg-slate-800 text-white">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="ml-auto h-9 w-9 p-0" onClick={() => {
              const v = viewState
              if (!v) return
              const text = v.isi
              navigator.clipboard.writeText(text)
                .then(() => import("sonner").then(({ toast }) => toast.success("Catatan disalin")))
                .catch(() => import("sonner").then(({ toast }) => toast.error("Gagal menyalin catatan")))
            }} aria-label="Salin" title="Salin">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[calc(100vw-8px)] sm:max-w-[calc(100vw-32px)] rounded-xl h-[calc(100svh-8px)] sm:h-[calc(100vh-24px)] sm:max-h-[980px] !p-3 sm:!p-4 gap-2 flex flex-col overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{editState?.id ? "Edit Catatan" : "Tambah Catatan"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-0.5">
            <div className="shrink-0 space-y-1.5">
              <Label htmlFor="catatan-judul">Judul</Label>
              <Input
                id="catatan-judul"
                placeholder="Judul catatan"
                value={editState?.judul ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, judul: e.target.value } : prev)}
              />
            </div>
            <div className="shrink-0 space-y-1.5">
              <Label>Kategori</Label>
              {/* Rev mobile: pilih dari kategori yang sudah ada — multiselect */}
              {availableKats.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {availableKats.map((cat) => {
                    const active = parseKats(editState?.label ?? "").includes(cat)
                    return (
                      <button key={cat} type="button" onClick={() => toggleKat(cat)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                          active ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}>
                        {cat}
                      </button>
                    )
                  })}
                </div>
              )}
              {/* Rev mobile: buat kategori baru jika belum ada */}
              <div className="flex gap-1.5">
                <Input
                  id="catatan-label"
                  placeholder="Kategori baru..."
                  maxLength={50}
                  value={newKat}
                  onChange={(e) => setNewKat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewKat() } }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addNewKat} className="shrink-0" aria-label="Tambah kategori" title="Tambah kategori">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col flex-1 min-h-0 space-y-1.5">
              <Label htmlFor="catatan-isi">Isi</Label>
              {/* Rev: tombol Salin jadi ikon saja — kanan atas, sebaris dengan Bullet/Number, di luar field isi */}
              <div className="shrink-0 flex items-center gap-1.5 mb-1.5">
                <Button type="button" variant="outline" size="sm" onClick={() => wrapSelection("bold")}
                  className="h-7 gap-1 text-[11px] px-2" aria-label="Tebal" title="Tebal (bold)">
                  <Bold className="h-3.5 w-3.5" /> Bold
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => wrapSelection("italic")}
                  className="h-7 gap-1 text-[11px] px-2" aria-label="Miring" title="Miring (italic)">
                  <Italic className="h-3.5 w-3.5" /> Italic
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => insertPrefix("bullet")}
                  className="h-7 gap-1 text-[11px] px-2" aria-label="Tambah bullet">
                  <List className="h-3.5 w-3.5" /> Bullet
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => insertPrefix("number")}
                  className="h-7 gap-1 text-[11px] px-2" aria-label="Tambah nomor">
                  <ListOrdered className="h-3.5 w-3.5" /> Number
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={copyEdit}
                  className="ml-auto h-7 w-7 p-0 shrink-0" aria-label="Salin catatan" title="Salin catatan">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                id="catatan-isi"
                ref={isiRef}
                placeholder="Tulis isi catatan..."
                className="resize-none flex-1 min-h-[160px] w-full h-full"
                value={editState?.isi ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, isi: e.target.value } : prev)}
              />
            </div>
            <div className="shrink-0 flex justify-end gap-2 mt-1">
              <Button variant="outline" onClick={() => setEditState(null)}>Batal</Button>
              <Button onClick={handleSave} disabled={isBusy || !editState?.judul.trim() || !editState?.isi.trim()}>
                {isBusy && <span className="mr-1">…</span>} Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
