"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Target,
  Flag,
  FolderKanban,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  useSwotTopics,
  useSwotItems,
  useCreateSwotTopic,
  useRenameSwotTopic,
  useDeleteSwotTopic,
} from "@/hooks/useSwot"
import type { SwotKategori } from "@/app/actions/swot"

const KAT_META: { key: SwotKategori; label: string; icon: React.ReactNode; tint: string }[] = [
  { key: "strength", label: "Kekuatan", icon: <TrendingUp className="h-4 w-4" />, tint: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { key: "weakness", label: "Kelemahan", icon: <TrendingDown className="h-4 w-4" />, tint: "text-rose-700 bg-rose-50 border-rose-200" },
  { key: "opportunity", label: "Peluang", icon: <Target className="h-4 w-4" />, tint: "text-sky-700 bg-sky-50 border-sky-200" },
  { key: "threat", label: "Ancaman", icon: <Flag className="h-4 w-4" />, tint: "text-amber-700 bg-amber-50 border-amber-200" },
]

export default function SwotWorkspacePage() {
  const { data: topics = [], isLoading: topicsLoading } = useSwotTopics()
  const { data: items = [], isLoading: itemsLoading } = useSwotItems()

  const createTopic = useCreateSwotTopic()
  const renameTopic = useRenameSwotTopic()
  const deleteTopic = useDeleteSwotTopic()

  const [dialog, setDialog] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")

  const countsByTopic = useMemo(() => {
    const map: Record<string, Record<SwotKategori, number>> = {}
    ;(items as any[]).forEach((it) => {
      const t = it.topic_id
      if (!map[t]) map[t] = { strength: 0, weakness: 0, opportunity: 0, threat: 0, so: 0, wo: 0, st: 0, wt: 0 }
      if (map[t][it.kategori as SwotKategori] != null) map[t][it.kategori as SwotKategori]++
    })
    return map
  }, [items])

  const openAdd = () => {
    setEditId(null)
    setDraft("")
    setDialog(true)
  }
  const openRename = (t: any) => {
    setEditId(t.id)
    setDraft(t.judul)
    setDialog(true)
  }
  const save = async () => {
    if (!draft.trim()) return
    if (editId) await renameTopic.mutateAsync({ id: editId, judul: draft.trim() })
    else await createTopic.mutateAsync(draft.trim())
    setDialog(false)
  }
  const handleDelete = async (id: string) => {
    if (!confirm("Hapus analisis SWOT ini beserta semua poin di dalamnya?")) return
    await deleteTopic.mutateAsync(id)
  }

  const isBusy = createTopic.isPending || renameTopic.isPending || deleteTopic.isPending

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <FolderKanban className="h-4 w-4 text-purple-600" /> Semua Analisis SWOT
        </div>
        <Button size="sm" variant="outline" onClick={openAdd} className="h-7 gap-1 text-[11px] px-2">
          <Plus className="h-3 w-3" /> Buat Analisis SWOT
        </Button>
      </div>

      {topicsLoading || itemsLoading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Memuat...</p>
      ) : topics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-sm text-slate-500 mb-3">Belum ada analisis SWOT. Buat analisis pertama kamu.</p>
          <Button size="sm" onClick={openAdd} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Buat Analisis SWOT
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topics.map((t: any) => {
            const counts = countsByTopic[t.id] || { strength: 0, weakness: 0, opportunity: 0, threat: 0 }
            const total = counts.strength + counts.weakness + counts.opportunity + counts.threat
            return (
              <div key={t.id} className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/swot/${t.id}`} className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-800 break-words leading-snug">{t.judul}</h3>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => openRename(t)} aria-label="Ganti nama"
                      className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(t.id)} aria-label="Hapus"
                      className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mt-1 text-[11px] text-slate-400">
                  Diperbarui {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true, locale: id })}
                </p>

                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {KAT_META.map((k) => (
                    <div key={k.key} className={`flex flex-col items-center justify-center rounded-lg border px-1 py-2 ${k.tint}`}>
                      {k.icon}
                      <span className="text-sm font-bold tabular-nums mt-0.5">{counts[k.key]}</span>
                      <span className="text-[9px] leading-none mt-0.5">{k.label}</span>
                    </div>
                  ))}
                </div>

                <Link href={`/swot/${t.id}`}
                  className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">
                  Buka Analisis <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Ganti Nama Analisis" : "Buat Analisis SWOT Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Analisis</Label>
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Mis: Karier IT, Pengembangan Diri, Bisnis"
                onKeyDown={(e) => { if (e.key === "Enter") save() }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
              <Button onClick={save} disabled={isBusy || !draft.trim()}>
                {isBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} {editId ? "Simpan" : "Buat"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
