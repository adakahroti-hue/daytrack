"use client"

import { useState, useMemo, useEffect } from 'react'
import { format, isToday, isWithinInterval, startOfWeek, endOfWeek, isBefore, startOfDay, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, Edit, Trash2, Search, X, Clock, Calendar, Play, Check, CheckCircle2, MoreHorizontal, Flag, Filter, Zap, Target, TrendingUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn, getEstimasiText, getMissionStatusColor, getMissionPriorityColor, getMissionPriorityIcon, getMissionGroupName, getMissionPriorityShortLabel, getMissionPriorityBorder, getMissionGroupDescriptionWithCount, CARD_BASE, CARD_HOVER, STAT_ICON_CONTAINERS, BRAND_COLORS, getActualDurationText, compareEstimasiVsActual, getLiveDurationText } from '@/lib/utils'
import { TaskForm } from '@/components/tasks/TaskForm'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus } from '@/hooks/useTasks'
import { useTasksRealtime } from '@/hooks/useRealtime'
import { Suspense } from 'react'

type Task = {
  id: string
  user_id: string
  nama: string
  tanggal: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: 'belum' | 'proses' | 'selesai'
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
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

const SORT_OPTIONS = [
  { value: 'priority', label: 'Prioritas Tertinggi' },
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'dueDate', label: 'Deadline Terdekat' },
] as const

type SortOption = typeof SORT_OPTIONS[number]['value']

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

const PRIORITY_ICONS: Record<Task['prioritas'], React.ReactNode> = {
  p1: <Zap className="h-3.5 w-3.5" />,
  p2: <Flag className="h-3.5 w-3.5" />,
  p3: <Target className="h-3.5 w-3.5" />,
  p4: <TrendingUp className="h-3.5 w-3.5" />,
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: 'belum' | 'proses' | 'selesai') => void
}) {
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

  // Card styling: blue glow for active (in progress), neutral for others
  const isActiveFocus = isInProgress
  const cardBorderClass = cn(
    CARD_BASE,
    CARD_HOVER,
    isCompleted && 'opacity-60',
    isActiveFocus && 'border-[#2563EB] shadow-[0_0_0_3px_rgba(37,99,235,0.15)] bg-[#EFF6FF]/40 dark:bg-[#2563EB]/5',
  )

  // Use utility functions for duration comparison
  const actualDurationText = task.status === 'selesai' && task.started_at && task.completed_at 
    ? getActualDurationText(task.started_at, task.completed_at)
    : null
  
  const comparison = task.status === 'selesai' && task.started_at && task.completed_at
    ? compareEstimasiVsActual(task.estimasi_menit, task.started_at, task.completed_at)
    : null

  return (
    <Card className={cn('group', cardBorderClass)}>
      <CardContent className="p-4 space-y-3">
        {/* Top Row: Priority Badge + Dropdown Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={priorityBadgeClass}>
              {PRIORITY_ICONS[task.prioritas]}
              {getMissionPriorityShortLabel(task.prioritas)}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-70"
                aria-label="Menu tugas"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => onEdit(task)}
                className="flex items-center gap-2"
                inset={false}
              >
                <Edit className="h-3.5 w-3.5" />Edit Tugas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
                inset={false}
              >
                <Trash2 className="h-3.5 w-3.5" />Hapus Tugas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Task Title - Most Prominent */}
        <h3 className="font-medium text-base leading-tight truncate pr-8 capitalize">{task.nama}</h3>

        {/* Duration Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Estimasi: {getEstimasiText(task.estimasi_menit)}</span>
          </div>
          
          {/* Real duration for completed tasks */}
          {actualDurationText && comparison && (
            <>
              <div className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5" />
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
          
          {/* Live duration for in-progress tasks */}
          {task.status === 'proses' && task.started_at && (
            <div className="flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300 animate-pulse">
              <Clock className="h-3.5 w-3.5" />
              <span>Sedang: {getLiveDurationText(task.started_at)}</span>
            </div>
          )}
        </div>

        {/* Bottom Row: Status Badge + Primary Action */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Badge variant="outline" className={statusBadgeClass}>
            {task.status === 'belum' ? 'Belum' : task.status === 'proses' ? 'Proses' : 'Selesai'}
          </Badge>
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
              <span className="sm:hidden">{isPending ? 'Ambil' : isInProgress ? 'Selesai' : 'Selesai'}</span>
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// ProgressBar - shows completed/total with percentage
// ============================================
function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
        {completed}/{total}
      </span>
    </div>
  )
}

// ============================================
// Main Component
// ============================================
function HariIniPageClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // Fetch ALL tasks for today (no status filter) — include 'belum' and 'proses'
  const { data: todayTasks = [], isLoading: todayLoading, error: todayError } = useTasks(todayStr)

  useTasksRealtime([['tasks', todayStr]], `tanggal=eq.${todayStr}`)

  const isLoading = todayLoading
  const error = todayError

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTaskStatus = useToggleTaskStatus()

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

  const handleStatusChange = (id: string, status: 'belum' | 'proses' | 'selesai') => {
    toggleTaskStatus.mutate({ id, status })
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

  const handleQuickAdd = () => {
    setEditingTask({ id: '', nama: '', tanggal: todayStr, estimasi_menit: 30, prioritas: 'p3', status: 'belum' })
    setIsFormOpen(true)
  }

  // Loading progress bar component
  function LoadingBar() {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 h-1.5 bg-slate-100 dark:bg-slate-800">
        <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 animate-loading-bar" style={{ width: '100%' }} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingBar />
        <Card className={CARD_BASE}><CardContent className="py-12 text-center"><p className="text-muted-foreground">Memuat misi...</p></CardContent></Card>
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

  // Group tasks by priority
  const tasksByPriority = PRIORITY_ORDER.map(priority => {
    const tasks = todayTasks
      .filter(t => t.prioritas === priority && t.status !== 'selesai')
    const sortedTasks = [...tasks].sort((a, b) => {
      const aStatus = a.status as Task['status']
      const bStatus = b.status as Task['status']
      const statusDiff = STATUS_ORDER.indexOf(aStatus) - STATUS_ORDER.indexOf(bStatus)
      if (statusDiff !== 0) return statusDiff
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    return { priority, tasks: sortedTasks }
  })

  // Stats for header: only count belum tasks (not completed)
  const activeMissions = todayTasks.filter(t => t.status === 'belum' || t.status === 'proses').length
  const totalEstimatedMinutes = todayTasks
    .filter((t: Task) => t.status !== 'selesai')
    .reduce((sum, t) => sum + t.estimasi_menit, 0)
  const completedMissions = todayTasks.filter(t => t.status === 'selesai').length
  const totalToday = todayTasks.length
  const hasAnyTasks = todayTasks.length > 0
  // Has active (non-completed) tasks
  const hasActiveTasks = activeMissions > 0

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Mission Board - Priority Groups */}
      {hasActiveTasks ? (
        <div className="space-y-8">
          {tasksByPriority.map(({ priority, tasks }) => {
            if (tasks.length === 0) return null

            return (
              <div key={priority} className="space-y-4">
                {/* Priority Section Header */}
                <div className="flex items-start gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-2xl mt-0.5 flex-shrink-0">{getMissionPriorityIcon(priority)}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">{getMissionGroupName(priority)}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{getMissionGroupDescriptionWithCount(priority, tasks.length)}</p>
                  </div>
                </div>

                {/* Task Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center">
          <Card className="border-dashed border-slate-200/50 dark:border-dashed dark:border-slate-700/50 bg-white">
            <CardContent className="py-12">
              {hasAnyTasks ? (
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

      {/* Floating Action Button - Fixed bottom right */}
      <Button
        onClick={handleQuickAdd}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Tambah tugas baru"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add Task Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}</DialogTitle></DialogHeader>
          <TaskForm initialData={editingTask} onSubmit={handleSubmit} onCancel={() => { setIsFormOpen(false); setEditingTask(null) }} />
        </DialogContent>
      </Dialog>
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