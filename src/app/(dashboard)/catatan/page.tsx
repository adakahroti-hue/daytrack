"use client"

import { useState, useRef } from "react"
import { Plus, Pencil, Trash2, StickyNote, List, ListOrdered } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useCatatanAll, useCreateCatatan, useUpdateCatatan, useDeleteCatatan } from "@/hooks/useCatatan"
import { useRealtime } from "@/hooks/useRealtime"
import { useIsDesktop } from "@/hooks/useMediaQuery"

type CatatanWarna = "yellow" | "green" | "blue" | "pink" | "orange"

const NOTE_COLORS: Record<CatatanWarna, { card: string; bar: string; text: string; badge: string }> = {
  yellow: { card: "bg-amber-50 border-amber-200", bar: "bg-amber-400", text: "text-amber-900", badge: "bg-amber-400 text-amber-950" },
  green: { card: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-400", text: "text-emerald-900", badge: "bg-emerald-400 text-emerald-950" },
  blue: { card: "bg-sky-50 border-sky-200", bar: "bg-sky-400", text: "text-sky-900", badge: "bg-sky-400 text-sky-950" },
  pink: { card: "bg-pink-50 border-pink-200", bar: "bg-pink-400", text: "text-pink-900", badge: "bg-pink-400 text-pink-950" },
  orange: { card: "bg-orange-50 border-orange-200", bar: "bg-orange-400", text: "text-orange-900", badge: "bg-orange-400 text-orange-950" },
}

const WARNA_OPTIONS: { value: CatatanWarna; label: string }[] = [
  { value: "yellow", label: "Kuning" },
  { value: "green", label: "Hijau" },
  { value: "blue", label: "Biru" },
  { value: "pink", label: "Pink" },
  { value: "orange", label: "Orange" },
]

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
            {ln || " "}
          </div>
        )
      })}
    </div>
  )
}

interface EditState {
  id: string | null
  judul: string
  isi: string
  label: string
  warna: CatatanWarna
}

interface ViewState {
  id: string
  judul: string
  isi: string
  label: string
  warna: CatatanWarna
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
  const isiRef = useRef<HTMLTextAreaElement>(null)
  const isDesktop = useIsDesktop()

  // Kategori unik (label) dari seluruh catatan
  const categories = Array.from(
    new Set((notes as any[]).map((n) => (n.label || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b))

  // Filter catatan berdasarkan kategori
  const filteredNotes = (notes as any[]).filter((n) => {
    const lab = (n.label || "").trim()
    if (filterKat === "semua") return true
    if (filterKat === "lainnya") return lab === ""
    return lab === filterKat
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

  const openAdd = () => setEditState({ id: null, judul: "", isi: "", label: "", warna: "yellow" })
  const openEdit = (n: any) =>
    setEditState({ id: n.id, judul: n.judul, isi: n.isi, label: n.label ?? "", warna: n.warna as CatatanWarna })

  const openView = (n: any) =>
    setViewState({ id: n.id, judul: n.judul, isi: n.isi, label: n.label ?? "", warna: n.warna as CatatanWarna })

  const handleSave = async () => {
    if (!editState) return
    if (!editState.judul.trim() || !editState.isi.trim()) return
    setIsBusy(true)
    try {
      if (editState.id) {
        await updateCatatan.mutateAsync({
          id: editState.id,
          data: { judul: editState.judul.trim(), isi: editState.isi.trim(), label: editState.label.trim(), warna: editState.warna },
        })
      } else {
        await createCatatan.mutateAsync({
          judul: editState.judul.trim(),
          isi: editState.isi.trim(),
          label: editState.label.trim(),
          warna: editState.warna,
        })
      }
      setEditState(null)
    } finally {
      setIsBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan ini?")) return
    await deleteCatatan.mutateAsync(id)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 shrink-0">
          <StickyNote className="h-4 w-4 text-purple-600" /> Catatan
        </div>

        {notes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => { setFilterKat("semua"); setShowAll(false) }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                filterKat === "semua"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => { setFilterKat(cat); setShowAll(false) }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  filterKat === cat
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setFilterKat("lainnya"); setShowAll(false) }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                filterKat === "lainnya"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              Lainnya
            </button>
          </div>
        )}

        <Button size="sm" variant="outline" onClick={openAdd} className="h-7 gap-1 text-[11px] px-2 shrink-0">
          <Plus className="h-3 w-3" /> Tambah Catatan
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Memuat...</p>
      ) : filteredNotes.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          {notes.length === 0 ? "Belum ada catatan. Klik “Tambah Catatan”." : "Tidak ada catatan pada kategori ini."}
        </p>
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visibleNotes.map((n) => {
            const c = NOTE_COLORS[(n.warna as CatatanWarna) || "yellow"]
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
                  <p className={cn("text-base font-bold break-words leading-snug", c.text)}>{n.judul}</p>
                  {n.label && (
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", c.badge)}>
                      {n.label}
                    </span>
                  )}
                </div>
                <NoteLines text={isiPreview} className={cn("mt-1 text-sm leading-snug flex-1", c.text)} />
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
                  <Button size="icon" aria-label="Edit catatan" onClick={(e) => { e.stopPropagation(); openEdit(n) }}
                    className={cn("h-6 w-6 p-0", isDesktop ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "text-slate-500 hover:text-slate-700")}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" aria-label="Hapus catatan" onClick={(e) => { e.stopPropagation(); handleDelete(n.id) }}
                    className={cn("h-6 w-6 p-0", isDesktop ? "bg-rose-100 text-rose-600 hover:bg-rose-200" : "text-rose-500 hover:text-rose-600")}>
                    <Trash2 className="h-3 w-3" />
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
        <DialogContent className="max-w-[92vw] sm:max-w-lg lg:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewState && (
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", NOTE_COLORS[(viewState.warna as CatatanWarna) || "yellow"].bar)} />
              )}
              {viewState?.judul}
              {viewState?.label && (
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", NOTE_COLORS[(viewState.warna as CatatanWarna) || "yellow"].badge)}>
                  {viewState.label}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <NoteLines text={viewState?.isi ?? ""} className="text-sm leading-snug max-h-[60vh] overflow-y-auto text-slate-700" />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setViewState(null)}>Tutup</Button>
            <Button onClick={() => {
              const v = viewState
              setViewState(null)
              if (v) openEdit({ id: v.id, judul: v.judul, isi: v.isi, label: v.label, warna: v.warna })
            }}>Edit</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-lg lg:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editState?.id ? "Edit Catatan" : "Tambah Catatan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="catatan-judul">Judul</Label>
              <Input
                id="catatan-judul"
                placeholder="Judul catatan"
                value={editState?.judul ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, judul: e.target.value } : prev)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catatan-label">Label / Kategori</Label>
              <Input
                id="catatan-label"
                placeholder="mis. Ide, Belajar, Penting"
                maxLength={50}
                value={editState?.label ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, label: e.target.value } : prev)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catatan-isi">Isi</Label>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Button type="button" variant="outline" size="sm" onClick={() => insertPrefix("bullet")}
                  className="h-7 gap-1 text-[11px] px-2" aria-label="Tambah bullet">
                  <List className="h-3.5 w-3.5" /> Bullet
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => insertPrefix("number")}
                  className="h-7 gap-1 text-[11px] px-2" aria-label="Tambah nomor">
                  <ListOrdered className="h-3.5 w-3.5" /> Number
                </Button>
              </div>
              <Textarea
                id="catatan-isi"
                ref={isiRef}
                placeholder="Tulis isi catatan..."
                rows={10}
                className="resize-y min-h-[220px]"
                value={editState?.isi ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, isi: e.target.value } : prev)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Warna</Label>
              <div className="grid grid-cols-5 gap-2">
                {WARNA_OPTIONS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setEditState(prev => prev ? { ...prev, warna: opt.value } : prev)}
                    className={cn("rounded-lg border px-1 py-2 text-[11px] font-medium",
                      editState?.warna === opt.value
                        ? "bg-purple-100 text-purple-700 border-purple-300"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
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
