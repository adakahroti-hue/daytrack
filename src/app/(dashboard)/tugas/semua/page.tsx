"use client"

import { useState, useMemo, useEffect, memo } from 'react'
import { format, isToday, isWithinInterval, startOfWeek, endOfWeek, isBefore, startOfDay, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, Edit, Trash2, Clock, Calendar, Play, Check, CheckCircle2, MoreHorizontal, Flag, Target, AlertTriangle, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { cn, getEstimasiText, getMissionStatusColor, getMissionPriorityColor, getMissionPriorityIcon, getMissionGroupName, getMissionPriorityShortLabel, getMissionPriorityBorder, getMissionGroupDescriptionWithCount, CARD_BASE, CARD_HOVER, STAT_ICON_CONTAINERS, BRAND_COLORS, getActualDurationText, compareEstimasiVsActual, getLiveDurationText, PRIORITY_COLORS } from '@/lib/utils'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskGroupRibbon, TaskGroupDialog } from '@/components/tasks/task-group'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus, useBulkUpdateTaskDate } from '@/hooks/useTasks'
import { useTasksRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'
import { Suspense } from 'react'

type Task = {
  id: string
  user_id: string
  nama: string
  tanggal: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: 'belum' | 'proses' | 'selesai'
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  terlewat_tanggal?: string | null
  group_id?: string | null
  group_order?: number | null
}

type TaskFormData = {
  nama: string
  tanggal: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: 'belum' | 'proses' | 'selesai'
}

type EditingTask = TaskFormData & { id: string }

const PRIORITY_ORDER: Task['prioritas'][] = ['p1', 'p2', 'p3', 'p4']
const STATUS_ORDER: Task['status'][] = ['belum', 'proses', 'selesai']

const STATUS_LABELS: Record<Task['status'], string> = {
  belum: 'Belum',
  proses: 'Sedang Dikerjakan',
  selesai: 'Selesai',
}

const STATUS_SHORT_LABELS: Record<Task['status'], string> = {
  belum: 'Belum',
  proses: 'Proses',
  selesai: 'Selesai',
}

const PRIORITY_FULL_LABELS: Record<Task['prioritas'], string> = {
  p1: 'Mendesak',
  p2: 'Tinggi',
  p3: 'Sedang',
  p4: 'Rendah',
}

const PRIORITY_ICONS: Record<Task['prioritas'], string> = {
  p1: '🔥',
  p2: '⚡',
  p3: '📌',
  p4: '🌱',
}

// ============================================
// CompactStatCard - small stat card for inline header
// ============================================
function CompactStatCard({ label, value, valueColor }: { 
  label: string
  value: number | string
  valueColor: string
}) {
  return (
    <div className="flex flex-col items-start gap-1 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg min-w-[80px]">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
    </div>
  )
}

// ============================================
// Revisi 9: warna background card mengikuti aturan tab Hari Ini (sticky note per prioritas)
const PRIORITY_CARD_COLORS: Record<string, string> = {
  p1: 'bg-rose-50 border-rose-300 hover:border-rose-400 dark:bg-rose-950/40 dark:border-rose-800',
  p2: 'bg-amber-50 border-amber-300 hover:border-amber-400 dark:bg-amber-950/40 dark:border-amber-800',
  p3: 'bg-green-50 border-green-300 hover:border-green-400 dark:bg-green-950/40 dark:border-green-800',
  p4: 'bg-purple-50 border-purple-300 hover:border-purple-400 dark:bg-purple-950/40 dark:border-purple-800',
}

// TaskCard Component - Clean, consistent height, neutral by default
// ============================================
const TaskCard = memo(({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  selectionMode,
  selected,
  onToggleSelect,
  onSetGroup,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: Task['status']) => void
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onSetGroup?: (task: Task) => void
}) => {
  const isCompleted = task.status === 'selesai'
  const isInProgress = task.status === 'proses'
  const isPending = task.status === 'belum'

  const handlePrimaryAction = () => {
    if (isPending) {
      onStatusChange(task.id, 'proses')
    } else if (isInProgress) {
      onStatusChange(task.id, 'selesai')
    }
  }

  const primaryButtonText = isPending ? 'Mulai' : isInProgress ? 'Selesai' : 'Selesai'
  const primaryButtonDisabled = isCompleted

  const PrimaryButtonIcon = () => {
    if (isPending) return <Play className="h-3.5 w-3.5" />
    if (isInProgress) return <Check className="h-3.5 w-3.5" />
    return <CheckCircle2 className="h-3.5 w-3.5" />
  }

  const taskDate = new Date(task.tanggal)
  const today = startOfDay(new Date())
  const isOverdue = isBefore(taskDate, today) && !isCompleted
  const daysOverdue = isOverdue ? differenceInDays(today, taskDate) : 0

  // Status badge style - consistent pill style
  const statusBadgeClass = cn(
    'text-xs font-medium px-2.5 py-1 rounded-lg border',
    getMissionStatusColor(task.status)
  )

  // Priority badge style - consistent pill style
  const priorityBadgeClass = cn(
    'text-xs font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1',
    getMissionPriorityColor(task.prioritas)
  )

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        isCompleted
          ? CARD_BASE
          : cn(
              'rounded-xl transition-colors duration-200',
              isInProgress
                ? 'bg-blue-50 border-blue-300 hover:border-blue-400 dark:bg-blue-950/40 dark:border-blue-800'
                : PRIORITY_CARD_COLORS[task.prioritas]
            ),
        CARD_HOVER,
        isCompleted && 'opacity-60',
        isOverdue && !isCompleted && 'border-l-3 border-l-red-400 dark:border-l-red-500',
        isInProgress && 'border-l-3 border-l-amber-400 dark:border-l-amber-500'
      )}
    >
      {/* Revisi batch 12: pita penanda paket */}
      {task.group_id && task.group_order != null && (
        <TaskGroupRibbon groupId={task.group_id} order={task.group_order} />
      )}
      <CardContent className="pt-4 pb-3 px-4 space-y-2.5">
        {/* Revisi batch 12: top row ala Hari Ini — judul + menu sebaris, tanpa badge teks prioritas */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectionMode && (
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect?.(task.id)}
                className="h-4 w-4 shrink-0"
                aria-label="Pilih tugas"
              />
            )}
            <h3 className={cn("font-medium text-base leading-tight truncate capitalize flex-1 min-w-0", task.group_id && "pl-7")}>{task.nama}</h3>
          </div>
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onEdit(task)}
                className="flex items-center gap-2"
                inset={false}
              >
                <Edit className="h-4 w-4" />Edit Tugas
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSetGroup?.(task)}
                className="flex items-center gap-2"
                inset={false}
              >
                <Layers className="h-4 w-4" />Penanda Paket
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
                inset={false}
              >
                <Trash2 className="h-4 w-4" />Hapus Tugas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Terlewat note — tugas dijadwalkan ulang otomatis */}
        {task.terlewat_tanggal && task.status !== 'selesai' && (
          <div className="flex items-center gap-1.5 w-fit text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Terlewat — dijadwal ulang dari {format(new Date(task.terlewat_tanggal + 'T00:00:00'), 'd MMMM', { locale: id })}</span>
          </div>
        )}

        {/* Meta Info: Duration + Date — compact */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Estimasi: {getEstimasiText(task.estimasi_menit)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className={cn('whitespace-nowrap', isOverdue && 'text-destructive font-medium')}>
                {format(taskDate, 'd MMM yyyy', { locale: id })}
                {isOverdue && !isCompleted && (
                  <Badge variant="outline" className="ml-1.5 text-xs px-2 py-0.5 gap-1 h-5 text-destructive border-destructive/30 bg-destructive/10">
                    <AlertTriangle className="h-3 w-3" />
                    Terlambat {daysOverdue} hari
                  </Badge>
                )}
              </span>
            </div>
          </div>
         
          {/* Real duration for completed tasks */}
          {task.status === 'selesai' && task.started_at && task.completed_at && (
            <div className="space-y-1 pl-6 border-l border-border/50">
              <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5" />
                <span>Real: {getActualDurationText(task.started_at, task.completed_at)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {(() => {
                  const cmp = compareEstimasiVsActual(task.estimasi_menit, task.started_at, task.completed_at)
                  if (cmp.status === 'unknown') return <span className="text-muted-foreground">Belum ada data</span>
                  const icon = cmp.status === 'lebih-cepat' ? '🟢' : cmp.status === 'lebih-lama' ? '🔴' : '⚪'
                  const label = cmp.status === 'lebih-cepat' ? 'Lebih cepat' : cmp.status === 'lebih-lama' ? 'Lebih lama' : 'Pas'
                  return (
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${cmp.status === 'lebih-cepat' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : cmp.status === 'lebih-lama' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {icon} {label} {cmp.selisihText}
                    </span>
                  )
                })()}
              </div>
            </div>
          )}
         
          {/* Live duration for in-progress tasks */}
          {task.status === 'proses' && task.started_at && (
            <div className="flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300 animate-pulse pl-6 border-l border-amber-400/50">
              <Clock className="h-3.5 w-3.5" />
              <span>Sedang: {getLiveDurationText(task.started_at)}</span>
            </div>
          )}
        </div>

        {/* Bottom Row: Status Badge + Primary Action - Fixed at bottom */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Badge variant="outline" className={statusBadgeClass}>
            {STATUS_SHORT_LABELS[task.status]}
          </Badge>
          <Button
            variant={isCompleted ? 'outline' : 'default'}
            size="sm"
            className={cn(
              'w-auto sm:w-auto',
              isCompleted && 'bg-muted text-muted-foreground hover:bg-muted/80 border-border',
              isPending && `${BRAND_COLORS.primary} ${BRAND_COLORS.primaryHover} shadow-sm`,
              isInProgress && 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
            )}
            onClick={handlePrimaryAction}
            disabled={primaryButtonDisabled}
            aria-label={primaryButtonText}
          >
            <span className="flex items-center gap-1.5">
              <PrimaryButtonIcon />
              <span className="hidden sm:inline">{primaryButtonText}</span>
              <span className="sm:hidden">{isPending ? 'Mulai' : 'Selesai'}</span>
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

// ============================================
// StatsCard - Consistent stat card
// ============================================
function StatsCard({ label, value, icon: Icon, iconContainerClass }: { 
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  iconContainerClass: string
}) {
  return (
    <Card className={CARD_BASE}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconContainerClass}`}>
            <Icon className="h-5.5 w-5.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Compact StatsInline - 2 small cards inline with button
// ============================================
function StatsInline({ todayTasks }: { todayTasks: Task[] }) {
  const total = todayTasks.length
  const overdue = todayTasks.filter(t => {
    const taskDate = new Date(t.tanggal)
    const today = startOfDay(new Date())
    return isBefore(taskDate, today) && t.status !== 'selesai'
  }).length

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CompactStatCard
        label="Total"
        value={total}
        valueColor="text-[#0F172A]"
      />
      <CompactStatCard
        label="Terlambat"
        value={overdue}
        valueColor="text-red-600"
      />
    </div>
  )
}

// ============================================
// Main Component
// ============================================
function SemuaPageClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  // groupMode ditinggikan ke HeaderControls — toggle-nya kini tampil di header (kanan card Terlambat)
  const { groupMode } = useHeaderControls()
  const [isMounted, setIsMounted] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDate, setBulkDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  // Revisi batch 12: penanda paket (parent/child/single)
  const [groupTask, setGroupTask] = useState<Task | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch ALL tasks - ALWAYS called
  const { data: allTasks = [], isLoading, error } = useTasks(undefined)

  // Subscribe to realtime - ALWAYS called
  useTasksRealtime([['tasks']])

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTaskStatus = useToggleTaskStatus()
  const bulkUpdateTaskDate = useBulkUpdateTaskDate()

  const handleEdit = (task: Task) => {
    const formData: EditingTask = {
      id: task.id,
      nama: task.nama,
      tanggal: task.tanggal,
      estimasi_menit: task.estimasi_menit,
      prioritas: task.prioritas,
      status: task.status,
    }
    setEditingTask(formData)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus tugas ini?')) {
      deleteTask.mutate(id)
    }
  }

  const handleStatusChange = (id: string, status: Task['status']) => {
    toggleTaskStatus.mutate({ id, status })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const handleSubmit = (data: TaskFormData) => {
    const taskData = { ...data }
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, data: taskData })
    } else {
      createTask.mutate(taskData)
    }
    setIsFormOpen(false)
    setEditingTask(null)
  }

  const totalTasks = allTasks.length

  // Today (for relative group labels)
  const today = format(new Date(), 'yyyy-MM-dd')

  // Board ini hanya menampilkan tugas 'belum' (bukan hari ini — punya tab sendiri) — proses disembunyikan, selesai punya tab sendiri
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => t.status === 'belum' && t.tanggal !== today)
  }, [allTasks, today])

  // Group tasks by selected mode — ALWAYS memoized
  const groupedTasks = useMemo(() => {
    const byPrioritySort = (a: Task, b: Task) => {
      const p = PRIORITY_ORDER.indexOf(a.prioritas) - PRIORITY_ORDER.indexOf(b.prioritas)
      if (p !== 0) return p
      const s = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      if (s !== 0) return s
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }

    // Rev 5: pisahkan tugas terlambat — untuk mode prioritas/tanggal/durasi, tugas terlambat
    // dikumpulkan dalam group "Terlambat" di bagian bawah (bukan tercampur di group lain)
    const todayStart = startOfDay(new Date())
    const overdueTasks = filteredTasks.filter(t => isBefore(new Date(t.tanggal), todayStart))
    const onTimeTasks = filteredTasks.filter(t => !isBefore(new Date(t.tanggal), todayStart))

    const groups: { key: string; title: string; description: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; tasks: Task[] }[] = []

    if (groupMode === 'tanggal') {
      // Group by tanggal dikerjakan (newest first)
      const byDate = new Map<string, Task[]>()
      for (const t of onTimeTasks) {
        if (!byDate.has(t.tanggal)) byDate.set(t.tanggal, [])
        byDate.get(t.tanggal)!.push(t)
      }
      const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a))
      for (const d of dates) {
        const tasks = byDate.get(d)!.sort(byPrioritySort)
        const title = d === today ? 'Hari Ini' : format(new Date(d + 'T00:00:00'), 'EEEE, d MMM yyyy', { locale: id })
        groups.push({ key: d, title, description: `${tasks.length} tugas`, icon: Calendar, iconColor: 'text-blue-600 dark:text-blue-400', tasks })
      }
    } else if (groupMode === 'durasi') {
      // Group by estimasi durasi
      const buckets = [
        { key: 'singkat', label: 'Singkat', desc: '< 30 menit', min: 0, max: 29 },
        { key: 'sedang', label: 'Sedang', desc: '30-60 menit', min: 30, max: 60 },
        { key: 'panjang', label: 'Panjang', desc: '1-2 jam', min: 61, max: 120 },
        { key: 'sangat-panjang', label: 'Sangat Panjang', desc: '> 2 jam', min: 121, max: Number.MAX_SAFE_INTEGER },
      ]
      for (const b of buckets) {
        const tasks = onTimeTasks
          .filter(t => t.estimasi_menit >= b.min && t.estimasi_menit <= b.max)
          .sort(byPrioritySort)
        if (tasks.length > 0) {
          groups.push({ key: b.key, title: b.label, description: `${b.desc} - ${tasks.length} tugas`, icon: Clock, iconColor: 'text-amber-600 dark:text-amber-400', tasks })
        }
      }
    } else if (groupMode === 'lambat') {
      // Group by keterlambatan — hanya tampilkan tugas yang terlambat saja
      const terlambat = [...overdueTasks].sort(byPrioritySort)
      if (terlambat.length > 0) {
        groups.push({ key: 'terlambat', title: 'Terlambat', description: `${terlambat.length} tugas melewati tanggal`, icon: AlertTriangle, iconColor: 'text-red-600 dark:text-red-400', tasks: terlambat })
      }
    } else {
      // Group by prioritas (default — same look as Hari Ini tab)
      for (const p of PRIORITY_ORDER) {
        const tasks = onTimeTasks.filter(t => t.prioritas === p).sort(byPrioritySort)
        if (tasks.length > 0) {
          groups.push({
            key: p,
            title: getMissionGroupName(p),
            description: getMissionGroupDescriptionWithCount(p, tasks.length),
            icon: Flag,
            iconColor: PRIORITY_COLORS[p].icon,
            tasks,
          })
        }
      }
    }

    // Rev 5: group "Terlambat" di bagian bawah (untuk mode prioritas/tanggal/durasi)
    if (groupMode !== 'lambat' && overdueTasks.length > 0) {
      groups.push({ key: 'terlambat', title: 'Terlambat', description: `${overdueTasks.length} tugas melewati tanggal`, icon: AlertTriangle, iconColor: 'text-red-600 dark:text-red-400', tasks: [...overdueTasks].sort(byPrioritySort) })
    }

    return groups
  }, [filteredTasks, groupMode, today])

  // Rev 7: daftar id tugas lambat (untuk Pilih Semua) & handler bulk ubah tanggal
  const allLambatIds = useMemo(() => groupedTasks.flatMap(g => g.tasks.map(t => t.id)), [groupedTasks])
  const selectAllLambat = () => setSelectedIds(new Set(allLambatIds))
  const clearSelection = () => setSelectedIds(new Set())
  const handleBulkUpdateDate = () => {
    if (selectedIds.size === 0) return
    bulkUpdateTaskDate.mutate(
      { ids: Array.from(selectedIds), tanggal: bulkDate },
      { onSuccess: () => setSelectedIds(new Set()) }
    )
  }

  // Empty state: totalTasks === 0 → belum ada tugas sama sekali;
  // filteredTasks kosong padahal ada tugas → semuanya sudah selesai
  const isCompletelyEmpty = totalTasks === 0

  // Loading progress bar component
  // Static skeleton loader — no setInterval, no CPU waste
  function SkeletonLoader() {
    return (
      <div className="space-y-4 w-full max-w-xs mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
        <p className="text-xs text-slate-500 font-mono text-center">Memuat tugas...</p>
      </div>
    )
  }

  // Render loading/error/mounted states CONDITIONALLY, but hooks already called
  if (!isMounted) {
    return (
      <div className="space-y-6">
        <Card className={CARD_BASE}>
          <CardContent className="py-12 text-center space-y-4">
            <SkeletonLoader />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className={CARD_BASE}>
          <CardContent className="py-12 text-center space-y-4">
            <SkeletonLoader />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className={CARD_BASE}><CardContent className="py-12 text-center"><p className="text-destructive">Gagal memuat tugas: {error.message}</p></CardContent></Card>
      </div>
    )
  }

  // Main render - all hooks already executed above
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Stats are now shown in the header — no inline stats here */}

      {/* Task Board - grouped sections (same look as Hari Ini tab) */}
      <div>
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center">
            {isCompletelyEmpty ? (
              <>
                <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-lg">Belum ada tugas</p>
                <p className="text-sm text-muted-foreground mt-1">Tambahkan tugas pertama Anda untuk memulai</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-lg">Semua tugas sudah selesai</p>
                <p className="text-sm text-muted-foreground mt-1">Tidak ada tugas aktif yang tersisa</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-8">
          {groupMode === 'lambat' && filteredTasks.length > 0 && (
            <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 shadow-sm">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 mr-1">
                {selectedIds.size > 0 ? `${selectedIds.size} terpilih` : 'Pilih tugas'}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={selectedIds.size === allLambatIds.length && allLambatIds.length > 0 ? clearSelection : selectAllLambat}
              >
                {selectedIds.size === allLambatIds.length && allLambatIds.length > 0 ? 'Batal Pilih' : 'Pilih Semua'}
              </Button>
              <input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm text-slate-700 dark:text-slate-200"
              />
              <Button
                size="sm"
                className="h-8 bg-[#0F172A] hover:bg-[#1E293B] text-white"
                disabled={selectedIds.size === 0 || bulkUpdateTaskDate.isPending}
                onClick={handleBulkUpdateDate}
              >
                {bulkUpdateTaskDate.isPending ? 'Menyimpan...' : 'Ubah Tanggal'}
              </Button>
            </div>
          )}
            {groupedTasks.map((group) => (
              <div key={group.key} className="space-y-4">
                {/* Group Header */}
                <div className="flex items-start gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-700/50 flex-wrap">
                  <group.icon className={cn('h-6 w-6 mt-0.5 flex-shrink-0', group.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white capitalize">{group.title}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{group.description}</p>
                  </div>
                </div>

                {/* Task Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                      selectionMode={groupMode === 'lambat'}
                      selected={selectedIds.has(task.id)}
                      onToggleSelect={toggleSelect}
                      onSetGroup={setGroupTask}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button - Fixed bottom right */}
      <Button
        onClick={() => { setEditingTask(null); setIsFormOpen(true) }}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Tambah tugas baru"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add/Edit Task Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}</DialogTitle>
          </DialogHeader>
          <TaskForm initialData={editingTask} onSubmit={handleSubmit} onCancel={() => { setIsFormOpen(false); setEditingTask(null) }} />
        </DialogContent>
      </Dialog>

      {/* Revisi batch 12: dialog penanda paket */}
      <TaskGroupDialog
        open={!!groupTask}
        onOpenChange={(open) => !open && setGroupTask(null)}
        task={groupTask}
        allTasks={allTasks}
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

export default function SemuaPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Card className={CARD_BASE}><CardContent className="py-12 text-center"><p className="text-muted-foreground">Memuat tugas...</p></CardContent></Card></div>}>
      <SemuaPageClient />
    </Suspense>
  )
}