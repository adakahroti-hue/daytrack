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
import { id } from "date-fns/locale"
import { Calendar, CalendarDays, Target, Wallet, Banknote, Wrench, Pencil, Trash2, Plus } from "lucide-react"
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

const KATEGORI_OPTIONS: { value: "kebutuhan" | "tabungan" | "self_reward" | "sedekah"; label: string }[] = [
  { value: "kebutuhan", label: "Kebutuhan" },
  { value: "tabungan", label: "Tabungan" },
  { value: "self_reward", label: "Self Reward" },
  { value: "sedekah", label: "Sedekah" },
]

interface GoalEntry {
  id: string
  user_id: string
  tanggal_set: string
  tanggal_deadline: string
  nama_goal: string
  proyeksi_harga: number
  kategori: "kebutuhan" | "tabungan" | "self_reward" | "sedekah"
  action_harian: string | null
  habit: string | null
  created_at: string
  updated_at: string
}

interface EditState {
  id: string | null
  tanggal_set: string
  tanggal_deadline: string
  nama_goal: string
  proyeksi_harga: number
  kategori: "kebutuhan" | "tabungan" | "self_reward" | "sedekah"
  action_harian: string
  habit: string
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
      tanggal_deadline: todayStr,
      nama_goal: "",
      proyeksi_harga: 0,
      kategori: "kebutuhan",
      action_harian: "",
      habit: "",
    })
  }

  const openEdit = (entry: GoalEntry) => {
    setHargaInput(entry.proyeksi_harga > 0 ? formatRupiah(entry.proyeksi_harga) : "")
    setEditState({
      id: entry.id,
      tanggal_set: entry.tanggal_set,
      tanggal_deadline: entry.tanggal_deadline,
      nama_goal: entry.nama_goal,
      proyeksi_harga: entry.proyeksi_harga,
      kategori: entry.kategori,
      action_harian: entry.action_harian || "",
      habit: entry.habit || "",
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
          tanggal_deadline: editState.tanggal_deadline,
          nama_goal: editState.nama_goal.trim(),
          proyeksi_harga: editState.proyeksi_harga,
          kategori: editState.kategori,
          action_harian: editState.action_harian,
          habit: editState.habit,
        },
      })
    } else {
      await createGoal.mutateAsync({
        tanggal_set: editState.tanggal_set,
        tanggal_deadline: editState.tanggal_deadline,
        nama_goal: editState.nama_goal.trim(),
        proyeksi_harga: editState.proyeksi_harga,
        kategori: editState.kategori,
        action_harian: editState.action_harian,
        habit: editState.habit,
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
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[140px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Calendar className="h-3.5 w-3.5 text-indigo-500" /> Tgl Set</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[140px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-indigo-500" /> Tgl Deadline</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[200px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Target className="h-3.5 w-3.5 text-indigo-500" /> Nama Goal</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[150px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Banknote className="h-3.5 w-3.5 text-indigo-500" /> Proyeksi Harga</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[150px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wallet className="h-3.5 w-3.5 text-indigo-500" /> Kategori</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[200px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wrench className="h-3.5 w-3.5 text-indigo-500" /> Action Harian</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[200px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wrench className="h-3.5 w-3.5 text-indigo-500" /> Habit</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[120px] sm:min-w-[160px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wrench className="h-3.5 w-3.5 text-indigo-500" /> Button</div>
              </th>
            </tr>
          </thead>
          <tbody className={cn(effectiveLocked && "pointer-events-none select-none")}>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" /><span className="text-sm">Memuat data...</span></div></td></tr>
            ) : error ? (
              <tr><td colSpan={8} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Belum ada goal. Tekan tombol + untuk menambah.</td></tr>
            ) : (
              entries.map((entry, rowIdx) => {
                const setDate = new Date(entry.tanggal_set + "T00:00:00")
                const deadlineDate = new Date(entry.tanggal_deadline + "T00:00:00")
                return (
                  <tr key={entry.id} className={cn("border-b transition-colors", TABLE_BORDER, rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30", "hover:bg-blue-50/40")}>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r font-medium tabular-nums text-slate-700", TABLE_BORDER)}>
                      <span className="sm:hidden">{format(setDate, "d MMM", { locale: id })}</span>
                      <span className="hidden sm:inline">{format(setDate, "d MMMM yyyy", { locale: id })}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r font-medium tabular-nums text-slate-700", TABLE_BORDER)}>
                      <span className="sm:hidden">{format(deadlineDate, "d MMM", { locale: id })}</span>
                      <span className="hidden sm:inline">{format(deadlineDate, "d MMMM yyyy", { locale: id })}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 border-r", TABLE_BORDER)}>
                      <span className="text-slate-800 whitespace-normal break-words leading-snug font-medium">{entry.nama_goal}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r font-semibold tabular-nums text-slate-700", TABLE_BORDER)}>
                      {formatRupiah(entry.proyeksi_harga)}
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r", TABLE_BORDER)}>
                      <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
                        entry.kategori === "kebutuhan" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        entry.kategori === "tabungan" && "bg-sky-50 text-sky-700 border-sky-200",
                        entry.kategori === "self_reward" && "bg-amber-50 text-amber-700 border-amber-200",
                        entry.kategori === "sedekah" && "bg-violet-50 text-violet-700 border-violet-200")}>
                        {KATEGORI_OPTIONS.find(d => d.value === entry.kategori)?.label}
                      </span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 border-r align-top", TABLE_BORDER)}>
                      <span className="text-slate-700 whitespace-normal break-words leading-snug text-[11px] sm:text-xs">{entry.action_harian || <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 border-r align-top", TABLE_BORDER)}>
                      <span className="text-slate-700 whitespace-normal break-words leading-snug text-[11px] sm:text-xs">{entry.habit || <span className="text-slate-300">—</span>}</span>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-set">Tanggal Set</Label>
                <Input id="g-set" type="date" value={editState?.tanggal_set ?? todayStr}
                  onChange={(e) => setEditState(prev => prev ? { ...prev, tanggal_set: e.target.value } : prev)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-deadline">Tanggal Deadline</Label>
                <Input id="g-deadline" type="date" value={editState?.tanggal_deadline ?? todayStr}
                  onChange={(e) => setEditState(prev => prev ? { ...prev, tanggal_deadline: e.target.value } : prev)} />
              </div>
            </div>
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
              <Label>Kategori</Label>
              <div className="grid grid-cols-2 gap-2">
                {KATEGORI_OPTIONS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setEditState(prev => prev ? { ...prev, kategori: opt.value } : prev)}
                    className={cn("rounded-lg border px-3 py-2 text-sm font-medium",
                      editState?.kategori === opt.value
                        ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-action">Action Harian</Label>
              <Textarea id="g-action" rows={2} placeholder="Deskripsi action harian..."
                value={editState?.action_harian ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, action_harian: e.target.value } : prev)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-habit">Habit</Label>
              <Textarea id="g-habit" rows={2} placeholder="Kebiasaan pendukung..."
                value={editState?.habit ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, habit: e.target.value } : prev)} />
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
