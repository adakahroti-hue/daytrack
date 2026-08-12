"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState } from "react"
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns"
import { Target, Wallet, Banknote, Wrench, Pencil, Trash2, Plus, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatRupiah, parseRupiah } from "@/lib/utils"
import { useTableLock } from "@/components/ui/table-lock"
import { useGoalRange, useCreateGoal, useDeleteGoal, useUpdateGoal } from "@/hooks/useGoal"
import { useRealtime } from "@/hooks/useRealtime"
import { useHeaderControls } from "@/components/layout/HeaderControls"

const TABLE_BORDER = "border-slate-900"

interface GoalEntry {
  id: string
  user_id: string
  tanggal_set: string
  tanggal_deadline: string
  nama_goal: string
  proyeksi_harga: number
  action_harian: string | null
  langkah_aksi: string | null
  created_at: string
  updated_at: string
}

interface EditState {
  id: string | null
  tanggal_set: string
  nama_goal: string
  proyeksi_harga: number
  action_harian: string
  langkah_aksi: string
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export default function GoalPage() {
  const { effectiveLocked, lockControl } = useTableLock()
  const { ibadahPeriod: period, ibadahDate: anchorDate } = useHeaderControls()
  const todayStr = format(new Date(), "yyyy-MM-dd")

  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date()
    let start: Date
    let end: Date
    if (period === "daily") {
      start = startOfDaySafe(anchorDate)
      end = anchorDate
    } else if (period === "weekly") {
      start = startOfWeek(anchorDate, { weekStartsOn: 1 })
      end = endOfWeek(anchorDate, { weekStartsOn: 1 })
    } else if (period === "monthly") {
      start = startOfMonth(anchorDate)
      end = endOfMonth(anchorDate)
    } else {
      start = startOfYear(anchorDate)
      end = endOfYear(anchorDate)
    }
    const cappedEnd = end > today ? today : end
    return { rangeStart: start, rangeEnd: cappedEnd }
  }, [period, anchorDate])

  const startDate = format(rangeStart, "yyyy-MM-dd")
  const endDate = format(rangeEnd, "yyyy-MM-dd")

  const { data: logs = [], isLoading, error } = useGoalRange(startDate, endDate)
  useRealtime({
    table: "goal",
    filter: `tanggal_set=gte.${startDate},tanggal_set=lte.${endDate}`,
    queryKeys: [["goal", "range", startDate, endDate]],
  })

  const createGoal = useCreateGoal()
  const deleteGoal = useDeleteGoal()
  const updateGoal = useUpdateGoal()

  const [editState, setEditState] = useState<EditState | null>(null)
  const [hargaInput, setHargaInput] = useState("")

  const entries = useMemo(() => {
    return [...(logs as GoalEntry[])].sort((a, b) =>
      a.tanggal_set.localeCompare(b.tanggal_set) || (a.created_at || "").localeCompare(b.created_at || ""))
  }, [logs])

  const totalHarga = useMemo(() => {
    return (logs as GoalEntry[]).reduce((s, l) => s + (l.proyeksi_harga || 0), 0)
  }, [logs])

  const openAdd = () => {
    setHargaInput("")
    setEditState({
      id: null,
      tanggal_set: todayStr,
      nama_goal: "",
      proyeksi_harga: 0,
      action_harian: "",
      langkah_aksi: "",
    })
  }

  const openEdit = (entry: GoalEntry) => {
    setHargaInput(entry.proyeksi_harga > 0 ? formatRupiah(entry.proyeksi_harga) : "")
    setEditState({
      id: entry.id,
      tanggal_set: entry.tanggal_set,
      nama_goal: entry.nama_goal,
      proyeksi_harga: entry.proyeksi_harga,
      action_harian: entry.action_harian || "",
      langkah_aksi: entry.langkah_aksi || "",
    })
  }

  const handleSave = async () => {
    if (!editState) return
    if (!editState.nama_goal.trim()) return
    if (editState.proyeksi_harga <= 0) return
    if (editState.id) {
      await updateGoal.mutateAsync({
        id: editState.id,
        data: {
          tanggal_set: editState.tanggal_set,
          nama_goal: editState.nama_goal.trim(),
          proyeksi_harga: editState.proyeksi_harga,
          action_harian: editState.action_harian,
          langkah_aksi: editState.langkah_aksi,
        },
      })
    } else {
      await createGoal.mutateAsync({
        tanggal_set: editState.tanggal_set,
        tanggal_deadline: todayStr,
        nama_goal: editState.nama_goal.trim(),
        proyeksi_harga: editState.proyeksi_harga,
        action_harian: editState.action_harian,
        langkah_aksi: editState.langkah_aksi,
      })
    }
    setEditState(null)
  }

  const handleDelete = async (id: string) => {
    await deleteGoal.mutateAsync(id)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {/* Ringkasan total proyeksi harga */}
      <div className={cn("rounded-xl border bg-white p-4", TABLE_BORDER)}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
          <Target className="h-4 w-4" /> Total Proyeksi Goal ({entries.length} item)
        </p>
        <p className="mt-1 text-lg font-bold text-slate-800">{formatRupiah(totalHarga)}</p>
      </div>

      <div className={cn("relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] landscape:max-lg:max-h-none rounded-lg border bg-white", TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className={cn("border-b", TABLE_BORDER)}>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[50px] sm:min-w-[70px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Hash className="h-3.5 w-3.5 text-indigo-500" /> No</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[200px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Target className="h-3.5 w-3.5 text-indigo-500" /> Nama Goal</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[150px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Banknote className="h-3.5 w-3.5 text-indigo-500" /> Nilai</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[200px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wrench className="h-3.5 w-3.5 text-indigo-500" /> Rencana</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[200px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wrench className="h-3.5 w-3.5 text-indigo-500" /> Langkah Aksi</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[120px] sm:min-w-[160px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wrench className="h-3.5 w-3.5 text-indigo-500" /> Button</div>
              </th>
            </tr>
          </thead>
          <tbody className={cn(effectiveLocked && "pointer-events-none select-none")}>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" /><span className="text-sm">Memuat data...</span></div></td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">Belum ada goal. Tekan tombol + untuk menambah.</td></tr>
            ) : (
              entries.map((entry, rowIdx) => {
                return (
                  <tr key={entry.id} className={cn("border-b transition-colors", TABLE_BORDER, rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30", "hover:bg-blue-50/40")}>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r font-medium tabular-nums text-slate-700", TABLE_BORDER)}>
                      {rowIdx + 1}
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 border-r", TABLE_BORDER)}>
                      <span className="text-slate-800 whitespace-normal break-words leading-snug font-medium">{entry.nama_goal}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r font-semibold tabular-nums text-slate-700", TABLE_BORDER)}>
                      {formatRupiah(entry.proyeksi_harga)}
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 border-r align-top", TABLE_BORDER)}>
                      <span className="text-slate-700 whitespace-normal break-words leading-snug text-[11px] sm:text-xs">{entry.action_harian || <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 border-r align-top", TABLE_BORDER)}>
                      <span className="text-slate-700 whitespace-normal break-words leading-snug text-[11px] sm:text-xs">{entry.langkah_aksi || <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2", TABLE_BORDER)}>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <Button size="sm" aria-label="Edit goal" onClick={() => openEdit(entry)}
                          className="h-6 gap-1 bg-slate-600 hover:bg-slate-700 text-white text-[11px] px-1.5">
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button size="sm" aria-label="Hapus goal" onClick={() => handleDelete(entry.id)}
                          className="h-6 gap-1 bg-red-600 hover:bg-red-700 text-white text-[11px] px-1.5">
                          <Trash2 className="h-3 w-3" /> Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {lockControl}

      <Button onClick={openAdd} size="icon" aria-label="Tambah Goal" className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-lg">
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editState?.id ? "Edit Goal" : "Tambah Goal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-nama">Nama Goal</Label>
              <Input id="g-nama" placeholder="Contoh: Beli Laptop..."
                value={editState?.nama_goal ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, nama_goal: e.target.value } : prev)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-harga">Proyeksi Harga (Rupiah)</Label>
              <Input id="g-harga" type="text" inputMode="numeric" placeholder="Rp 12.000.000"
                value={hargaInput}
                onChange={(e) => {
                  const num = parseRupiah(e.target.value)
                  setEditState(prev => prev ? { ...prev, proyeksi_harga: num } : prev)
                  setHargaInput(num > 0 ? formatRupiah(num) : '')
                }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-action">Rencana</Label>
              <Textarea id="g-action" rows={2} placeholder="Deskripsi rencana tindakan..."
                value={editState?.action_harian ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, action_harian: e.target.value } : prev)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-langkah">Langkah Aksi</Label>
              <Textarea id="g-langkah" rows={2} placeholder="Deskripsi langkah aksi..."
                value={editState?.langkah_aksi ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, langkah_aksi: e.target.value } : prev)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditState(null)}>Batal</Button>
              <Button onClick={handleSave} disabled={!editState?.nama_goal.trim() || parseRupiah(hargaInput) <= 0}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
