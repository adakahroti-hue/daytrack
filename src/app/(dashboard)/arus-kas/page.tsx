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
import { Calendar, CalendarDays, Wallet, ArrowDownLeft, ArrowUpRight, Trash2, Plus, Pencil, Banknote, MessageSquare, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatRupiah, parseRupiah } from "@/lib/utils"
import { useTableLock } from "@/components/ui/table-lock"
import { useArusKasRange, useCreateArusKas, useDeleteArusKas, useUpdateArusKas } from "@/hooks/useArusKas"
import { useRealtime } from "@/hooks/useRealtime"
import { useHeaderControls } from "@/components/layout/HeaderControls"

const DAY_BADGE_COLORS: Record<string, string> = {
  Senin: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Selasa: "bg-orange-100 text-orange-800 border-orange-200",
  Rabu: "bg-purple-100 text-purple-800 border-purple-200",
  Kamis: "bg-amber-100 text-amber-800 border-amber-200",
  Jumat: "bg-blue-100 text-blue-800 border-blue-200",
  Sabtu: "bg-green-100 text-green-800 border-green-200",
  Minggu: "bg-rose-100 text-rose-800 border-rose-200",
}

const TABLE_BORDER = "border-slate-900"

// Alokasi otomatis dari total uang masuk (pay yourself first)
const BUDGET_ITEMS: { label: string; persen: number; bar: string; text: string }[] = [
  { label: "Kebutuhan Pokok", persen: 70, bar: "bg-emerald-500", text: "text-emerald-600" },
  { label: "Menabung Impian", persen: 10, bar: "bg-sky-500", text: "text-sky-600" },
  { label: "Self Reward", persen: 10, bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Sedekah", persen: 10, bar: "bg-violet-500", text: "text-violet-600" },
]

interface ArusKasEntry {
  id: string
  user_id: string
  tanggal: string
  kategori: "uang_masuk" | "uang_keluar"
  nominal: number
  alasan: string | null
  created_at: string
}

interface EditState {
  id: string | null
  tanggal: string
  kategori: "uang_masuk" | "uang_keluar"
  nominal: number
  alasan: string
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export default function ArusKasPage() {
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

  const { data: logs = [], isLoading, error } = useArusKasRange(startDate, endDate)
  useRealtime({
    table: "arus_kas",
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [["arus-kas", "range", startDate, endDate]],
  })

  const createArusKas = useCreateArusKas()
  const deleteArusKas = useDeleteArusKas()
  const updateArusKas = useUpdateArusKas()

  const [editState, setEditState] = useState<EditState | null>(null)
  const [nominalInput, setNominalInput] = useState("")

  const entries = useMemo(() => {
    return [...(logs as ArusKasEntry[])].sort((a, b) =>
      a.tanggal.localeCompare(b.tanggal) || (a.created_at || "").localeCompare(b.created_at || ""))
  }, [logs])

  // Ringkasan
  const ringkasan = useMemo(() => {
    let masuk = 0
    let keluar = 0
    for (const l of logs as ArusKasEntry[]) {
      if (l.kategori === "uang_masuk") masuk += l.nominal
      else keluar += l.nominal
    }
    return { masuk, keluar, saldo: masuk - keluar }
  }, [logs])

  // Alokasi uang masuk otomatis (persen dari total uang masuk periode ini)
  const alokasi = useMemo(() => {
    const total = ringkasan.masuk
    return BUDGET_ITEMS.map(item => ({
      ...item,
      nilai: Math.round((total * item.persen) / 100),
    }))
  }, [ringkasan.masuk])

  const openAdd = () => {
    setNominalInput("")
    setEditState({ id: null, tanggal: todayStr, kategori: "uang_masuk", nominal: 0, alasan: "" })
  }

  const openEdit = (entry: ArusKasEntry) => {
    setNominalInput(entry.nominal > 0 ? formatRupiah(entry.nominal) : "")
    setEditState({ id: entry.id, tanggal: entry.tanggal, kategori: entry.kategori, nominal: entry.nominal, alasan: entry.alasan ?? "" })
  }

  const handleSave = async () => {
    if (!editState) return
    if (!editState.alasan.trim()) return
    if (editState.nominal <= 0) return
    const payload = {
      tanggal: editState.tanggal,
      kategori: editState.kategori,
      nominal: editState.nominal,
      alasan: editState.alasan.trim(),
    }
    if (editState.id) {
      // Mode edit
      await updateArusKas.mutateAsync({ id: editState.id, data: payload })
    } else {
      // Mode tambah
      await createArusKas.mutateAsync(payload)
    }
    setEditState(null)
  }

  const handleDelete = async (id: string) => {
    await deleteArusKas.mutateAsync(id)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {/* Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={cn("rounded-xl border bg-white p-4", TABLE_BORDER)}>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600 flex items-center gap-1">
            <ArrowUpRight className="h-4 w-4" /> Uang Masuk
          </p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatRupiah(ringkasan.masuk)}</p>
        </div>
        <div className={cn("rounded-xl border bg-white p-4", TABLE_BORDER)}>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600 flex items-center gap-1">
            <ArrowDownLeft className="h-4 w-4" /> Uang Keluar
          </p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatRupiah(ringkasan.keluar)}</p>
        </div>
        <div className={cn("rounded-xl border bg-white p-4", TABLE_BORDER)}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
            <Wallet className="h-4 w-4" /> Saldo
          </p>
          <p className="mt-1 text-lg font-bold text-slate-800">{formatRupiah(ringkasan.saldo)}</p>
        </div>
      </div>

      {/* Alokasi Uang Masuk (otomatis dari total uang masuk periode ini) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {alokasi.map((item) => (
          <div key={item.label} className={cn("rounded-xl border bg-white p-4", TABLE_BORDER)}>
            <p className={cn("text-xs font-semibold uppercase tracking-wide flex items-center gap-1", item.text)}>
              {item.label}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-800 tabular-nums">{formatRupiah(item.nilai)}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div className={cn("h-full rounded-full", item.bar)} style={{ width: `${item.persen}%` }} />
              </div>
              <span className={cn("text-[11px] font-semibold tabular-nums", item.text)}>{item.persen}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabel */}
      <div className={cn("relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)] landscape:max-lg:max-h-none rounded-lg border bg-white", TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className={cn("border-b", TABLE_BORDER)}>
              <th className={cn("dt-col-stick sticky left-0 z-30 bg-white px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[72px] sm:min-w-[100px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Calendar className="h-3.5 w-3.5 text-indigo-500" /> Tanggal</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[64px] sm:min-w-[90px] dt-col-stick sm:sticky sm:left-[100px] sm:z-30 sm:bg-white", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-indigo-500" /> Hari</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[150px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wallet className="h-3.5 w-3.5 text-indigo-500" /> Kategori</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[160px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Banknote className="h-3.5 w-3.5 text-indigo-500" /> Nominal</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[220px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> Alasan</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[120px] sm:min-w-[160px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wrench className="h-3.5 w-3.5 text-indigo-500" /> Aksi</div>
              </th>
            </tr>
          </thead>
          <tbody className={cn(effectiveLocked && "pointer-events-none select-none")}>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" /><span className="text-sm">Memuat data...</span></div></td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400 text-sm">Belum ada catatan arus kas pada periode ini.</td></tr>
            ) : (
              entries.map((entry, rowIdx) => {
                const date = new Date(entry.tanggal + "T00:00:00")
                const dayName = format(date, "EEEE", { locale: id })
                const dateDisplay = format(date, "d MMMM", { locale: id })
                const isMasuk = entry.kategori === "uang_masuk"
                return (
                  <tr key={entry.id} className={cn("border-b transition-colors", TABLE_BORDER, rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30", "hover:bg-blue-50/40")}>
                    <td className={cn("dt-col-stick sticky left-0 z-10 bg-inherit px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums", TABLE_BORDER)}>
                      <span className="sm:hidden">{format(date, "d MMM", { locale: id })}</span>
                      <span className="hidden sm:inline">{dateDisplay}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r dt-col-stick sm:sticky sm:left-[100px] sm:z-10 sm:bg-inherit", TABLE_BORDER)}>
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs border font-medium", DAY_BADGE_COLORS[dayName] || "bg-slate-100 text-slate-700 border-slate-200")}>{dayName}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r", TABLE_BORDER)}>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border",
                        isMasuk ? "bg-green-100 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200")}>
                        {isMasuk ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                        {isMasuk ? "Uang Masuk" : "Uang Keluar"}
                      </span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r font-semibold tabular-nums", TABLE_BORDER, isMasuk ? "text-green-700" : "text-red-600")}>
                      {isMasuk ? "+" : "−"}{formatRupiah(entry.nominal).replace("Rp ", "")}
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 border-r", TABLE_BORDER)}>
                      <span className="text-slate-800 whitespace-normal break-words leading-snug">{entry.alasan || "-"}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2", TABLE_BORDER)}>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <Button size="sm" aria-label="Edit arus kas" onClick={() => openEdit(entry)}
                          className="h-6 gap-1 bg-slate-600 hover:bg-slate-700 text-white text-[11px] px-1.5">
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button size="sm" aria-label="Hapus arus kas" onClick={() => handleDelete(entry.id)}
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

      <Button onClick={openAdd} size="icon" aria-label="Tambah Arus Kas" className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-lg">
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editState?.id ? "Edit Arus Kas" : "Tambah Arus Kas"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ak-tanggal">Tanggal</Label>
              <Input id="ak-tanggal" type="date" value={editState?.tanggal ?? todayStr}
                onChange={(e) => setEditState(prev => prev ? { ...prev, tanggal: e.target.value } : prev)} />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditState(prev => prev ? { ...prev, kategori: "uang_masuk" } : prev)}
                  className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5",
                    editState?.kategori === "uang_masuk" ? "bg-green-100 text-green-700 border-green-300" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                  <ArrowUpRight className="h-4 w-4" /> Uang Masuk
                </button>
                <button type="button" onClick={() => setEditState(prev => prev ? { ...prev, kategori: "uang_keluar" } : prev)}
                  className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5",
                    editState?.kategori === "uang_keluar" ? "bg-red-50 text-red-600 border-red-300" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                  <ArrowDownLeft className="h-4 w-4" /> Uang Keluar
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ak-nominal">Nominal (Rupiah)</Label>
              <Input id="ak-nominal" type="text" inputMode="numeric" placeholder="Rp 50.000"
                value={nominalInput}
                onChange={(e) => {
                  const num = parseRupiah(e.target.value)
                  setEditState(prev => prev ? { ...prev, nominal: num } : prev)
                  setNominalInput(num > 0 ? formatRupiah(num) : '')
                }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ak-alasan">
                {editState?.kategori === "uang_masuk" ? "Sumber Uang" : "Tujuan Belanja"}
              </Label>
              <Textarea id="ak-alasan" rows={3} placeholder={editState?.kategori === "uang_masuk" ? "Contoh: gaji, bonus..." : "Contoh: beli produk X..."}
                value={editState?.alasan ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, alasan: e.target.value } : prev)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditState(null)}>Batal</Button>
              <Button onClick={handleSave} disabled={!editState?.alasan.trim() || parseRupiah(nominalInput) <= 0}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
