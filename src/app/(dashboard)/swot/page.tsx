"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Flag,
  CalendarClock,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  useSwotItems,
  useSwotActions,
  useCreateSwotItem,
  useUpdateSwotItem,
  useDeleteSwotItem,
  useCreateSwotAction,
  useUpdateSwotAction,
  useDeleteSwotAction,
} from "@/hooks/useSwot"
import type { SwotKategori, SwotPrioritas, SwotTren, SwotStatus } from "@/app/actions/swot"

type ItemDraft = {
  kategori: SwotKategori
  judul: string
  prioritas: SwotPrioritas
  tren: SwotTren
  status: SwotStatus
}
type ActionDraft = {
  target: string
  langkah_aksi: string
  deadline: string
  progress: number
}

const KAT: { key: SwotKategori; label: string; accent: string; ring: string; icon: React.ReactNode }[] = [
  { key: "strength", label: "Kekuatan", accent: "bg-emerald-50 border-emerald-200", ring: "text-emerald-700", icon: <TrendingUp className="h-4 w-4" /> },
  { key: "weakness", label: "Kelemahan", accent: "bg-rose-50 border-rose-200", ring: "text-rose-700", icon: <TrendingDown className="h-4 w-4" /> },
  { key: "opportunity", label: "Peluang", accent: "bg-sky-50 border-sky-200", ring: "text-sky-700", icon: <Target className="h-4 w-4" /> },
  { key: "threat", label: "Ancaman", accent: "bg-amber-50 border-amber-200", ring: "text-amber-700", icon: <Flag className="h-4 w-4" /> },
]

const PRIO_LABEL: Record<SwotPrioritas, string> = { rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi" }
const PRIO_CLASS: Record<SwotPrioritas, string> = {
  rendah: "bg-slate-100 text-slate-600 border-slate-200",
  sedang: "bg-orange-100 text-orange-700 border-orange-200",
  tinggi: "bg-red-100 text-red-700 border-red-200",
}
const TREN_ICON: Record<SwotTren, React.ReactNode> = {
  membaik: <TrendingUp className="h-3 w-3" />,
  stagnan: <Minus className="h-3 w-3" />,
  memburuk: <TrendingDown className="h-3 w-3" />,
}
const TREN_LABEL: Record<SwotTren, string> = { membaik: "Membaik", stagnan: "Stagnan", memburuk: "Memburuk" }
const STATUS_LABEL: Record<SwotStatus, string> = { aktif: "Aktif", ditindak: "Ditindak", selesai: "Selesai" }
const STATUS_CLASS: Record<SwotStatus, string> = {
  aktif: "bg-blue-100 text-blue-700 border-blue-200",
  ditindak: "bg-amber-100 text-amber-700 border-amber-200",
  selesai: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

export default function SwotPage() {
  const { data: items = [], isLoading: itemsLoading } = useSwotItems()
  const { data: actions = [], isLoading: actionsLoading } = useSwotActions()

  const createItem = useCreateSwotItem()
  const updateItem = useUpdateSwotItem()
  const deleteItem = useDeleteSwotItem()
  const createAction = useCreateSwotAction()
  const updateAction = useUpdateSwotAction()
  const deleteAction = useDeleteSwotAction()

  // ── dialog item ──
  const [itemDialog, setItemDialog] = useState(false)
  const [itemEditId, setItemEditId] = useState<string | null>(null)
  const [itemKategori, setItemKategori] = useState<SwotKategori>("strength")
  const [itemDraft, setItemDraft] = useState<ItemDraft>({
    kategori: "strength",
    judul: "",
    prioritas: "sedang",
    tren: "stagnan",
    status: "aktif",
  })

  // ── dialog action ──
  const [actDialog, setActDialog] = useState(false)
  const [actEditId, setActEditId] = useState<string | null>(null)
  const [actDraft, setActDraft] = useState<ActionDraft>({ target: "", langkah_aksi: "", deadline: "", progress: 0 })

  const counts = useMemo(() => {
    const c: Record<SwotKategori, number> = { strength: 0, weakness: 0, opportunity: 0, threat: 0 }
    items.forEach((it) => { c[it.kategori]++ })
    return c
  }, [items])

  const openAddItem = (kat: SwotKategori) => {
    setItemEditId(null)
    setItemKategori(kat)
    setItemDraft({ kategori: kat, judul: "", prioritas: "sedang", tren: "stagnan", status: "aktif" })
    setItemDialog(true)
  }
  const openEditItem = (it: any) => {
    setItemEditId(it.id)
    setItemKategori(it.kategori)
    setItemDraft({ kategori: it.kategori, judul: it.judul, prioritas: it.prioritas, tren: it.tren, status: it.status })
    setItemDialog(true)
  }
  const saveItem = async () => {
    if (!itemDraft.judul.trim()) return
    if (itemEditId) {
      await updateItem.mutateAsync({ id: itemEditId, data: itemDraft })
    } else {
      await createItem.mutateAsync({ ...itemDraft, kategori: itemKategori })
    }
    setItemDialog(false)
  }
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Hapus item SWOT ini?")) return
    await deleteItem.mutateAsync(id)
  }

  const openAddAction = () => {
    setActEditId(null)
    setActDraft({ target: "", langkah_aksi: "", deadline: "", progress: 0 })
    setActDialog(true)
  }
  const openEditAction = (a: any) => {
    setActEditId(a.id)
    setActDraft({ target: a.target, langkah_aksi: a.langkah_aksi || "", deadline: a.deadline || "", progress: a.progress || 0 })
    setActDialog(true)
  }
  const saveAction = async () => {
    if (!actDraft.target.trim()) return
    if (actEditId) {
      await updateAction.mutateAsync({ id: actEditId, data: actDraft })
    } else {
      await createAction.mutateAsync(actDraft)
    }
    setActDialog(false)
  }
  const handleDeleteAction = async (id: string) => {
    if (!confirm("Hapus action plan ini?")) return
    await deleteAction.mutateAsync(id)
  }

  const isBusy = createItem.isPending || updateItem.isPending || deleteItem.isPending || createAction.isPending || updateAction.isPending || deleteAction.isPending

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">

      {/* Header: ringkasan jumlah di sebelah kanan */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {KAT.map((k) => (
          <div key={k.key} className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5", k.accent)}>
            <span className={cn("flex items-center gap-1 text-[11px] font-semibold", k.ring)}>
              {k.icon} {k.label}
            </span>
            <span className={cn("text-base font-bold tabular-nums", k.ring)}>{counts[k.key]}</span>
          </div>
        ))}
      </div>

      {/* 4 Grid kategori */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {KAT.map((k) => {
          const list = items.filter((it) => it.kategori === k.key)
          return (
            <div key={k.key} className={cn("rounded-xl border p-3", k.accent)}>
              <div className="flex items-center justify-between mb-2">
                <div className={cn("flex items-center gap-1.5 text-sm font-bold", k.ring)}>
                  {k.icon} {k.label}
                </div>
                <Button size="sm" variant="outline" onClick={() => openAddItem(k.key)}
                  className="h-6 gap-1 text-[11px] px-2">
                  <Plus className="h-3 w-3" /> Tambah Item
                </Button>
              </div>
              {itemsLoading ? (
                <p className="text-xs text-slate-400 py-2">Memuat…</p>
              ) : list.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Belum ada item. Klik “Tambah Item”.</p>
              ) : (
                <div className="space-y-2">
                  {list.map((it) => (
                    <div key={it.id} className="rounded-lg bg-white/70 border border-white/60 p-2.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 break-words flex-1">{it.judul}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => openEditItem(it)}
                            className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" aria-label="Hapus" onClick={() => handleDeleteItem(it.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("text-[10px] border rounded px-1.5 py-0.5", PRIO_CLASS[it.prioritas])}>
                          {PRIO_LABEL[it.prioritas]}
                        </span>
                        <span className={cn("text-[10px] border rounded px-1.5 py-0.5 flex items-center gap-1", k.ring)}>
                          {TREN_ICON[it.tren]} {TREN_LABEL[it.tren]}
                        </span>
                        <span className={cn("text-[10px] border rounded px-1.5 py-0.5", STATUS_CLASS[it.status])}>
                          {STATUS_LABEL[it.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Prioritas & Action Plan */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
            <Target className="h-4 w-4 text-primary" /> Prioritas &amp; Action Plan
          </div>
          <Button size="sm" variant="outline" onClick={openAddAction}
            className="h-6 gap-1 text-[11px] px-2">
            <Plus className="h-3 w-3" /> Tambah Action
          </Button>
        </div>
        {actionsLoading ? (
          <p className="text-xs text-slate-400 py-2">Memuat…</p>
        ) : actions.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">Belum ada action plan. Ubah hasil SWOT jadi tindakan nyata.</p>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 p-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 break-words flex-1">{a.target}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" aria-label="Edit" onClick={() => openEditAction(a)}
                      className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Hapus" onClick={() => handleDeleteAction(a.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {a.langkah_aksi && (
                  <p className="text-xs text-slate-600 break-words">{a.langkah_aksi}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  {a.deadline && (
                    <span className="inline-flex items-center gap-1 border border-slate-200 rounded px-1.5 py-0.5">
                      <CalendarClock className="h-3 w-3" /> {format(new Date(a.deadline + "T00:00:00"), "d MMM yyyy", { locale: id })}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 border border-slate-200 rounded px-1.5 py-0.5 tabular-nums">
                    Progress: {a.progress}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200/70 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${a.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Item */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{itemEditId ? "Edit Item SWOT" : `Tambah Item — ${KAT.find((k) => k.key === itemKategori)?.label}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {itemEditId && (
            <div className="space-y-1">
              <Label>Kategori</Label>
              <select value={itemDraft.kategori} onChange={(e) => setItemDraft({ ...itemDraft, kategori: e.target.value as SwotKategori })}
                className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-2">
                {KAT.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
            </div>
            )}
            <div className="space-y-1">
              <Label>Judul</Label>
              <Textarea value={itemDraft.judul} onChange={(e) => setItemDraft({ ...itemDraft, judul: e.target.value })} placeholder="Mis: Disiplin bangun pagi" rows={5} className="resize-y min-h-[120px]" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setItemDialog(false)}>Batal</Button>
              <Button onClick={saveItem} disabled={isBusy || !itemDraft.judul.trim()}>
                {isBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Action */}
      <Dialog open={actDialog} onOpenChange={setActDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actEditId ? "Edit Action Plan" : "Tambah Action Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Target</Label>
              <Input value={actDraft.target} onChange={(e) => setActDraft({ ...actDraft, target: e.target.value })} placeholder="Mis: Bangun 05.00 selama 30 hari" />
            </div>
            <div className="space-y-1">
              <Label>Langkah Aksi</Label>
              <Textarea value={actDraft.langkah_aksi} onChange={(e) => setActDraft({ ...actDraft, langkah_aksi: e.target.value })} placeholder="Langkah konkret..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Deadline</Label>
                <Input type="date" value={actDraft.deadline} onChange={(e) => setActDraft({ ...actDraft, deadline: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Progress ({actDraft.progress}%)</Label>
                <Input type="range" min={0} max={100} step={5} value={actDraft.progress}
                  onChange={(e) => setActDraft({ ...actDraft, progress: Number(e.target.value) })} className="mt-2 w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setActDialog(false)}>Batal</Button>
              <Button onClick={saveAction} disabled={isBusy || !actDraft.target.trim()}>
                {isBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
