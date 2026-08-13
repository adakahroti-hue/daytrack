"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState, useEffect } from "react"
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
} from "date-fns"
import { id } from "date-fns/locale"
import { Target, Wallet, Banknote, Wrench, Pencil, Trash2, Plus, Hash, Clock, ClipboardList, Footprints, MousePointerClick, Star, ArrowUp, ArrowDown, X, Play, Pause, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useTableLock } from "@/components/ui/table-lock"
import { useGoalRange, useCreateGoal, useDeleteGoal, useUpdateGoal, usePromoteGoal, useGoalUtama, useUpdateGoalUtama, useDeleteGoalUtama } from "@/hooks/useGoal"
import { syncGoalLangkahToTasks } from "@/app/actions/tasks"
import { getGoalUtama, type GoalUtamaEntry } from "@/app/actions/goal"
import { useTasksByGroup } from "@/hooks/useTasks"
import { useRealtime } from "@/hooks/useRealtime"
import { useHeaderControls } from "@/components/layout/HeaderControls"

const TABLE_BORDER = "border-slate-900"

interface LangkahItem extends LangkahStep {}

interface GoalEntry {
  id: string
  user_id: string
  tanggal_set: string
  tanggal_deadline: string
  nama_goal: string
  proyeksi_harga: number
  tempo: string | null
  action_harian: string | null
  langkah_aksi: string | null
  is_utama: boolean
  created_at: string
  updated_at: string
}

interface EditState {
  id: string | null
  tanggal_set: string
  nama_goal: string
  proyeksi_harga: number
  tempo: string
  action_harian: string
  langkah_aksi: string
}

// ── Tipe Langkah Aksi (Goal Utama) ──
// Tiap langkah = 1 task di tabel `tugas`, terikat dalam 1 paket (group_id).
export type LangkahPrioritas = 'p1' | 'p2' | 'p3' | 'p4'
export type LangkahStatus = 'belum' | 'proses' | 'selesai'

export interface LangkahStep {
  text: string
  tanggal: string        // YYYY-MM-DD (default = tanggal_set goal, bisa diubah)
  estimasi_menit: number // default 0
  prioritas: LangkahPrioritas // default 'p3'
  status: LangkahStatus  // default 'belum'
}

export interface LangkahData {
  group_id: string | null // paket task di tabel tugas
  steps: LangkahStep[]
}

// Parse langkah_aksi (TEXT di DB) ke struktur LangkahData.
// Mendukung 3 format:
//   1. JSON baru  : { group_id, steps:[{text,tanggal,estimasi_menit,prioritas,status}] }
//   2. JSON lama  : [{ fields:[...] }]
//   3. Teks biasa : "satu langkah"
// defaultTanggal = tanggal_set goal (dipakai kalau langkah tak punya tanggal).
function parseLangkah(raw: string | null, defaultTanggal?: string): LangkahData {
  const empty: LangkahData = { group_id: null, steps: [] }
  if (!raw || !raw.trim()) return empty
  try {
    const parsed = JSON.parse(raw)
    // Format baru
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'steps' in parsed) {
      const steps: LangkahStep[] = (Array.isArray(parsed.steps) ? parsed.steps : [])
        .map((s: any) => ({
          text: String(s?.text ?? '').trim(),
          tanggal: s?.tanggal || defaultTanggal || '',
          estimasi_menit: Number(s?.estimasi_menit) || 0,
          prioritas: (s?.prioritas || 'p3') as LangkahPrioritas,
          status: (s?.status || 'belum') as LangkahStatus,
        }))
        .filter((s: LangkahStep) => s.text.length > 0)
      return { group_id: parsed.group_id || null, steps }
    }
    // Format lama [{ fields:[...] }]
    if (Array.isArray(parsed)) {
      const steps: LangkahStep[] = parsed
        .map((it: any) => {
          const fields = Array.isArray(it?.fields)
            ? it.fields.map((f: any) => String(f ?? '')).filter((f: string) => f.length > 0)
            : (it && typeof it === 'string' && it.length > 0 ? [it] : [])
          return fields.map((text: string) => ({
            text,
            tanggal: defaultTanggal || '',
            estimasi_menit: 0,
            prioritas: 'p3' as LangkahPrioritas,
            status: 'belum' as LangkahStatus,
          }))
        })
        .flat()
      return { group_id: null, steps }
    }
  } catch {
    // bukan JSON -> teks biasa = 1 langkah
    return {
      group_id: null,
      steps: [{ text: raw.trim(), tanggal: defaultTanggal || '', estimasi_menit: 0, prioritas: 'p3', status: 'belum' }],
    }
  }
  return empty
}

// Balik: LangkahData -> string JSON.
// Jika tak ada step, kembalikan "" (kosong).
function serializeLangkah(data: LangkahData): string {
  const steps = (data.steps || [])
    .map((s) => ({
      text: s.text.trim(),
      tanggal: s.tanggal || '',
      estimasi_menit: Number(s.estimasi_menit) || 0,
      prioritas: s.prioritas || 'p3',
      status: s.status || 'belum',
    }))
    .filter((s) => s.text.length > 0)
  if (steps.length === 0) return ''
  return JSON.stringify({ group_id: data.group_id || null, steps })
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
  const promoteGoal = usePromoteGoal()
  const updateGoalUtama = useUpdateGoalUtama()
  const deleteGoalUtama = useDeleteGoalUtama()

  const [editState, setEditState] = useState<EditState | null>(null)
  const [langkahList, setLangkahList] = useState<LangkahItem[]>([])
  const [promoteMode, setPromoteMode] = useState(false) // true = dialog ini untuk "Jadikan Utama" (wajib isi field)

  // ── Fitur Timer "Berjalan" (Play) pada card Goal Utama ──
  // Saat Play ditekan: capture tanggal hari itu sebagai start, deadline = start + durasi tempo.
  // Lalu progress bar + countdown mundur ke deadline terus berjalan tiap detik.
  const [playStart, setPlayStart] = useState<Date | null>(null)
  const [nowTick, setNowTick] = useState<Date>(new Date())

  // Parse teks tempo ("3 bulan", "1 tahun", "90 hari", "2 minggu") → jumlah hari.
  const parseTempoToDays = (tempo: string | null | undefined): number | null => {
    if (!tempo) return null
    const m = tempo.toLowerCase().match(/(\d+)\s*(hari|h|minggu|mgg|bulan|bln|tahun|thn)/)
    if (!m) return null
    const n = parseInt(m[1], 10)
    const unit = m[2]
    if (unit.startsWith('hari') || unit === 'h') return n
    if (unit.startsWith('minggu') || unit.startsWith('mgg')) return n * 7
    if (unit.startsWith('bulan') || unit.startsWith('bln')) return n * 30
    if (unit.startsWith('tahun') || unit.startsWith('thn')) return n * 365
    return null
  }

  const startPlay = () => setPlayStart(new Date())
  const stopPlay = () => setPlayStart(null)

  // Tick tiap detik selama play aktif
  useEffect(() => {
    if (!playStart) return
    const idInt = setInterval(() => setNowTick(new Date()), 1000)
    return () => clearInterval(idInt)
  }, [playStart])

  // Cek apakah suatu goal sudah punya data lengkap untuk jadi Goal Utama
  // (field Proyeksi Harga sudah dihapus dari form -> tidak lagi jadi syarat)
  const isUtamaComplete = (e: GoalEntry) =>
    !!e.nama_goal?.trim() &&
    !!e.tempo?.trim() &&
    !!e.action_harian?.trim() &&
    !!e.langkah_aksi?.trim()

  // Klik "Jadikan Utama": kalau sudah lengkap -> langsung; kalau belum -> buka dialog isi field
  const handlePromoteClick = (entry: GoalEntry) => {
    if (isUtamaComplete(entry)) {
      promoteGoal.mutateAsync({ id: entry.id, data: {} })
      return
    }
    setLangkahList(parseLangkah(entry.langkah_aksi, entry.tanggal_set).steps)
    setPromoteMode(true)
    setEditState({
      id: entry.id,
      tanggal_set: entry.tanggal_set,
      nama_goal: entry.nama_goal,
      proyeksi_harga: entry.proyeksi_harga,
      tempo: entry.tempo || "",
      action_harian: entry.action_harian || "",
      langkah_aksi: entry.langkah_aksi || "",
    })
  }

  const entries = useMemo(() => {
    return [...(logs as GoalEntry[])].sort((a, b) =>
      a.tanggal_set.localeCompare(b.tanggal_set) || (a.created_at || "").localeCompare(b.created_at || ""))
  }, [logs])

  // Goal Utama sekarang dari tabel terpisah (goal_utama) — bukan lagi kolom is_utama di goal
  const { data: goalUtama, isLoading: goalUtamaLoading } = useGoalUtama()
  // Field Tempo/Rencana/Langkah hanya untuk Goal Utama (goal_utama). Goal biasa cuma nomor + nama.
  const showFullFields = promoteMode || (editState?.id != null && goalUtama?.id === editState.id)

  // Hitung deadline + progres timer "berjalan" (setelah goalUtama diketahui)
  const tempoDays = goalUtama ? parseTempoToDays(goalUtama.tempo) : null
  const deadline = playStart && tempoDays ? addDays(playStart, tempoDays) : null
  const totalMs = playStart && deadline ? deadline.getTime() - playStart.getTime() : 0
  const elapsedMs = playStart ? nowTick.getTime() - playStart.getTime() : 0
  const progressPct = deadline && totalMs > 0
    ? Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100))
    : 0
  const remainingMs = deadline ? Math.max(0, deadline.getTime() - nowTick.getTime()) : 0

  // ── Progress paket langkah (sync ke tab Semua) ──
  // group_id diambil dari langkah_aksi goal utama; task by group_id dibaca dari tugas.
  const goalGroupId = goalUtama ? parseLangkah(goalUtama.langkah_aksi).group_id : null
  const { data: groupTasks = [] } = useTasksByGroup(goalGroupId)
  const totalSteps = groupTasks.length
  const doneSteps = groupTasks.filter((t: any) => t.status === 'selesai').length
  const stepProgressPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0

  const openAdd = () => {
    setEditState({
      id: null,
      tanggal_set: todayStr,
      nama_goal: "",
      proyeksi_harga: 0,
      tempo: "",
      action_harian: "",
      langkah_aksi: "",
    })
    setLangkahList([])
    setPromoteMode(false) // pastikan mode "Jadikan Utama" mati saat tambah baru
  }

  const openEdit = (entry: GoalEntry) => {
    setEditState({
      id: entry.id,
      tanggal_set: entry.tanggal_set,
      nama_goal: entry.nama_goal,
      proyeksi_harga: entry.proyeksi_harga,
      tempo: entry.tempo || "",
      action_harian: entry.action_harian || "",
      langkah_aksi: entry.langkah_aksi || "",
    })
    setLangkahList(parseLangkah(entry.langkah_aksi, entry.tanggal_set).steps)
  }

  const handleSave = async () => {
    if (!editState) return
    // Saat TAMBAH baru: boleh simpan meski field kosong.
    // Saat EDIT / Jadikan Utama: wajib ada nama. (proyeksi_harga opsional)
    if (editState.id && !promoteMode) {
      if (!editState.nama_goal.trim()) return
    }
    // group_id paket: pertahankan kalau goal utama sudah punya, atau buat baru.
    const prevData = goalUtama ? parseLangkah(goalUtama.langkah_aksi) : { group_id: null, steps: [] }
    const groupId = promoteMode ? crypto.randomUUID() : (prevData.group_id || crypto.randomUUID())
    const serializedLangkah = serializeLangkah({ group_id: groupId, steps: langkahList })

    if (promoteMode) {
      // Mode "Jadikan Utama": wajib isi tempo, rencana, langkah
      if (!editState.tempo.trim() || !editState.action_harian.trim() || !serializedLangkah.trim()) return
      await promoteGoal.mutateAsync({
        id: editState.id!,
        data: {
          tempo: editState.tempo,
          action_harian: editState.action_harian,
          langkah_aksi: serializedLangkah,
        },
      })
      // 1a: sinkron langkah -> task (paket group_id) karena goal ini jadi Utama
      if (groupId) {
        await syncGoalLangkahToTasks(groupId, langkahList, editState.nama_goal.trim())
      }
      setEditState(null)
      setLangkahList([])
      setPromoteMode(false)
      return
    }

    if (editState.id) {
      // Edit goal utama (data di tabel goal_utama) vs goal biasa (tabel goal)
      if (goalUtama?.id === editState.id) {
        await updateGoalUtama.mutateAsync({
          id: editState.id,
          data: {
            tanggal_set: editState.tanggal_set,
            nama_goal: editState.nama_goal.trim(),
            tempo: editState.tempo,
            action_harian: editState.action_harian,
            langkah_aksi: serializedLangkah,
          },
        })
      } else {
        await updateGoal.mutateAsync({
          id: editState.id,
          data: {
            tanggal_set: editState.tanggal_set,
            nama_goal: editState.nama_goal.trim(),
            proyeksi_harga: 0,
            tempo: editState.tempo,
            action_harian: editState.action_harian,
            langkah_aksi: serializedLangkah,
          },
        })
      }
      // 1a: sinkron langkah -> task hanya kalau goal ini adalah Goal Utama
      if (groupId && goalUtama?.id === editState.id) {
        await syncGoalLangkahToTasks(groupId, langkahList, editState.nama_goal.trim())
      }
    } else {
      await createGoal.mutateAsync({
        tanggal_set: editState.tanggal_set,
        tanggal_deadline: todayStr,
        nama_goal: editState.nama_goal.trim(),
        proyeksi_harga: editState.proyeksi_harga,
        tempo: editState.tempo,
        action_harian: editState.action_harian,
        langkah_aksi: serializedLangkah,
      })
    }
    setEditState(null)
    setLangkahList([])
  }

  // ── Langkah Aksi builder helpers ──
  // Tiap langkah = 1 task utuh (LangkahStep). Tidak lagi nested fields.
  const addStep = () => setLangkahList(prev => [
    ...prev,
    { text: '', tanggal: editState?.tanggal_set || '', estimasi_menit: 0, prioritas: 'p3', status: 'belum' } as LangkahStep,
  ])
  const removeStep = (si: number) => setLangkahList(prev => prev.filter((_, i) => i !== si))
  const moveStep = (si: number, dir: -1 | 1) => setLangkahList(prev => {
    const next = [...prev]
    const j = si + dir
    if (j < 0 || j >= next.length) return prev
    ;[next[si], next[j]] = [next[j], next[si]]
    return next
  })
  const updateStep = (si: number, patch: Partial<LangkahStep>) => setLangkahList(prev =>
    prev.map((s, i) => i === si ? { ...s, ...patch } : s))

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus goal ini?")) {
      await deleteGoal.mutateAsync(id)
    }
  }

  const handleDeleteGoalUtama = async (id: string) => {
    if (confirm("Yakin ingin menghapus Goal Utama? Goal akan kembali ke daftar goal biasa (tidak ada yang utama).")) {
      await deleteGoalUtama.mutateAsync(id)
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">

      {/* Card Goal Utama */}
      <div className={cn("rounded-lg border border-green-200 bg-green-50 p-4 sm:p-5 shadow-sm")}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Goal Utama</h2>
          {goalUtama && (
            <>
              <Button type="button" size="sm" variant="ghost" aria-label="Edit goal utama"
                onClick={() => openEdit(goalUtama as any)}
                className="ml-auto h-7 w-7 p-0 text-slate-500 hover:text-slate-700">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" variant="ghost" aria-label="Hapus goal utama"
                onClick={() => handleDeleteGoalUtama(goalUtama.id)}
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={playStart ? "outline" : "default"}
                onClick={playStart ? stopPlay : startPlay}
                className={cn(
                  "h-7 gap-1.5 text-[11px] px-2.5",
                  playStart
                    ? "border-green-300 text-green-700 hover:bg-green-100"
                    : "bg-green-600 hover:bg-green-700 text-white"
                )}
              disabled={!goalUtama.tempo?.trim()}
              title={goalUtama.tempo?.trim() ? "Mulai timer periode goal" : "Isi Tempo dulu untuk menjalankan timer"}
            >
              {playStart ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playStart ? "Stop" : "mulai"}
            </Button>
          </>)}
        </div>
        {/* Progress bar Periode Berjalan — di bagian atas card, tepat di bawah baris tombol Play */}
        {goalUtama ? (
          <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase text-green-800">Nama Goal</p>
              <p className="text-slate-800 break-words whitespace-normal text-[13px]">{goalUtama.nama_goal}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-green-800">Tempo</p>
              <p className="text-slate-800 break-words whitespace-normal text-[13px]">{goalUtama.tempo || <span className="text-green-700/60">—</span>}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-green-800">Rencana</p>
              <p className="text-slate-800 break-words whitespace-normal text-[13px]">{goalUtama.action_harian || <span className="text-green-700/60">—</span>}</p>
            </div>
            <div className="col-span-2 sm:col-span-4 pt-3.5">
              <p className="text-[11px] font-semibold uppercase text-green-800">Langkah Aksi</p>
              {(() => {
                const parsed = parseLangkah(goalUtama.langkah_aksi)
                const steps = parsed.steps
                if (steps.length === 0) return <p className="text-green-700/60">—</p>
                const statusLabel: Record<string, string> = { belum: 'Belum', proses: 'Proses', selesai: 'Selesai' }
                const statusClass: Record<string, string> = {
                  belum: 'bg-slate-100 text-slate-600 border-slate-200',
                  proses: 'bg-amber-100 text-amber-700 border-amber-200',
                  selesai: 'bg-green-100 text-green-700 border-green-200',
                }
                const prioClass: Record<string, string> = {
                  p1: 'bg-red-100 text-red-700 border-red-200',
                  p2: 'bg-orange-100 text-orange-700 border-orange-200',
                  p3: 'bg-blue-100 text-blue-700 border-blue-200',
                  p4: 'bg-slate-100 text-slate-500 border-slate-200',
                }
                return (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {steps.map((s, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2 py-1",
                        s.status === 'selesai' ? 'bg-yellow-100 border-yellow-300' : 'bg-yellow-100 border-yellow-300'
                      )}>
                        <span className="shrink-0 flex items-center justify-center h-4 w-4 rounded-full bg-green-600 text-white text-[10px] font-bold leading-none">{i + 1}</span>
                        <span className={cn("text-green-900 text-[13px] leading-snug break-words", s.status === 'selesai' && "line-through opacity-70")}>{s.text}</span>
                        {s.estimasi_menit > 0 && <span className="text-[10px] text-slate-500 border border-slate-200 rounded px-1">{s.estimasi_menit}m</span>}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
          {goalGroupId && totalSteps > 0 && (
            <div className="mt-4 pt-3 border-t border-green-200 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {/* Kiri: Progress Langkah */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase text-green-800">
                    <ClipboardList className="h-3.5 w-3.5" /> Progress
                  </span>
                  <span className="text-[11px] font-medium text-slate-600 tabular-nums">{doneSteps}/{totalSteps} selesai</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-blue-200/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-linear"
                    style={{ width: `${stepProgressPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-600 tabular-nums">
                  {stepProgressPct}% langkah terselesaikan
                </p>
              </div>
              {/* Kanan: Periode Berjalan */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase text-green-800">
                    <Timer className="h-3.5 w-3.5" /> Durasi
                  </span>
                  {playStart && deadline ? (
                    <span className="text-[11px] font-medium text-slate-600 tabular-nums">{progressPct.toFixed(1)}% berlalu</span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Belum dijalankan</span>
                  )}
                </div>
                <div className="h-2.5 w-full rounded-full bg-green-200/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-600 transition-[width] duration-1000 ease-linear"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {playStart && deadline && (
                  <p className="mt-1.5 text-[11px] text-slate-600 tabular-nums">
                    {remainingMs > 0
                      ? `Sisa waktu: ${Math.floor(remainingMs / 86400000)} hari ${Math.floor((remainingMs % 86400000) / 3600000)} jam ${Math.floor((remainingMs % 3600000) / 60000)} menit`
                      : 'Periode goal telah berakhir'}
                    <span className="text-green-700/70"> · {format(playStart, 'd MMM yyyy', { locale: id })} → {format(deadline, 'd MMM yyyy', { locale: id })}</span>
                  </p>
                )}
              </div>
            </div>
          )}
          </div>
        ) : (
          <p className="text-sm text-green-800/80">Belum ada goal utama. Tekan tombol &quot;Jadikan Utama&quot; pada salah satu goal di bawah.</p>
        )}
      </div>

      <div className={cn("relative overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] landscape:max-lg:max-h-none rounded-lg border bg-white", TABLE_BORDER)}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className={cn("border-b", TABLE_BORDER)}>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[50px] sm:min-w-[70px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Hash className="h-3.5 w-3.5 text-indigo-500" /> No</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 border-r min-w-[150px] sm:min-w-[180px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><Target className="h-3.5 w-3.5 text-indigo-500" /> Nama Goal</div>
              </th>
              <th className={cn("px-2 sm:px-3 py-2 text-center font-semibold text-slate-700 min-w-[104px] sm:min-w-[150px]", TABLE_BORDER)}>
                <div className="flex items-center justify-center gap-1"><MousePointerClick className="h-3.5 w-3.5 text-indigo-500" /> Tombol</div>
              </th>
            </tr>
          </thead>
          <tbody className={cn(effectiveLocked && "pointer-events-none select-none")}>
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-12 text-slate-400"><div className="flex flex-col items-center gap-2"><div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600" /><span className="text-sm">Memuat data...</span></div></td></tr>
            ) : error ? (
              <tr><td colSpan={3} className="text-center py-12 text-red-500">Gagal memuat data: {error.message}</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-12 text-slate-400 text-sm">Belum ada goal. Tekan tombol + untuk menambah.</td></tr>
            ) : (
              entries.map((entry, rowIdx) => {
                return (
                  <tr key={entry.id} className={cn("border-b transition-colors", TABLE_BORDER, rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30", "hover:bg-blue-50/40")}>
                    <td className={cn("px-2 sm:px-3 py-2 text-center border-r font-medium tabular-nums text-slate-700", TABLE_BORDER)}>
                      {rowIdx + 1}
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2 border-r", TABLE_BORDER)}>
                      <span className="text-xs sm:text-sm text-slate-800 whitespace-normal break-words leading-snug font-medium">{entry.nama_goal}</span>
                    </td>
                    <td className={cn("px-2 sm:px-3 py-2", TABLE_BORDER)}>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-1">
                        {entry.is_utama ? (
                          <span className="inline-flex w-full sm:w-auto items-center justify-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[11px] font-medium border border-green-200">
                            <Star className="h-3 w-3 fill-green-500" /> Utama
                          </span>
                        ) : (
                          <Button size="sm" aria-label="Jadikan goal utama" onClick={() => handlePromoteClick(entry)}
                            className="h-6 w-full sm:w-auto gap-1 bg-green-600 hover:bg-green-700 text-white text-[11px] px-1.5 justify-center">
                            <Star className="h-3 w-3" /> Utama
                          </Button>
                        )}
                        <Button size="sm" aria-label="Hapus goal" onClick={() => handleDelete(entry.id)}
                          className="h-6 w-full sm:w-auto gap-1 bg-red-600 hover:bg-red-700 text-white text-[11px] px-1.5 justify-center">
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
            <DialogTitle>{promoteMode ? "Lengkapi & Jadikan Utama" : (editState?.id ? "Edit Goal" : "Tambah Goal")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-nama">Nama Goal</Label>
              <Input id="g-nama" placeholder="Contoh: Beli Laptop..."
                value={editState?.nama_goal ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, nama_goal: e.target.value } : prev)} />
            </div>
            {showFullFields && (
            <>
            <div className="space-y-1.5">
              <Label htmlFor="g-tempo">Tempo</Label>
              <Input id="g-tempo" placeholder="Contoh: 3 bulan, 1 tahun..."
                value={editState?.tempo ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, tempo: e.target.value } : prev)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-action">Rencana</Label>
              <Textarea id="g-action" rows={2} placeholder="Deskripsi rencana tindakan..."
                value={editState?.action_harian ?? ""}
                onChange={(e) => setEditState(prev => prev ? { ...prev, action_harian: e.target.value } : prev)} />
            </div>
            </>
            )}
            {showFullFields && (
            <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="g-langkah">Langkah Aksi</Label>
                <Button type="button" size="sm" variant="outline" onClick={addStep}
                  className="h-6 gap-1 text-[11px] px-2">
                  <Plus className="h-3 w-3" /> Tambah Langkah
                </Button>
              </div>
              {langkahList.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada langkah. Klik &quot;Tambah Langkah&quot; untuk mulai menyusun rencana berurutan.</p>
              ) : (
                <div className="space-y-2">
                  {langkahList.map((step, si) => (
                    <div key={si} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Langkah {si + 1}</span>
                        <div className="flex items-center gap-1">
                          <Button type="button" size="sm" variant="ghost" aria-label="Pindah ke atas"
                            disabled={si === 0}
                            onClick={() => moveStep(si, -1)}
                            className="h-5 w-5 p-0 text-slate-500 hover:text-slate-700 disabled:opacity-30">
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost" aria-label="Pindah ke bawah"
                            disabled={si === langkahList.length - 1}
                            onClick={() => moveStep(si, 1)}
                            className="h-5 w-5 p-0 text-slate-500 hover:text-slate-700 disabled:opacity-30">
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost" aria-label="Hapus langkah"
                            onClick={() => removeStep(si)}
                            className="h-5 w-5 p-0 text-red-500 hover:text-red-700">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Input
                          value={step.text}
                          placeholder={`Langkah ${si + 1}`}
                          onChange={(e) => updateStep(si, { text: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-slate-500">Tanggal</Label>
                            <Input type="date" value={step.tanggal} onChange={(e) => updateStep(si, { tanggal: e.target.value })} className="h-7 text-[11px] px-1.5" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-slate-500">Estimasi (mnt)</Label>
                            <Input type="number" min={0} value={step.estimasi_menit} onChange={(e) => updateStep(si, { estimasi_menit: Number(e.target.value) || 0 })} className="h-7 text-[11px] px-1.5" />
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-slate-500">Prioritas</Label>
                            <select value={step.prioritas} onChange={(e) => updateStep(si, { prioritas: e.target.value as LangkahPrioritas })} className="h-7 rounded-md border border-slate-200 bg-white text-[11px] px-1.5">
                              <option value="p1">P1</option>
                              <option value="p2">P2</option>
                              <option value="p3">P3</option>
                              <option value="p4">P4</option>
                            </select>
                          </div>
                          <div className="space-y-0.5">
                            <Label className="text-[10px] text-slate-500">Status</Label>
                            <select value={step.status} onChange={(e) => updateStep(si, { status: e.target.value as LangkahStatus })} className="h-7 rounded-md border border-slate-200 bg-white text-[11px] px-1.5">
                              <option value="belum">Belum</option>
                              <option value="proses">Proses</option>
                              <option value="selesai">Selesai</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => { setEditState(null); setPromoteMode(false); }}>Batal</Button>
              <Button
                onClick={handleSave}
                disabled={
                  ((editState?.id && !promoteMode) && (!editState?.nama_goal.trim())) ||
                  (promoteMode && (!editState?.tempo.trim() || !editState?.action_harian.trim() || serializeLangkah({ group_id: null, steps: langkahList }).trim() === ""))
                }
              >Simpan</Button>
            </div>
            </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
