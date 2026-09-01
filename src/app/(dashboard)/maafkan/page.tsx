"use client"

import { Fragment, useMemo, useState } from "react"
import { format } from "date-fns"
import { Shield, Trash2, Plus, Pencil, Wrench, Hash, Copy, CheckCircle2, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useMaafkanAll, useUpsertMaafkan, useUpdateMaafkan, useDeleteMaafkan } from "@/hooks/useMaafkan"
import { useRealtime } from "@/hooks/useRealtime"

const TABLE_BORDER = "border-slate-900"

interface MaafkanEntry {
  id: string
  user_id: string
  kejadian: string
  status: string
  created_at: string
  updated_at: string
}

interface EditState {
  id: string | null // null = tambah baru
  kejadian: string
  status: string
}

export default function MaafkanPage() {
  const { data: logs = [], isLoading, error } = useMaafkanAll()
  useRealtime({ table: "maafkan", queryKeys: [["maafkan", "all"]] })

  const upsertMaafkan = useUpsertMaafkan()
  const updateMaafkan = useUpdateMaafkan()
  const deleteMaafkan = useDeleteMaafkan()

  const [editState, setEditState] = useState<EditState | null>(null)

  const entries = useMemo(() => {
    return [...(logs as MaafkanEntry[])].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || ""))
  }, [logs])

  const openAdd = () => setEditState({ id: null, kejadian: "", status: "belum" })
  const openEdit = (e: MaafkanEntry) => setEditState({ id: e.id, kejadian: e.kejadian, status: e.status })

  const handleSave = async () => {
    if (!editState) return
    if (!editState.kejadian.trim()) return
    if (editState.id) {
      await updateMaafkan.mutateAsync({
        id: editState.id,
        data: { kejadian: editState.kejadian.trim(), status: editState.status },
      })
    } else {
      await upsertMaafkan.mutateAsync({
        kejadian: editState.kejadian.trim(),
        status: editState.status,
      })
    }
    setEditState(null)
  }

  const handleToggleStatus = async (e: MaafkanEntry) => {
    await updateMaafkan.mutateAsync({ id: e.id, data: { status: e.status === "sudah" ? "belum" : "sudah" } })
  }

  const handleDeleteEntry = async (id: string) => {
    await deleteMaafkan.mutateAsync(id)
  }

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const handleCopy = async (entry: MaafkanEntry) => {
    try {
      await navigator.clipboard.writeText(entry.kejadian)
      setCopiedId(entry.id)
      setTimeout(() => setCopiedId(prev => (prev === entry.id ? null : prev)), 1500)
    } catch { /* clipboard tidak tersedia */ }
  }

  const handleDelete = async () => {
    if (!editState?.id) return
    await deleteMaafkan.mutateAsync(editState.id)
    setEditState(null)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">

      {/* Tabel: No | Kejadian | Status | Aksi */}
      <div className={cn("relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] landscape:max-lg:max-h-none rounded-lg border bg-white", TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className={cn("hidden sm:table-header-group sticky top-0 z-20 bg-white")}>
            <tr className={cn("border-b", TABLE_BORDER)}>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[50px] sm:min-w-[70px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Hash className="h-3.5 w-3.5 text-purple-500" />No</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[240px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Shield className="h-3.5 w-3.5 text-purple-500" />Kejadian</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[100px] sm:min-w-[140px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-purple-500" />Status</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[120px] sm:min-w-[160px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wrench className="h-3.5 w-3.5 text-purple-500" />Aksi</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-400 text-sm">Belum ada kejadian yang ingin dimaafkan.</td>
              </tr>
            ) : (
              entries.map((entry, rowIdx) => {
                const done = entry.status === "sudah"
                return (
                  <Fragment key={entry.id}>
                    {/* Mobile: kartu ringkas */}
                    <tr className={cn("sm:hidden border-b", TABLE_BORDER, rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                      <td colSpan={4} className={cn("px-3 py-3", TABLE_BORDER)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800 whitespace-normal break-words leading-snug">{entry.kejadian}</p>
                            <button
                              onClick={() => handleToggleStatus(entry)}
                              className={cn("mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium", done ? "text-emerald-600" : "text-slate-400")}
                            >
                              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                              {done ? "Sudah dimaafkan" : "Belum"}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" aria-label="Salin teks" onClick={() => handleCopy(entry)}
                              className={cn("h-6 w-6 p-0 text-white", copiedId === entry.id ? "bg-green-600 hover:bg-green-600" : "bg-slate-500 hover:bg-slate-600")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button size="icon" aria-label="Edit" onClick={() => openEdit(entry)}
                              className="h-6 w-6 p-0 bg-slate-600 hover:bg-slate-700 text-white"><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" aria-label="Hapus" onClick={() => handleDeleteEntry(entry.id)}
                              className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white"><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* Desktop: tabel penuh */}
                    <tr key={entry.id} className={cn("hidden sm:table-row border-b transition-colors", TABLE_BORDER, rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30", "hover:bg-blue-50/40")}>
                      <td className={cn("px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums", TABLE_BORDER)}>{rowIdx + 1}</td>
                      <td className={cn("px-2 sm:px-3 py-2 border-r", TABLE_BORDER)}>
                        <span className="text-slate-800 whitespace-normal break-words leading-snug">{entry.kejadian}</span>
                      </td>
                      <td className={cn("px-2 sm:px-3 py-2 border-r", TABLE_BORDER)}>
                        <button
                          onClick={() => handleToggleStatus(entry)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                            done ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                          )}
                        >
                          {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                          {done ? "Sudah" : "Belum"}
                        </button>
                      </td>
                      <td className={cn("px-2 sm:px-3 py-2", TABLE_BORDER)}>
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <Button size="sm" aria-label="Salin teks" onClick={() => handleCopy(entry)}
                            className={cn("h-6 gap-1 text-white text-[11px] px-1.5", copiedId === entry.id ? "bg-green-600 hover:bg-green-600" : "bg-slate-500 hover:bg-slate-600")}>
                            <Copy className="h-3 w-3" /> {copiedId === entry.id ? "Tersalin" : "Salin"}
                          </Button>
                          <Button size="sm" aria-label="Edit" onClick={() => openEdit(entry)}
                            className="h-6 gap-1 bg-slate-600 hover:bg-slate-700 text-white text-[11px] px-1.5"><Pencil className="h-3 w-3" /> Edit</Button>
                          <Button size="sm" aria-label="Hapus" onClick={() => handleDeleteEntry(entry.id)}
                            className="h-6 gap-1 bg-red-600 hover:bg-red-700 text-white text-[11px] px-1.5"><Trash2 className="h-3 w-3" /> Hapus</Button>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Tombol tambah floating */}
      <Button
        onClick={openAdd}
        size="icon"
        aria-label="Tambah Kejadian Maafkan"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialog tambah/edit */}
      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editState?.id ? "Edit Kejadian" : "Tambah Kejadian Maafkan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="maafkan-kejadian">Kejadian (event trigger)</Label>
              <Textarea
                id="maafkan-kejadian"
                placeholder="Tulis event/trigger yang ingin kamu maafkan..."
                value={editState?.kejadian ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, kejadian: e.target.value } : prev)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="flex gap-2">
                {(["belum", "sudah"] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditState(prev => prev ? { ...prev, status: s } : prev)}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-sm font-medium border transition-colors",
                      editState?.status === s
                        ? s === "sudah" ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {s === "sudah" ? "Sudah dimaafkan" : "Belum"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div>
                {editState?.id && (
                  <Button variant="ghost" onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 mr-1.5" /> Hapus
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditState(null)}>Batal</Button>
                <Button onClick={handleSave} disabled={!editState?.kejadian.trim()}>Simpan</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
