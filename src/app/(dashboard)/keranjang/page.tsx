"use client"

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
import { Calendar, CalendarDays, ShoppingCart, Trash2, Plus, Check, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatRupiah, parseRupiah } from "@/lib/utils"
import { useTableLock } from "@/components/ui/table-lock"
import { useKeranjangRange, useCreateKeranjang, useDeleteKeranjang, useBeliKeranjang } from "@/hooks/useKeranjang"
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

interface KeranjangEntry {
  id: string
  user_id: string
  tanggal: string
  nama_barang: string
  harga: number
  status: "belum" | "sudah"
  created_at: string
}

interface EditState {
  id: string | null
  tanggal: string
  nama_barang: string
  harga: number
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export default function KeranjangPage() {
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

  const { data: logs = [], isLoading, error } = useKeranjangRange(startDate, endDate)
  useRealtime({
    table: "keranjang",
    filter: `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: [["keranjang", "range", startDate, endDate]],
  })

  const createKeranjang = useCreateKeranjang()
  const deleteKeranjang = useDeleteKeranjang()
  const beliKeranjang = useBeliKeranjang()

  const [editState, setEditState] = useState<EditState | null>(null)
  const [hargaInput, setHargaInput] = useState("")

  const entries = useMemo(() => {
    return [...(logs as KeranjangEntry[])].sort((a, b) =>
      a.tanggal.localeCompare(b.tanggal) || (a.created_at || "").localeCompare(b.created_at || ""))
  }, [logs])

  const totalHarga = useMemo(() => {
    return (logs as KeranjangEntry[]).filter(l => l.status === "belum").reduce((s, l) => s + l.harga, 0)
  }, [logs])

  const openAdd = () => {
    setHargaInput("")
    setEditState({ id: null, tanggal: todayStr, nama_barang: "", harga: 0 })
  }

  const handleSave = async () => {
    if (!editState) return
    if (!editState.nama_barang.trim()) return
    const harga = parseRupiah(hargaInput)
    if (harga <= 0) return
    await createKeranjang.mutateAsync({
      tanggal: editState.tanggal,
      nama_barang: editState.nama_barang.trim(),
      harga,
      status: "belum",
    })
    setEditState(null)
  }

  const handleBeli = async (id: string) => {
    await beliKeranjang.mutateAsync(id)
  }

  const handleDelete = async (id: string) => {
    await deleteKeranjang.mutateAsync(id)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      {/* Ringkasan total harga belum dibeli */}
      <div className={cn("rounded-xl border bg-white p-4", TABLE_BORDER)}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
          <ShoppingCart className="h-4 w-4" /> Total Rencana Belanja (belum dibeli)
        </p>
        <p className="mt-1 text-lg font-bold text-slate-800">{formatRupiah(totalHarga)}</p>
      </div>

      <div className={cn("relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] landscape:max-lg:max-h-none rounded-lg border bg-white", TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className={cn("border-b", TABLE_BORDER)}>
              <th className={cn("dt-col-stick sticky left-0 z-30 bg-white px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[72px] sm:min-w-[100px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Calendar className="h-3.5 w-3.5 text-indigo-500" /> Tanggal</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[64px] sm:min-w-[90px] dt-col-stick sm:sticky sm:left-[100px] sm:z-30 sm:bg-white", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-indigo-500" /> Hari</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[160px] sm:min-w-[220px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><ShoppingCart className="h-3.5 w-3.5 text-indigo-500" /> Nama Barang</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[120px] sm:min-w-[150px]", TABLE_BORDER)}>
                Harga
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[120px] sm:min-w-[150px]", TABLE_BORDER)}>
                Status
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[56px] w-[56px]", TABLE_BORDER)}>
                <span className="sr-only">Hapus</span>
                <Trash2 className="h-3.5 w-3.5 text-slate-400 mx-auto" />
              </th>
            </tr>
          </thead>
          <tbody className={cn(effectiveLocked && "pointer-events-none select-none")}>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" /><span className="text-sm">Memuat data...</span></div></td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">Belum ada barang di keranjang. Tekan tombol + untuk menambah.</td></tr>
            ) : (
              entries.map((entry, rowIdx) => {
                const date = new Date(entry.tanggal + "T00:00:00")
                const dayName = format(date, "EEEE", { locale: id })
                const dateDisplay = format(date, "d MMMM", { locale: id })
                const isBelum = entry.status === "belum"
                return (
                  <tr key={entry.id} className={cn("border-b transition-colors", TABLE_BORDER, rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30", "hover:bg-blue-50/40")}>
                    <td className={cn("dt-col-stick sticky left-0 z-10 bg-inherit px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums", TABLE_BORDER)}>
                      <span className="sm:hidden">{format(date, "d MMM", { locale: id })}</span>
                      <span className="hidden sm:inline">{dateDisplay}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r dt-col-stick sm:sticky sm:left-[100px] sm:z-10 sm:bg-inherit", TABLE_BORDER)}>
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs border font-medium", DAY_BADGE_COLORS[dayName] || "bg-slate-100 text-slate-700 border-slate-200")}>{dayName}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 border-r", TABLE_BORDER)}>
                      <span className="text-slate-800 whitespace-normal break-words leading-snug">{entry.nama_barang}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r font-semibold tabular-nums text-slate-700", TABLE_BORDER)}>
                      {formatRupiah(entry.harga)}
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center", TABLE_BORDER)}>
                      {isBelum ? (
                        <Button size="sm" variant="outline" onClick={() => handleBeli(entry.id)}
                          className="text-green-700 border-green-300 hover:bg-green-50 gap-1">
                          <Check className="h-3.5 w-3.5" /> Sudah
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2.5 py-1 text-xs font-medium border border-green-200">
                          <Check className="h-3.5 w-3.5" /> Sudah
                        </span>
                      )}
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 text-center", TABLE_BORDER)}>
                      <Button variant="ghost" size="icon" aria-label="Hapus keranjang" onClick={() => handleDelete(entry.id)} className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {lockControl}

      <Button onClick={openAdd} size="icon" aria-label="Tambah Keranjang" className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-lg">
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={!!editState} onOpenChange={(open) => !open && setEditState(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah ke Keranjang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="k-tanggal">Tanggal</Label>
              <Input id="k-tanggal" type="date" value={editState?.tanggal ?? todayStr}
                onChange={(e) => setEditState(prev => prev ? { ...prev, tanggal: e.target.value } : prev)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="k-nama">Nama Barang</Label>
              <Input id="k-nama" placeholder="Contoh: susu, buku..."
                value={editState?.nama_barang ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, nama_barang: e.target.value } : prev)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="k-harga">Harga (Rupiah)</Label>
              <Input id="k-harga" type="text" inputMode="numeric" placeholder="Rp 25.000"
                value={hargaInput}
                onChange={(e) => { setHargaInput(e.target.value); setEditState(prev => prev ? { ...prev, harga: parseRupiah(e.target.value) } : prev) }} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditState(null)}>Batal</Button>
              <Button onClick={handleSave} disabled={!editState?.nama_barang.trim() || parseRupiah(hargaInput) <= 0}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
