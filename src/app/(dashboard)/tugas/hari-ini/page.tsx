"use client"

import { useState, useMemo, useEffect, memo } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, Edit, Trash2, Clock, Play, Pause, Check, CheckCircle2, MoreHorizontal, AlertTriangle, Layers, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn, getEstimasiText, getMissionStatusColor, getMissionPriorityColor, getMissionPriorityIcon, getMissionGroupName, CARD_BASE, CARD_HOVER, getTaskActualDurationText, compareTaskEstimasiVsActual, getTaskLiveDurationText } from '@/lib/utils'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskGroupRibbon, TaskGroupDialog } from '@/components/tasks/task-group'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus, usePauseTask, useResumeTask, useBulkDeleteTasks, useReorderTaskGroup } from '@/hooks/useTasks'
import { useTasksRealtime } from '@/hooks/useRealtime'
import { Suspense } from 'react'

type Task = {
  id: string
  user_id: string
  nama: string
  tanggal?: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: 'belum' | 'proses' | 'selesai' | 'ide'
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  terlewat_tanggal?: string | null
  accumulated_seconds?: number | null
  is_paused?: boolean | null
  last_resumed_at?: string | null
  group_id?: string | null
  group_order?: number | null
}

type TaskFormData = {
  nama: string
  tanggal?: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: 'belum' | 'proses' | 'selesai' | 'ide'
}

type EditingTask = TaskFormData & { id: string }

const PRIORITY_ORDER: Task['prioritas'][] = ['p1', 'p2', 'p3', 'p4']

const PRIORITY_ICONS: Record<Task['prioritas'], string> = {
  p1: '🔥',
  p2: '⚡',
  p3: '📌',
  p4: '🌱',
}

// Rev 3: warna card ala sticky note per prioritas (tugas 'belum')
const PRIORITY_CARD_COLORS: Record<Task['prioritas'], string> = {
  p1: 'bg-rose-50 border-rose-300 hover:border-rose-400 dark:bg-rose-950/40 dark:border-rose-800',
  p2: 'bg-amber-50 border-amber-300 hover:border-amber-400 dark:bg-amber-950/40 dark:border-amber-800',
  p3: 'bg-green-50 border-green-300 hover:border-green-400 dark:bg-green-950/40 dark:border-green-800',
  p4: 'bg-purple-50 border-purple-300 hover:border-purple-400 dark:bg-purple-950/40 dark:border-purple-800',
}

const TaskCard = memo(({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onPause,
  onResume,
  onStart,
  onSetGroup,
  selectionMode,
  selected,
  onToggleSelect,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: 'belum' | 'proses' | 'selesai' | 'ide') => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onStart?: (task: Task) => void
  onSetGroup?: (task: Task) => void
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}) => {
  const isCompleted = task.status === 'selesai'
  const isInProgress = task.status === 'proses'
  const isPending = task.status === 'belum'
  const isPaused = !!task.is_paused

  // Live ticker so the running timer visibly updates every 10s (only while actively running)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isInProgress || isPaused) return
    const t = setInterval(() => setTick(x => x + 1), 1_000)
    return () => clearInterval(t)
  }, [isInProgress, isPaused])

  const handlePrimaryAction = () => {
    if (isPending) {
      // Revisi 10: lewatkan ke parent — cek prioritas, mungkin tampilkan popup peringatan
      onStart?.(task)
    } else if (isInProgress) {
      onStatusChange(task.id, 'selesai')
    }
  }

  const handlePauseResume = () => {
    if (isInProgress) {
      if (isPaused) onResume(task.id)
      else onPause(task.id)
    }
  }

  const primaryButtonText = isPending ? 'Ambil Misi' : isInProgress ? 'Tandai Selesai' : 'Misi Selesai'
  const primaryButtonDisabled = isCompleted

  const PrimaryButtonIcon = () => {
    if (isPending) return <Play className="h-3.5 w-3.5" />
    if (isInProgress) return <Check className="h-3.5 w-3.5" />
    return <CheckCircle2 className="h-3.5 w-3.5" />
  }

  const statusBadgeClass = cn(
    'text-xs font-medium px-2.5 py-1 rounded-lg border',
    getMissionStatusColor(task.status)
  )

  const priorityBadgeClass = cn(
    'text-xs font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1',
    getMissionPriorityColor(task.prioritas)
  )

  const isActiveFocus = isInProgress
  // Rev 3: warna card ala sticky note — sedang dikerjakan = biru muda; P1 merah muda, P2 kuning muda, P3 hijau muda, P4 ungu muda; selesai tetap netral
  const cardBorderClass = cn(
    CARD_HOVER,
    isCompleted
      ? CARD_BASE
      : cn(
          'rounded-xl transition-colors duration-200',
          isInProgress
            ? 'bg-blue-50 border-blue-300 hover:border-blue-400 dark:bg-blue-950/40 dark:border-blue-800'
            : PRIORITY_CARD_COLORS[task.prioritas]
        ),
    isCompleted && 'opacity-60',
    isActiveFocus && 'shadow-[0_0_0_3px_rgba(37,99,235,0.15)]',
  )

  // Pause-aware durations
  const actualDurationText = task.status === 'selesai' && task.started_at && task.completed_at
    ? getTaskActualDurationText(task)
    : null

  const comparison = task.status === 'selesai' && task.started_at && task.completed_at
    ? compareTaskEstimasiVsActual(task)
    : null

  return (
    <Card className={cn('group relative', cardBorderClass)}>
      {/* Revisi batch 12: pita penanda paket (parent=1, child=2,3,...) */}
      {task.group_id && task.group_order != null && (
        <TaskGroupRibbon groupId={task.group_id} order={task.group_order} />
      )}
      <CardContent className="pt-4 pb-3 px-4 space-y-2.5">
        {/* Revisi 2-3: judul + menu titik tiga SEBARIS di kanan atas, sejajar */}
        <div className="flex items-start justify-between gap-2">
          <div className={cn("flex items-center gap-2 flex-1 min-w-0", task.group_id && "pl-7")}>
            {selectionMode && (
              <Checkbox
                checked={!!selected}
                onCheckedChange={() => onToggleSelect?.(task.id)}
                className="h-4 w-4 shrink-0"
                aria-label="Pilih tugas"
              />
            )}
            <h3 className={cn("font-medium text-base leading-tight capitalize flex-1", task.group_id && "pl-7")}>{task.nama}</h3>
          </div>
          {task.group_id && (canMoveUp || canMoveDown) && (
            <div className="flex flex-col shrink-0 -mt-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                aria-label="Pindah ke atas"
                disabled={!canMoveUp}
                onClick={(e) => { e.stopPropagation(); onMoveUp?.() }}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                aria-label="Pindah ke bawah"
                disabled={!canMoveDown}
                onClick={(e) => { e.stopPropagation(); onMoveDown?.() }}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mt-1 -mr-1.5 shrink-0 opacity-70"
                aria-label="Menu tugas"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => onEdit(task)} className="flex items-center gap-2" inset={false}>
                <Edit className="h-3.5 w-3.5" />Edit Tugas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSetGroup?.(task)} className="flex items-center gap-2" inset={false}>
                <Layers className="h-3.5 w-3.5" />Penanda Paket
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="flex items-center gap-2 text-destructive focus:text-destructive" inset={false}>
                <Trash2 className="h-3.5 w-3.5" />Hapus Tugas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Terlewat note */}
        {task.terlewat_tanggal && task.status !== 'selesai' && (
          <div className="flex items-center gap-1.5 w-fit text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Terlewat — dijadwal ulang dari {format(new Date(task.terlewat_tanggal + 'T00:00:00'), 'd MMMM', { locale: id })}</span>
          </div>
        )}

        {/* Revisi 1: estimasi + waktu berjalan dalam SATU BARIS */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{getEstimasiText(task.estimasi_menit)}</span>
            {isInProgress && task.started_at && (
              <span className={cn(
                'flex items-center gap-1',
                isPaused ? 'text-slate-500 dark:text-slate-400' : 'text-amber-700 dark:text-amber-300 animate-pulse'
              )}>
                <span className="text-slate-300 dark:text-slate-600 mx-0.5">•</span>
                {isPaused ? 'Dijeda — ' : 'Sedang: '}{getTaskLiveDurationText(task)}
              </span>
            )}
          </div>

          {/* Real duration for completed tasks (pause-aware) */}
          {actualDurationText && comparison && (
            <>
              <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Real: {actualDurationText}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {comparison.status !== 'unknown' && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${comparison.status === 'lebih-cepat' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : comparison.status === 'lebih-lama' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {comparison.status === 'lebih-cepat' ? '🟢' : comparison.status === 'lebih-lama' ? '🔴' : '⚪'}
                    {comparison.status === 'lebih-cepat' ? 'Lebih cepat' : comparison.status === 'lebih-lama' ? 'Lebih lama' : 'Pas'} {comparison.selisihText}
                  </span>
                )}
              </div>
            </>
          )}

        </div>

        {/* Bottom Row: Status Badge + Pause/Resume + Primary Action */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Badge variant="outline" className={statusBadgeClass}>
            {task.status === 'belum' ? 'Belum' : task.status === 'proses' ? (isPaused ? 'Dijeda' : 'Proses') : 'Selesai'}
          </Badge>
          <div className="flex items-center gap-2 max-md:portrait:gap-4">
            {/* Pause / Resume — only for in-progress tasks */}
            {isInProgress && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 px-2.5',
                  isPaused
                    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300'
                )}
                onClick={handlePauseResume}
                aria-label={isPaused ? 'Lanjutkan (resume)' : 'Jeda (pause)'}
              >
                <span className="flex items-center gap-1.5">
                  {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
                </span>
              </Button>
            )}
            <Button
              variant={isCompleted ? 'outline' : 'default'}
              size="sm"
              className={cn(
                'w-auto sm:w-auto',
                isCompleted && 'bg-muted text-muted-foreground hover:bg-muted/80 border-border',
                isPending && 'bg-[#0F172A] hover:bg-[#1E293B] text-white',
                isInProgress && 'bg-green-600 hover:bg-green-700 text-white'
              )}
              onClick={handlePrimaryAction}
              disabled={primaryButtonDisabled}
              aria-label={primaryButtonText}
            >
              <span className="flex items-center gap-1.5">
                <PrimaryButtonIcon />
                <span className="hidden sm:inline">{primaryButtonText}</span>
                <span className="sm:hidden">{isPending ? 'Ambil' : 'Selesai'}</span>
              </span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
TaskCard.displayName = 'TaskCard'

function HariIniPageClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  // Revisi 10: tugas yang diklik tapi prioritasnya bukan tertinggi — tunggu konfirmasi
  const [pendingStart, setPendingStart] = useState<Task | null>(null)
  // Revisi batch 12: penanda paket (parent/child/single)
  const [groupTask, setGroupTask] = useState<Task | null>(null)
  // Seleksi massal (centang + hapus banyak)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const { data: todayTasks = [], isLoading, error } = useTasks(todayStr)

  useTasksRealtime([['tugas', todayStr]], `tanggal=eq.${todayStr}`)

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTaskStatus = useToggleTaskStatus()
  const pauseTask = usePauseTask()
  const resumeTask = useResumeTask()
  const bulkDeleteTasks = useBulkDeleteTasks()
  const reorderTaskGroup = useReorderTaskGroup()

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allTodayIds = todayTasks.map((t: Task) => t.id)
  const toggleSelectAll = () => setSelectedIds(prev =>
    prev.size === allTodayIds.length && allTodayIds.length > 0
      ? new Set()
      : new Set(allTodayIds)
  )
  const clearSelection = () => setSelectedIds(new Set())
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    if (confirm(`Yakin ingin menghapus ${selectedIds.size} tugas yang dipilih?`)) {
      bulkDeleteTasks.mutate(Array.from(selectedIds), {
        onSuccess: () => { setSelectedIds(new Set()); setSelectionMode(false) },
      })
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask({
      id: task.id,
      nama: task.nama,
      tanggal: task.tanggal ?? undefined,
      estimasi_menit: task.estimasi_menit,
      prioritas: task.prioritas,
      status: task.status,
    })
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus tugas ini?')) {
      deleteTask.mutate(id)
    }
  }

  const handleStatusChange = (id: string, status: 'belum' | 'proses' | 'selesai' | 'ide') => {
    toggleTaskStatus.mutate({ id, status })
  }

  // Revisi 10: cek apakah ada tugas hari ini dengan prioritas lebih tinggi yang belum selesai
  const handleStartRequest = (task: Task) => {
    const taskPriorityIndex = PRIORITY_ORDER.indexOf(task.prioritas)
    const hasHigherPriorityPending = todayTasks.some(
      (t: Task) =>
        t.id !== task.id &&
        t.status !== 'selesai' &&
        PRIORITY_ORDER.indexOf(t.prioritas) < taskPriorityIndex
    )
    if (hasHigherPriorityPending) {
      setPendingStart(task)
      return
    }
    handleStatusChange(task.id, 'proses')
  }

  const handlePause = (id: string) => pauseTask.mutate(id)
  const handleResume = (id: string) => resumeTask.mutate(id)

  // Edit urutan dalam paket penanda: swap group_order dengan tetangga (atas/bawah)
  const handleReorder = (task: Task, dir: 'up' | 'down') => {
    if (!task.group_id || task.group_order == null) return
    const members = todayTasks
      .filter((t: Task) => t.group_id === task.group_id && t.group_order != null)
      .sort((a: Task, b: Task) => (a.group_order ?? 0) - (b.group_order ?? 0))
    const idx = members.findIndex((t: Task) => t.id === task.id)
    if (idx === -1) return
    const target = dir === 'up' ? members[idx - 1] : members[idx + 1]
    if (!target) return
    reorderTaskGroup.mutate({ upId: dir === 'up' ? task.id : target.id, downId: dir === 'up' ? target.id : task.id })
  }

  const handleSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, data })
    } else {
      createTask.mutate(data)
    }
    setIsFormOpen(false)
    setEditingTask(null)
  }

  const handleQuickAdd = () => {
    // Buka popup TAMBAH (bukan edit) — tanggal sudah fix hari ini, disembunyikan di form
    setEditingTask(null)
    setIsFormOpen(true)
  }

  // Tasks currently being worked on (status 'proses') — top group "Sedang Dikerjakan"
  const inProgressTasks = useMemo(() => {
    return todayTasks
      .filter((t: Task) => t.status === 'proses')
      .sort((a: Task, b: Task) => {
        // Revisi: anggota satu paket berurutan sesuai nomor urut (parent=1 dulu)
        if (a.group_id && b.group_id && a.group_id === b.group_id) {
          const go = (a.group_order ?? 99) - (b.group_order ?? 99)
          if (go !== 0) return go
        }
        return new Date(a.started_at || a.created_at).getTime() - new Date(b.started_at || b.created_at).getTime()
      })
  }, [todayTasks])

  // Remaining pending tasks grouped by priority ('proses' tasks live in "Sedang Dikerjakan")
  const tasksByPriority = useMemo(() => {
    return PRIORITY_ORDER.map(priority => {
      const tasks = todayTasks
        .filter((t: Task) => t.prioritas === priority && t.status === 'belum')
        .sort((a: Task, b: Task) => {
          // Revisi: anggota satu paket berurutan sesuai nomor urut (parent=1 dulu)
          if (a.group_id && b.group_id && a.group_id === b.group_id) {
            const go = (a.group_order ?? 99) - (b.group_order ?? 99)
            if (go !== 0) return go
          }
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
      return { priority, tasks }
    })
  }, [todayTasks])

  const stats = useMemo(() => {
    const activeMissions = todayTasks.filter((t: Task) => t.status === 'belum' || t.status === 'proses').length
    const completedMissions = todayTasks.filter((t: Task) => t.status === 'selesai').length
    const totalToday = todayTasks.length
    const hasAnyTasks = todayTasks.length > 0
    const hasActiveTasks = activeMissions > 0
    return { activeMissions, completedMissions, totalToday, hasAnyTasks, hasActiveTasks }
  }, [todayTasks])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className={CARD_BASE}>
          <CardContent className="py-12 text-center space-y-4">
            <div className="space-y-4 w-full max-w-xs mx-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              ))}
              <p className="text-xs text-slate-500 font-mono text-center">Memuat misi...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className={CARD_BASE}><CardContent className="py-12 text-center"><p className="text-destructive">Gagal memuat misi: {error.message}</p></CardContent></Card>
      </div>
    )
  }

  const hasPendingTasks = tasksByPriority.some(({ tasks }) => tasks.length > 0)
  const showBoard = stats.hasActiveTasks

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Toolbar seleksi massal */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-slate-500">
          {selectionMode
            ? `${selectedIds.size} tugas terpilih`
            : `Total ${stats.totalToday} tugas hari ini`}
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}
                className="h-8 text-[12px]">
                {selectedIds.size === allTodayIds.length && allTodayIds.length > 0 ? 'Batal Pilih Semua' : `Pilih Semua (${allTodayIds.length})`}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleteTasks.isPending}
                className="h-8 text-[12px]">
                {bulkDeleteTasks.isPending ? 'Menghapus...' : `Hapus${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setSelectionMode(false); clearSelection() }}
                className="h-8 text-[12px]">
                Batal
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}
              disabled={stats.totalToday === 0}
              className="h-8 text-[12px]">
              Pilih Tugas
            </Button>
          )}
        </div>
      </div>

      {showBoard ? (
        <div className="space-y-8">
          {/* Group "Sedang Dikerjakan" — paling atas */}
          {inProgressTasks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-2xl mt-0.5 flex-shrink-0">🛠️</span>
                <h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">
                  Sedang Dikerjakan
                  <span className="ml-1.5 text-sm font-semibold text-slate-500">({inProgressTasks.length})</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {inProgressTasks.map((task: Task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onPause={handlePause}
                  onResume={handleResume}
                  onStart={handleStartRequest}
                  onMoveUp={() => handleReorder(task, 'up')}
                  onMoveDown={() => handleReorder(task, 'down')}
                  canMoveUp={task.group_id != null && task.group_order != null && task.group_order > 1}
                  canMoveDown={task.group_id != null && task.group_order != null && task.group_order < (inProgressTasks.filter((t: Task) => t.group_id === task.group_id && t.group_order != null).length)}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(task.id)}
                  onToggleSelect={toggleSelect}
                />
                ))}
              </div>
            </div>
          )}

          {/* Priority groups — hanya tugas 'belum' */}
          {hasPendingTasks && (
            <div className="space-y-8">
              {tasksByPriority.filter(({ tasks }) => tasks.length > 0).map(({ priority, tasks }) => (
                <div key={priority} className="space-y-4">
                  <div className="flex items-start gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-2xl mt-0.5 flex-shrink-0">{getMissionPriorityIcon(priority)}</span>
                    <h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">
                      {getMissionGroupName(priority)}
                      <span className="ml-1.5 text-sm font-semibold text-slate-500">({tasks.length})</span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasks.map((task: Task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                      onSetGroup={setGroupTask}
                        onPause={handlePause}
                        onResume={handleResume}
                        onStart={handleStartRequest}
                        onMoveUp={() => handleReorder(task, 'up')}
                        onMoveDown={() => handleReorder(task, 'down')}
                        canMoveUp={task.group_id != null && task.group_order != null && task.group_order > 1}
                        canMoveDown={task.group_id != null && task.group_order != null && task.group_order < (tasks.filter((t: Task) => t.group_id === task.group_id && t.group_order != null).length)}
                        selectionMode={selectionMode}
                        selected={selectedIds.has(task.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All done */}
          {!hasPendingTasks && inProgressTasks.length === 0 && stats.hasAnyTasks && (
            <div className="py-16 text-center">
              <Card className="border-dashed border-slate-200/50 dark:border-slate-700/50 bg-white">
                <CardContent className="py-12">
                  <span className="text-4xl mb-4 block" aria-hidden="true">✅</span>
                  <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Semua misi hari ini sudah selesai!</p>
                  <p className="text-sm text-slate-500 mb-6">Kerja bagus! Tidak ada tugas yang belum dikerjakan.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center">
          <Card className="border-dashed border-slate-200/50 dark:border-slate-700/50 bg-white">
            <CardContent className="py-12">
              {stats.hasAnyTasks ? (
                <>
                  <span className="text-4xl mb-4 block" aria-hidden="true">✅</span>
                  <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Semua misi hari ini sudah selesai!</p>
                  <p className="text-sm text-slate-500 mb-6">Kerja bagus! Tidak ada tugas yang belum dikerjakan.</p>
                </>
              ) : (
                <>
                  <span className="text-4xl mb-4 block" aria-hidden="true">📋</span>
                  <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Belum ada misi untuk hari ini</p>
                  <p className="text-sm text-slate-500 mb-6">Tambahkan tugas baru untuk mulai menyusun rencana hari ini.</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Action Button */}
      <Button
        onClick={handleQuickAdd}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Tambah tugas baru"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Revisi 10: popup peringatan prioritas — tugas yang diklik bukan prioritas tertinggi */}
      <Dialog open={!!pendingStart} onOpenChange={(open) => !open && setPendingStart(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Peringatan Prioritas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Kamu akan mengerjakan{' '}
              <span className="font-semibold text-slate-900 dark:text-white capitalize">
                “{pendingStart?.nama}”
              </span>
              , padahal masih ada tugas dengan prioritas lebih tinggi yang belum dikerjakan hari ini.
            </p>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Apakah kamu ingin mengabaikan tugas prioritas lebih tinggi dan tetap mengerjakan tugas ini?
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPendingStart(null)}>Batal</Button>
            <Button
              onClick={() => {
                if (pendingStart) handleStatusChange(pendingStart.id, 'proses')
                setPendingStart(null)
              }}
            >
              Ya, kerjakan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Task Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}</DialogTitle></DialogHeader>
          <TaskForm initialData={editingTask} hideDate={!editingTask} onSubmit={handleSubmit} onCancel={() => { setIsFormOpen(false); setEditingTask(null) }} />
        </DialogContent>
      </Dialog>
      {/* Revisi batch 12: dialog penanda paket */}
      <TaskGroupDialog
        open={!!groupTask}
        onOpenChange={(open) => !open && setGroupTask(null)}
        task={groupTask}
        allTasks={todayTasks}
        isSaving={updateTask.isPending}
        onSave={(data) => {
          if (!groupTask) return
          updateTask.mutate(
            { id: groupTask.id, data },
            { onSuccess: () => setGroupTask(null), onError: () => alert('Gagal menyimpan penanda paket. Pastikan migrasi SQL terbaru sudah dijalankan.') }
          )
        }}
      />
    </div>
  )
}

export default function HariIniPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Card className={CARD_BASE}><CardContent className="py-12 text-center"><p className="text-muted-foreground">Memuat misi...</p></CardContent></Card></div>}>
      <HariIniPageClient />
    </Suspense>
  )
}
