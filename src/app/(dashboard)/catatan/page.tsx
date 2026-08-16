"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useCatatanAll, useCreateCatatan, useUpdateCatatan, useDeleteCatatan } from "@/hooks/useCatatan"
import { useRealtime } from "@/hooks/useRealtime"

type CatatanWarna = "yellow" | "green" | "blue" | "pink" | "orange"

const NOTE_COLORS: Record<CatatanWarna, { card: string; bar: string; text: string }> = {
  yellow: { card: "bg-amber-50 border-amber-200", bar: "bg-amber-400", text: "text-amber-900" },
  green: { card: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-400", text: "text-emerald-900" },
  blue: { card: "bg-sky-50 border-sky-200", bar: "bg-sky-400", text: "text-sky-900" },
  pink: { card: "bg-pink-50 border-pink-200", bar: "bg-pink-400", text: "text-pink-900" },
  orange: { card: "bg-orange-50 border-orange-200", bar: "bg-orange-400", text: "text-orange-900" },
}

const WARNA_OPTIONS: { value: CatatanWarna; label: string }[] = [
  { value: "yellow", label: "Kuning" },
  { value: "green", label: "Hijau" },
  { value: "blue", label: "Biru" },
  { value: "pink", label: "Pink" },
  { value: "orange", label: "Orange" },
]

interface EditState {
  id: string | null
  judul: string
  isi: string
  warna: CatatanWarna
}

export default function CatatanPage() {
  const { data: notes = [], isLoading } = useCatatanAll()
  useRealtime({ table: "catatan", queryKeys: [["catatan"]] })

  const createCatatan = useCreateCatatan()
  const updateCatatan = useUpdateCatatan()
  const deleteCatatan = useDeleteCatatan()

  const [editState, setEditState] = useState<EditState | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const openAdd = () => setEditState({ id: null, judul: "", isi: "", warna: "yellow" })
  const openEdit = (n: any) =>
    setEditState({ id: n.id, judul: n.judul, isi: n.isi, warna: n.warna as CatatanWarna })

  const handleSave = async () => {
    if (!editState) return
    if (!editState.judul.trim() || !editState.isi.trim()) return
    setIsBusy(true)
    try {
      if (editState.id) {
        await updateCatatan.mutateAsync({
          id: editState.id,
          data: { judul: editState.judul.trim(), isi: editState.isi.trim(), warna: editState.warna },
        })
      } else {
        await createCatatan.mutateAsync({
          judul: editState.judul.trim(),
          isi: editState.isi.trim(),
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <StickyNote className="h-4 w-4 text-purple-600" /> Catatan
        </div>
        <Button size="sm" variant="outline" onClick={openAdd} className="h-7 gap-1 text-[11px] px-2">
          <Plus className="h-3 w-3" /> Tambah Catatan
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Memuat...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">Belum ada catatan. Klik “Tambah Catatan”.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {notes.map((n) => {
            const c = NOTE_COLORS[(n.warna as CatatanWarna) || "yellow"]
            return (
              <div key={n.id} className={cn("rounded-lg border shadow-sm p-3 flex flex-col min-h-[140px]", c.card)}>
                <div className={cn("h-1 w-10 rounded-full mb-2", c.bar)} />
                <p className={cn("text-sm font-bold break-words leading-snug", c.text)}>{n.judul}</p>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap break-words flex-1 leading-snug">{n.isi}</p>
                <div className="flex items-center justify-end gap-1 pt-2 mt-auto">
                  <Button size="icon" aria-label="Edit catatan" onClick={() => openEdit(n)}
                    className="h-6 w-6 p-0 bg-slate-600 hover:bg-slate-700 text-white">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" aria-label="Hapus catatan" onClick={() => handleDelete(n.id)}
                    className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
              <Label htmlFor="catatan-isi">Isi</Label>
              <Textarea
                id="catatan-isi"
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
