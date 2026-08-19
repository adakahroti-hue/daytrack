"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
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
  ArrowLeft,
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
  useUpdateSwotTopicCombos,
  useSwotTopics,
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
  { key: "strength", label: "Kekuatan", accent: "border-slate-200", ring: "text-emerald-700", icon: <TrendingUp className="h-4 w-4" /> },
  { key: "weakness", label: "Kelemahan", accent: "border-slate-200", ring: "text-rose-700", icon: <TrendingDown className="h-4 w-4" /> },
  { key: "opportunity", label: "Peluang", accent: "border-slate-200", ring: "text-sky-700", icon: <Target className="h-4 w-4" /> },
  { key: "threat", label: "Ancaman", accent: "border-slate-200", ring: "text-amber-700", icon: <Flag className="h-4 w-4" /> },
  { key: "so", label: "Strategi SO", accent: "border-slate-200", ring: "text-emerald-700", icon: <TrendingUp className="h-4 w-4" /> },
  { key: "wo", label: "Strategi WO", accent: "border-slate-200", ring: "text-rose-700", icon: <TrendingDown className="h-4 w-4" /> },
  { key: "st", label: "Strategi ST", accent: "border-slate-200", ring: "text-amber-700", icon: <Flag className="h-4 w-4" /> },
  { key: "wt", label: "Strategi WT", accent: "border-slate-200", ring: "text-slate-700", icon: <Flag className="h-4 w-4" /> },
]

const GROUPS: { key: string; label: string; sub: string; kats: SwotKategori[]; cols?: string; span?: string }[] = [
  { key: "internal", label: "Internal", sub: "Dari dalam diri", kats: ["strength", "weakness"] },
  { key: "eksternal", label: "Eksternal", sub: "Dari luar", kats: ["opportunity", "threat"] },
  { key: "combo", label: "Strategi Kombinasi", sub: "SO . WO . ST . WT", kats: ["so", "wo", "st", "wt"], cols: "grid-cols-2", span: "md:col-span-2" },
]
const KAT_BY_KEY = Object.fromEntries(KAT.map((k) => [k.key, k])) as Record<SwotKategori, (typeof KAT)[number]>

const RADIO_RING: Record<SwotKategori, string> = {
  strength: "border-emerald-500",
  weakness: "border-rose-500",
  opportunity: "border-sky-500",
  threat: "border-amber-500",
  so: "border-emerald-500",
  wo: "border-rose-500",
  st: "border-amber-500",
  wt: "border-slate-500",
}
const RADIO_DOT: Record<SwotKategori, string> = {
  strength: "bg-emerald-500",
  weakness: "bg-rose-500",
  opportunity: "bg-sky-500",
  threat: "bg-amber-500",
  so: "bg-emerald-500",
  wo: "bg-rose-500",
  st: "bg-amber-500",
  wt: "bg-slate-500",
}

const COMBO_SUBTITLE: Record<string, string> = {
  so: "Kekuatan × Peluang",
  wo: "Kelemahan × Peluang",
  st: "Kekuatan × Ancaman",
  wt: "Kelemahan × Ancaman",
}

export default function SwotDetailPage() {
  const params = useParams<{ id: string }>()
  const topicId = params.id as string

  const { data: topics = [], isLoading: topicsLoading } = useSwotTopics()
  const { data: items = [], isLoading: itemsLoading } = useSwotItems()
  const { data: actions = [], isLoading: actionsLoading } = useSwotActions(topicId)

  const createItem = useCreateSwotItem()
  const updateItem = useUpdateSwotItem()
  const deleteItem = useDeleteSwotItem()
  const createAction = useCreateSwotAction()
  const updateAction = useUpdateSwotAction()
  const deleteAction = useDeleteSwotAction()

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

  const [actDialog, setActDialog] = useState(false)
  const [actEditId, setActEditId] = useState<string | null>(null)
  const [actDraft, setActDraft] = useState<ActionDraft>({ target: "", langkah_aksi: "", deadline: "", progress: 0 })

  // Hanya item milik analisis ini
  const scopedItems = useMemo(
    () => (items as any[]).filter((it) => it.topic_id === topicId),
    [items, topicId]
  )
  const scopedActions = useMemo(
    () => (actions as any[]).filter((a) => (a.topic_id ?? null) === topicId),
    [actions, topicId]
  )

  const comboTopic = useMemo(
    () => (topics as any[]).find((t) => t.id === topicId) || null,
    [topics, topicId]
  )

  const counts = useMemo(() => {
    const c: Record<SwotKategori, number> = { strength: 0, weakness: 0, opportunity: 0, threat: 0, so: 0, wo: 0, st: 0, wt: 0 }
    scopedItems.forEach((it) => { c[it.kategori as SwotKategori]++ })
    return c
  }, [scopedItems])

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
      await createItem.mutateAsync({ topic_id: topicId, ...itemDraft, kategori: itemKategori })
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
      await createAction.mutateAsync({ topic_id: topicId, ...actDraft })
    }
    setActDialog(false)
  }
  const handleDeleteAction = async (id: string) => {
    if (!confirm("Hapus action plan ini?")) return
    await deleteAction.mutateAsync(id)
  }

  const isBusy = createItem.isPending || updateItem.isPending || deleteItem.isPending || createAction.isPending || updateAction.isPending || deleteAction.isPending

  // Edit inline Kombinasi Logika (SO/WO/ST/WT) untuk analisis ini
  const updateCombos = useUpdateSwotTopicCombos()
  const [comboEdit, setComboEdit] = useState<"so_note" | "wo_note" | "st_note" | "wt_note" | null>(null)
  const [comboText, setComboText] = useState("")
  const openCombo = (key: "so_note" | "wo_note" | "st_note" | "wt_note", val: string | null) => {
    setComboEdit(key)
    setComboText(val || "")
  }
  const saveCombo = async () => {
    if (!comboEdit) return
    await updateCombos.mutateAsync({ id: topicId, data: { [comboEdit]: comboText.trim() } })
    setComboEdit(null)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {/* Tombol kembali */}
      <Link href="/swot" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Semua Analisis SWOT
      </Link>

      {/* Grid kategori — 2 kolom vertikal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {GROUPS.map((g) => (
          <div key={g.key} className={cn("rounded-2xl border border-slate-300 bg-slate-50/60 p-3", g.span)}>
            <div className="flex items-baseline gap-2 px-1 pb-2.5">
              <h2 className="text-sm font-bold text-slate-800">{g.label}</h2>
              <span className="text-[11px] text-slate-400">{g.sub}</span>
            </div>
            <div className={g.cols ? cn("grid gap-3", g.cols) : "space-y-3"}>
              {g.kats.map((katKey) => {
                const k = KAT_BY_KEY[katKey]
                const isCombo = ["so", "wo", "st", "wt"].includes(katKey)
                const list = scopedItems.filter((it) => it.kategori === k.key)
                return (
                  <div key={k.key} className={cn("rounded-xl border p-3 bg-white", k.accent)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn("flex items-center gap-1.5 text-sm font-bold", k.ring)}>
                        {k.icon} {k.label}
                        {isCombo && (
                          <span className="text-[10px] font-medium opacity-60">{COMBO_SUBTITLE[katKey]}</span>
                        )}
                        {isCombo && (
                          <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 tabular-nums">{list.length}</span>
                        )}
                      </div>
                      <Button size="icon" variant="outline" aria-label="Tambah Item" onClick={() => openAddItem(k.key)}
                        className="h-6 w-6 p-0">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {itemsLoading ? (
                      <p className="text-xs text-slate-400 py-2">Memuat...</p>
                    ) : list.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">Belum ada item. Klik “Tambah Item”.</p>
                    ) : (
                      <div className="space-y-2">
                        {list.map((it) => (
                          <div key={it.id} className="py-1.5 pl-4 flex items-start gap-2.5">
                            <span className={cn("mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center", RADIO_RING[k.key])} aria-hidden="true">
                              <span className={cn("h-1.5 w-1.5 rounded-full", RADIO_DOT[k.key])} />
                            </span>
                            <div className="flex-1 min-w-0">
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
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
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
          <p className="text-xs text-slate-400 py-2">Memuat...</p>
        ) : scopedActions.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">Belum ada action plan. Ubah hasil SWOT jadi tindakan nyata.</p>
        ) : (
          <div className="space-y-2">
            {scopedActions.map((a: any) => (
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
