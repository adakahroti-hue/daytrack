"use client"

export const dynamic = "force-dynamic"

import { Fragment, useMemo, useState } from "react"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { formatRupiah, parseRupiah } from "@/lib/utils"
import { useArusKasRange, useArusKasAll, useCreateArusKas, useDeleteArusKas, useUpdateArusKas } from "@/hooks/useArusKas"
import { useRealtime } from "@/hooks/useRealtime"
import { useHeaderControls, getIbadahRange } from '@/components/layout/HeaderControls'

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

// Warna badge dompet (konsisten di tabel + kartu mobile)
const DOMPET_BADGE: Record<string, string> = {
  kebutuhan: "bg-emerald-50 text-emerald-700 border-emerald-200",
  tabungan: "bg-sky-50 text-sky-700 border-sky-200",
  self_reward: "bg-amber-50 text-amber-700 border-amber-200",
  sedekah: "bg-violet-50 text-violet-700 border-violet-200",
  paylater: "bg-rose-50 text-rose-700 border-rose-200",
}

// Pilihan dompet sumber dana (hanya untuk uang keluar)
const DOMPET_OPTIONS: { value: "kebutuhan" | "tabungan" | "self_reward" | "sedekah" | "paylater"; label: string }[] = [
  { value: "kebutuhan", label: "Kebutuhan" },
  { value: "tabungan", label: "Tabungan" },
  { value: "self_reward", label: "Self Reward" },
  { value: "sedekah", label: "Sedekah" },
  { value: "paylater", label: "Paylater" },
]

// Alokasi otomatis dari total uang masuk (pay yourself first)
const BUDGET_ITEMS: { label: string; persen: number; text: string; dompet: "kebutuhan" | "tabungan" | "self_reward" | "sedekah" }[] = [
  { label: "Kebutuhan", persen: 70, text: "text-emerald-600", dompet: "kebutuhan" },
  { label: "Self Reward", persen: 10, text: "text-amber-600", dompet: "self_reward" },
  { label: "Tabung", persen: 10, text: "text-sky-600", dompet: "tabungan" },
  { label: "Sedekah", persen: 10, text: "text-violet-600", dompet: "sedekah" },
]

interface ArusKasEntry {
  id: string
  user_id: string
  tanggal: string
  kategori: "uang_masuk" | "uang_keluar"
  nominal: number
  alasan: string | null
  dompet: "kebutuhan" | "tabungan" | "self_reward" | "sedekah" | "paylater" | null
  created_at: string
}

interface EditState {
  id: string | null
  tanggal: string
  kategori: "uang_masuk" | "uang_keluar"
  nominal: number
  alasan: string
  dompet: "kebutuhan" | "tabungan" | "self_reward" | "sedekah" | "paylater" | null
}

function startOfDaySafe(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export default function ArusKasPage() {
  const { ibadahPeriod: period, ibadahDate: anchorDate } = useHeaderControls()
  const todayStr = format(new Date(), "yyyy-MM-dd")

  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = new Date()
    const { start, end } = getIbadahRange(period, anchorDate)
    const cappedEnd = end > today ? today : end
    return { rangeStart: start, rangeEnd: cappedEnd }
  }, [period, anchorDate])

  const startDate = format(rangeStart, "yyyy-MM-dd")
  const endDate = format(rangeEnd, "yyyy-MM-dd")

  // Filter "Semua": abaikan periode, tampilkan SELURUH catatan arus kas.
  const [showAll, setShowAll] = useState(false)

  const rangeQuery = useArusKasRange(startDate, endDate)
  const allQuery = useArusKasAll()
  const { data: logs = [], isLoading, error } = showAll ? allQuery : rangeQuery
  useRealtime({
    table: "arus_kas",
    filter: showAll ? undefined : `tanggal=gte.${startDate},tanggal=lte.${endDate}`,
    queryKeys: showAll ? [["arus-kas", "all"]] : [["arus-kas", "range", startDate, endDate]],
  })

  const createArusKas = useCreateArusKas()
  const deleteArusKas = useDeleteArusKas()
  const updateArusKas = useUpdateArusKas()

  const [editState, setEditState] = useState<EditState | null>(null)
  const [nominalInput, setNominalInput] = useState("")
  const [filterKategori, setFilterKategori] = useState<"semua" | "uang_masuk" | "uang_keluar">("semua")
  const [filterDompet, setFilterDompet] = useState<"semua" | "kebutuhan" | "tabungan" | "self_reward" | "sedekah" | "paylater">("semua")

  const entries = useMemo(() => {
    let list = [...(logs as ArusKasEntry[])]
    if (filterKategori !== "semua") list = list.filter(l => l.kategori === filterKategori)
    if (filterDompet !== "semua") list = list.filter(l => l.dompet === filterDompet)
    return list.sort((a, b) =>
      a.tanggal.localeCompare(b.tanggal) || (a.created_at || "").localeCompare(b.created_at || ""))
  }, [logs, filterKategori, filterDompet])

  // Ringkasan
  const ringkasan = useMemo(() => {
    let masuk = 0
    let keluar = 0
    let paylater = 0
    for (const l of logs as ArusKasEntry[]) {
      if (l.kategori === "uang_masuk") masuk += l.nominal
      else {
        keluar += l.nominal
        if (l.dompet === "paylater") paylater += l.nominal
      }
    }
    return { masuk, keluar, saldo: masuk - keluar, paylater }
  }, [logs])

  // Alokasi uang masuk otomatis (persen dari total uang masuk) dikurangi pemakaian per dompet
  const alokasi = useMemo(() => {
    const total = ringkasan.masuk
    // total uang keluar per dompet
    const pakai: Record<string, number> = {}
    for (const l of logs as ArusKasEntry[]) {
      if (l.kategori === "uang_keluar" && l.dompet) {
        pakai[l.dompet] = (pakai[l.dompet] || 0) + l.nominal
      }
    }
    return BUDGET_ITEMS.map(item => {
      const awal = Math.round((total * item.persen) / 100)
      const sisa = Math.max(0, awal - (pakai[item.dompet] || 0))
      return { ...item, nilai: sisa }
    })
  }, [ringkasan.masuk, logs])

  const openAdd = () => {
    setNominalInput("")
    setEditState({ id: null, tanggal: todayStr, kategori: "uang_masuk", nominal: 0, alasan: "", dompet: null })
  }

  const openEdit = (entry: ArusKasEntry) => {
    setNominalInput(entry.nominal > 0 ? formatRupiah(entry.nominal) : "")
    setEditState({ id: entry.id, tanggal: entry.tanggal, kategori: entry.kategori, nominal: entry.nominal, alasan: entry.alasan ?? "", dompet: entry.dompet ?? null })
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
      dompet: editState.kategori === "uang_keluar" ? editState.dompet : null,
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
      {/* Saldo + Alokasi Uang Masuk sebaris */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 items-stretch">
        {alokasi.map((item) => (
          <div key={item.label} className={cn("rounded-xl border bg-white p-4", TABLE_BORDER)}>
            <p className={cn("text-xs font-semibold uppercase tracking-wide flex items-center gap-1", item.text)}>
              {item.label} <span className="text-[10px] font-medium tabular-nums">({item.persen}%)</span>
            </p>
            <p className="mt-1 text-lg font-bold text-slate-800 tabular-nums">{formatRupiah(item.nilai)}</p>
          </div>
        ))}
        {/* Card Paylater (total utang paylater di periode) */}
        <div className={cn("rounded-xl border bg-white p-3 col-span-2 sm:col-span-1", TABLE_BORDER)}>
          <div className="flex flex-col justify-center h-full gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 flex items-center gap-1">
              <Wallet className="h-4 w-4" /> Paylater
            </p>
            <p className="text-lg font-bold text-rose-700 tabular-nums">−{formatRupiah(ringkasan.paylater)}</p>
            <p className="text-[11px] text-slate-400">Total utang (uang keluar)</p>
          </div>
        </div>
        {/* Card Saldo (lebih besar, paling kanan) */}
        <div className={cn("rounded-xl border bg-white p-3 col-span-2", TABLE_BORDER)}>
          <div className="flex flex-col justify-center h-full gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                <Wallet className="h-4 w-4" /> Saldo
              </p>
              <p className="text-lg font-bold text-slate-800 tabular-nums">{formatRupiah(ringkasan.saldo)}</p>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] border-t border-slate-100 pt-1.5">
              <span className="text-green-600 font-medium flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> Uang Masuk
              </span>
              <span className="text-green-600 font-semibold tabular-nums">{formatRupiah(ringkasan.masuk)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-red-600 font-medium flex items-center gap-1">
                <ArrowDownLeft className="h-3 w-3" /> Uang Keluar
              </span>
              <span className="text-red-600 font-semibold tabular-nums">{formatRupiah(ringkasan.keluar)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Toggle Semua: abaikan batas periode (tampilkan seluruh catatan) */}
        <Button
          variant={showAll ? "default" : "outline"}
          size="sm"
          className={cn("gap-1.5", showAll && "bg-[#0F172A] hover:bg-[#1E293B] text-white")}
          onClick={() => setShowAll(v => !v)}
        >
          <Calendar className="h-3.5 w-3.5" />
          {showAll ? "Semua (periode diabaikan)" : "Semua"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
              {filterKategori === "semua" ? "Semua Kategori" : filterKategori === "uang_masuk" ? "Uang Masuk" : "Uang Keluar"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setFilterKategori("semua")}>Semua Kategori</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterKategori("uang_masuk")}>Uang Masuk</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterKategori("uang_keluar")}>Uang Keluar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-indigo-500" />
              {filterDompet === "semua" ? "Semua Dompet" : DOMPET_OPTIONS.find(d => d.value === filterDompet)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setFilterDompet("semua")}>Semua Dompet</DropdownMenuItem>
            {DOMPET_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt.value} onClick={() => setFilterDompet(opt.value)}>{opt.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabel */}
      <div className={cn("relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-360px)] landscape:max-lg:max-h-none rounded-lg border bg-white", TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className={cn("hidden sm:table-header-group sticky top-0 z-20 bg-white")}>
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
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[140px] sm:min-w-[160px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Wallet className="h-3.5 w-3.5 text-indigo-500" /> Dompet</div>
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
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" /><span className="text-sm">Memuat data...</span></div></td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">Belum ada catatan arus kas pada periode ini.</td></tr>
            ) : (
              entries.map((entry, rowIdx) => {
                const date = new Date(entry.tanggal + "T00:00:00")
                const dayName = format(date, "EEEE", { locale: id })
                const dateDisplay = format(date, "d MMMM", { locale: id })
                const isMasuk = entry.kategori === "uang_masuk"
                return (
                  <Fragment key={entry.id}>
                    {/* ── Mobile: kartu ringkas (sm:hidden) ── */}
                    <tr className={cn("sm:hidden border-b", TABLE_BORDER, rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                      <td colSpan={7} className={cn("px-2.5 py-2.5", TABLE_BORDER)}>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0" />
                            <span className={cn("font-bold tabular-nums text-sm shrink-0", isMasuk ? "text-green-700" : "text-red-600")}>
                              {isMasuk ? "+" : "−"}{formatRupiah(entry.nominal).replace("Rp ", "")}
                            </span>
                          </div>
                          <p className="text-[13px] text-slate-800 whitespace-normal break-words leading-tight">{entry.alasan || "-"}</p>
                          {!isMasuk && entry.dompet && (
                            <p className="text-[11px] text-slate-500">Dompet: {DOMPET_OPTIONS.find(d => d.value === entry.dompet)?.label}</p>
                          )}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border shrink-0",
                                isMasuk ? "bg-green-100 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200")}>
                                {isMasuk ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                {isMasuk ? "Masuk" : "Keluar"}
                              </span>
                              <span className="text-[11px] text-slate-500 tabular-nums">{dateDisplay}</span>
                              <span className={cn("inline-block px-1.5 py-0.5 rounded-full text-[10px] border font-medium", DAY_BADGE_COLORS[dayName] || "bg-slate-100 text-slate-700 border-slate-200")}>{dayName}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="icon" aria-label="Edit arus kas" onClick={() => openEdit(entry)}
                                className="h-6 w-6 p-0 bg-slate-600 hover:bg-slate-700 text-white">
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" aria-label="Hapus arus kas" onClick={() => handleDelete(entry.id)}
                                className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700 text-white">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {/* ── Desktop: tabel penuh (hidden sm:table-row) ── */}
                    <tr className={cn("hidden sm:table-row border-b transition-colors", TABLE_BORDER, rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30", "hover:bg-blue-50/40")}>
                      <td className={cn("dt-col-stick sticky left-0 z-10 bg-inherit px-2 sm:px-3 py-2 text-center text-slate-700 border-r font-medium tabular-nums text-sm", TABLE_BORDER)}>
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
                      <td className={cn("px-2 sm:px-3 py-2 text-center border-r", TABLE_BORDER)}>
                        {isMasuk ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
                            entry.dompet ? (DOMPET_BADGE[entry.dompet] ?? "bg-slate-100 text-slate-500 border-slate-200") : "bg-slate-100 text-slate-500 border-slate-200")}>
                            {entry.dompet ? DOMPET_OPTIONS.find(d => d.value === entry.dompet)?.label : "-"}
                          </span>
                        )}
                      </td>
                      <td className={cn("px-2 sm:px-3 py-2 text-center border-r font-semibold tabular-nums", TABLE_BORDER, isMasuk ? "text-green-700" : "text-red-600")}>
                        {isMasuk ? "+" : "−"}{formatRupiah(entry.nominal).replace("Rp ", "")}
                      </td>
                      <td className={cn("px-2 sm:px-3 py-2 border-r", TABLE_BORDER)}>
                        <span className="text-sm text-slate-800 whitespace-normal break-words leading-snug">{entry.alasan || "-"}</span>
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
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

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
                <button type="button" onClick={() => setEditState(prev => prev ? { ...prev, kategori: "uang_masuk", dompet: null } : prev)}
                  className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5",
                    editState?.kategori === "uang_masuk" ? "bg-green-100 text-green-700 border-green-300" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                  <ArrowUpRight className="h-4 w-4" /> Uang Masuk
                </button>
                <button type="button" onClick={() => setEditState(prev => prev ? { ...prev, kategori: "uang_keluar", dompet: prev.dompet ?? "kebutuhan" } : prev)}
                  className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5",
                    editState?.kategori === "uang_keluar" ? "bg-red-50 text-red-600 border-red-300" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                  <ArrowDownLeft className="h-4 w-4" /> Uang Keluar
                </button>
              </div>
              {editState?.kategori === "uang_keluar" && (
                <div className="mt-2">
                  <Label>Sumber Dana (Dompet)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {DOMPET_OPTIONS.map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setEditState(prev => prev ? { ...prev, dompet: opt.value } : prev)}
                        className={cn("rounded-lg border px-3 py-2 text-sm font-medium",
                          editState?.dompet === opt.value
                            ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                            : "border-slate-200 text-slate-500 hover:bg-slate-50")}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
