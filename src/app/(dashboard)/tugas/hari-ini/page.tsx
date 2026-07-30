"use client"

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, Play, Check, CheckCircle2, MoreHorizontal, Clock, ChevronDown, Target, Zap, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn, getEstimasiText, getMissionStatusColor, getMissionPriorityColor, getMissionPriorityIcon, getMissionGroupName, getMissionPriorityShortLabel, getMissionPriorityBorder, getMissionGroupDescriptionWithCount, CARD_BASE, CARD_HOVER } from '@/lib/utils'
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

const PRIORITY_ICONS: Record<Task['prioritas'], React.ReactNode> = {
  p1: <Zap className="h-3.5 w-3.5" />,
  p2: <Flag className="h-3.5 w-3.5" />,
  p3: <Target className="h-3.5 w-3.5" />,
  p4: <ChevronDown className="h-3.5 w-3.5" />,
}

// ============================================
// TaskCard Component - Clean, neutral by default, blue for active
// ============================================
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

  // Status badge - consistent pill style
  const statusBadgeClass = cn(
    'text-xs font-medium px-2.5 py-1 rounded-lg border',
    getMissionStatusColor(task.status)
  )

  // Priority badge - consistent pill style
  const priorityBadgeClass = cn(
    'text-xs font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1',
    getMissionPriorityColor(task.prioritas)
  )

  // Card border: neutral by default, blue for active (in progress), subtle for completed
  const isActiveFocus = isInProgress
  const cardBorderClass = cn(
    CARD_BASE,
    CARD_HOVER,
    isCompleted && 'opacity-60',
    isActiveFocus && 'border-[#2563EB] shadow-[0_0_0_2px_rgba(37,99,235,0.08)]',
    // Remove priority left border - use neutral card border
    // getMissionPriorityBorder(task.prioritas)  // REMOVED
  )

  return (
    <Card className={cardBorderClass}>
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
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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

        {/* Estimated Duration */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{getEstimasiText(task.estimasi_menit)}</span>
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
              'w-full sm:w-auto',
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
              <span>{primaryButtonText}</span>
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// DailyFocusCard - Hero card, white with blue left border
// Now includes inline stats (Misi Aktif, Total Waktu, Selesai) next to title
// ============================================
function DailyFocusCard({ todayTasks }: { todayTasks: Task[] }) {
  const pendingToday = todayTasks.filter(t => t.status === 'belum')
  const inProgressToday = todayTasks.filter(t => t.status === 'proses')
  const completedToday = todayTasks.filter(t => t.status === 'selesai')
  const totalToday = todayTasks.length
  const doneToday = completedToday.length + inProgressToday.length

  // Stats for inline display
  const activeMissions = todayTasks.filter(t => t.status === 'belum' || t.status === 'proses').length
  const totalEstimatedMinutes = todayTasks.reduce((sum, t) => sum + t.estimasi_menit, 0)
  const completedMissions = todayTasks.filter(t => t.status === 'selesai').length

  if (totalToday === 0) {
    return (
      <Card className="border-dashed border-[#E2E8F0] dark:border-dashed dark:border-[#374151] bg-white">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 mx-auto mb-3 flex items-center justify-center">
            <Target className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Belum ada tugas untuk hari ini</p>
          {/* Note: Empty state no longer has add button here - FAB handles it */}
        </CardContent>
      </Card>
    )
  }

  // If all tasks are completed, show completion state
  const focusTask = inProgressToday[0] || pendingToday[0]
  const progressPercent = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0
  const allCompleted = pendingToday.length === 0 && inProgressToday.length === 0 && completedToday.length > 0

  if (allCompleted) {
    return (
      <Card className="bg-white border border-[#DDE3EC] border-l-3 border-l-green-500 rounded-xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Fokus Hari Ini</p>
                <p className="font-semibold text-base truncate text-slate-900 dark:text-white">Semua tugas selesai! 🎉</p>
                <p className="text-xs text-slate-500 mt-0.5">{completedToday.length} tugas diselesaikan</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:block w-32">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-semibold text-green-600">{doneToday}/{totalToday}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Inline Stats at bottom of card */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg min-w-[90px]">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Misi Aktif</p>
                <p className="text-sm font-bold text-[#2563EB]">{activeMissions}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg min-w-[90px]">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Waktu</p>
                <p className="text-sm font-bold text-[#0F172A]">{getEstimasiText(totalEstimatedMinutes)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg min-w-[90px]">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Selesai</p>
                <p className="text-sm font-bold text-green-600">{completedMissions}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border border-[#DDE3EC] border-l-3 border-l-[#2563EB] rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-[#2563EB]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Fokus Hari Ini</p>
              <p className="font-semibold text-base truncate text-slate-900 dark:text-white">{focusTask.nama}</p>
              <p className="text-xs text-slate-500 mt-0.5">{getEstimasiText(focusTask.estimasi_menit)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {totalToday > 0 && (
              <div className="hidden sm:block w-32">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{doneToday}/{totalToday}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB] rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Inline Stats: Misi Aktif, Total Waktu, Selesai - sebaris dengan judul */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg min-w-[90px]">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Misi Aktif</p>
              <p className="text-sm font-bold text-[#2563EB]">{activeMissions}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg min-w-[90px]">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Waktu</p>
              <p className="text-sm font-bold text-[#0F172A]">{getEstimasiText(totalEstimatedMinutes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg min-w-[90px]">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Selesai</p>
              <p className="text-sm font-bold text-green-600">{completedMissions}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Compact SummaryCard - smaller for inline header (no icon)
// ============================================
function CompactSummaryCard({ label, value, numberColor }: { 
  label: string
  value: number | string
  numberColor: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg min-w-[90px]">
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-bold ${numberColor}`}>{value}</p>
      </div>
    </div>
  )
}

// ============================================
// StatsInline - 3 compact cards inline with button
// ============================================
function StatsInline({ todayTasks }: { todayTasks: Task[] }) {
  const activeMissions = todayTasks.filter(t => t.status === 'belum' || t.status === 'proses').length
  const totalEstimatedMinutes = todayTasks.reduce((sum, t) => sum + t.estimasi_menit, 0)
  const completedMissions = todayTasks.filter(t => t.status === 'selesai').length

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CompactSummaryCard
        label="Misi Aktif"
        value={activeMissions}
        numberColor="text-[#2563EB]"
      />
      <CompactSummaryCard
        label="Total Waktu"
        value={getEstimasiText(totalEstimatedMinutes)}
        numberColor="text-[#0F172A]"
      />
      <CompactSummaryCard
        label="Selesai"
        value={completedMissions}
        numberColor="text-green-600"
      />
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

  const { data: todayTasks = [], isLoading: todayLoading, error: todayError } = useTasks(todayStr)

  useTasksRealtime([
    ['tasks', todayStr],
  ])

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

  if (isLoading) {
    return (
      <div className="space-y-6">
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
    const tasks = todayTasks.filter(t => t.prioritas === priority)
    const sortedTasks = [...tasks].sort((a, b) => {
      const aStatus = a.status as Task['status']
      const bStatus = b.status as Task['status']
      const statusDiff = STATUS_ORDER.indexOf(aStatus) - STATUS_ORDER.indexOf(bStatus)
      if (statusDiff !== 0) return statusDiff
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    return { priority, tasks: sortedTasks }
  })

  const activeMissions = todayTasks.filter(t => t.status === 'belum' || t.status === 'proses').length
  const totalEstimatedMinutes = todayTasks.reduce((sum, t) => sum + t.estimasi_menit, 0)
  const completedMissions = todayTasks.filter(t => t.status === 'selesai').length
  const hasAnyTasks = todayTasks.length > 0

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* DailyFocusCard with inline stats */}
      <DailyFocusCard todayTasks={todayTasks} />

      {/* Mission Board - Priority Groups */}
      {hasAnyTasks ? (
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
                  <div className="flex-1 border-t border-slate-200/50 dark:border-slate-700/50 mt-1.5" />
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
              <span className="text-4xl mb-4 block" aria-hidden="true">📋</span>
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Belum ada misi untuk hari ini</p>
              <p className="text-sm text-slate-500 mb-6">Tambahkan tugas baru untuk mulai menyusun rencana hari ini.</p>
              {/* Empty state no longer has add button - FAB handles it */}
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
          <Button className="hidden" /> {/* Hidden - FAB triggers dialog programmatically */}
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