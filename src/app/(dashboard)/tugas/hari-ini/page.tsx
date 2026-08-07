"use client"

import { useState, useMemo, useEffect, memo } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, Edit, Trash2, Clock, Play, Pause, Check, CheckCircle2, MoreHorizontal, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn, getEstimasiText, getMissionStatusColor, getMissionPriorityColor, getMissionPriorityIcon, getMissionGroupName, getMissionPriorityShortLabel, getMissionGroupDescriptionWithCount, CARD_BASE, CARD_HOVER, getTaskActualDurationText, compareTaskEstimasiVsActual, getTaskLiveDurationText } from '@/lib/utils'
import { TaskForm } from '@/components/tasks/TaskForm'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus, usePauseTask, useResumeTask } from '@/hooks/useTasks'
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
  terlewat_tanggal?: string | null
  accumulated_seconds?: number | null
  is_paused?: boolean | null
  last_resumed_at?: string | null
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

const PRIORITY_ICONS: Record<Task['prioritas'], string> = {
  p1: '🔥',
  p2: '⚡',
  p3: '📌',
  p4: '🌱',
}

const TaskCard = memo(({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onPause,
  onResume,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: 'belum' | 'proses' | 'selesai') => void
  onPause: (id: string) => void
  onResume: (id: string) => void
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
      onStatusChange(task.id, 'proses')
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
  const cardBorderClass = cn(
    CARD_BASE,
    CARD_HOVER,
    isCompleted && 'opacity-60',
    isActiveFocus && 'border-[#2563EB] shadow-[0_0_0_3px_rgba(37,99,235,0.15)] bg-[#EFF6FF]/40 dark:bg-[#2563EB]/5',
  )

  // Pause-aware durations
  const actualDurationText = task.status === 'selesai' && task.started_at && task.completed_at
    ? getTaskActualDurationText(task)
    : null

  const comparison = task.status === 'selesai' && task.started_at && task.completed_at
    ? compareTaskEstimasiVsActual(task)
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
              <DropdownMenuItem onClick={() => onEdit(task)} className="flex items-center gap-2" inset={false}>
                <Edit className="h-3.5 w-3.5" />Edit Tugas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="flex items-center gap-2 text-destructive focus:text-destructive" inset={false}>
                <Trash2 className="h-3.5 w-3.5" />Hapus Tugas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Task Title */}
        <h3 className="font-medium text-base leading-tight truncate pr-8 capitalize">{task.nama}</h3>

        {/* Terlewat note */}
        {task.terlewat_tanggal && task.status !== 'selesai' && (
          <div className="flex items-center gap-1.5 w-fit text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Terlewat — dijadwal ulang dari {format(new Date(task.terlewat_tanggal + 'T00:00:00'), 'd MMMM', { locale: id })}</span>
          </div>
        )}

        {/* Duration Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Estimasi: {getEstimasiText(task.estimasi_menit)}</span>
          </div>

          {/* Real duration for completed tasks (pause-aware) */}
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

          {/* Live duration for in-progress tasks (pause-aware) */}
          {isInProgress && task.started_at && (
            <div className={cn(
              'flex items-center gap-1 text-sm',
              isPaused ? 'text-slate-500 dark:text-slate-400' : 'text-amber-700 dark:text-amber-300 animate-pulse'
            )}>
              <Clock className="h-3.5 w-3.5" />
              <span>{isPaused ? 'Dijeda — ' : 'Sedang: '}{getTaskLiveDurationText(task)}</span>
            </div>
          )}
        </div>

        {/* Bottom Row: Status Badge + Pause/Resume + Primary Action */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Badge variant="outline" className={statusBadgeClass}>
            {task.status === 'belum' ? 'Belum' : task.status === 'proses' ? (isPaused ? 'Dijeda' : 'Proses') : 'Selesai'}
          </Badge>
          <div className="flex items-center gap-2">
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

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const { data: todayTasks = [], isLoading, error } = useTasks(todayStr)

  useTasksRealtime([['tasks', todayStr]], `tanggal=eq.${todayStr}`)

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTaskStatus = useToggleTaskStatus()
  const pauseTask = usePauseTask()
  const resumeTask = useResumeTask()

  const handleEdit = (task: Task) => {
    setEditingTask({
      id: task.id,
      nama: task.nama,
      tanggal: task.tanggal,
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

  const handleStatusChange = (id: string, status: 'belum' | 'proses' | 'selesai') => {
    toggleTaskStatus.mutate({ id, status })
  }

  const handlePause = (id: string) => pauseTask.mutate(id)
  const handleResume = (id: string) => resumeTask.mutate(id)

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
    setEditingTask({ id: '', nama: '', tanggal: todayStr, estimasi_menit: 30, prioritas: 'p3', status: 'belum' })
    setIsFormOpen(true)
  }

  // Tasks currently being worked on (status 'proses') — top group "Sedang Dikerjakan"
  const inProgressTasks = useMemo(() => {
    return todayTasks
      .filter((t: Task) => t.status === 'proses')
      .sort((a: Task, b: Task) => new Date(a.started_at || a.created_at).getTime() - new Date(b.started_at || b.created_at).getTime())
  }, [todayTasks])

  // Remaining pending tasks grouped by priority ('proses' tasks live in "Sedang Dikerjakan")
  const tasksByPriority = useMemo(() => {
    return PRIORITY_ORDER.map(priority => {
      const tasks = todayTasks
        .filter((t: Task) => t.prioritas === priority && t.status === 'belum')
        .sort((a: Task, b: Task) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
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
      {showBoard ? (
        <div className="space-y-8">
          {/* Group "Sedang Dikerjakan" — paling atas */}
          {inProgressTasks.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-700/50">
                <span className="text-2xl mt-0.5 flex-shrink-0">🛠️</span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">Sedang Dikerjakan</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{inProgressTasks.length} misi sedang dikerjakan — timer hanya berjalan saat aktif</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressTasks.map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                    onPause={handlePause}
                    onResume={handleResume}
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
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">{getMissionGroupName(priority)}</h2>
                      <p className="text-sm text-slate-500 mt-0.5">{getMissionGroupDescriptionWithCount(priority, tasks.length)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasks.map((task: Task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                        onPause={handlePause}
                        onResume={handleResume}
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

      {/* Add/Edit Task Dialog */}
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
