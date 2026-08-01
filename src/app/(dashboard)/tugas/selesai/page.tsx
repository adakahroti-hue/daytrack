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
import { cn, getEstimasiText, getMissionStatusColor, getMissionPriorityColor, getMissionPriorityIcon, getMissionGroupName, getMissionPriorityShortLabel, getMissionPriorityBorder, getMissionGroupDescriptionWithCount, CARD_BASE, CARD_HOVER, STAT_ICON_CONTAINERS, BRAND_COLORS } from '@/lib/utils'
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

type FilterStatusType = 'all' | 'belum' | 'proses' | 'selesai'

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

  const cardBorderClass = cn(
    CARD_BASE,
    CARD_HOVER,
    isCompleted && 'opacity-60',
    isInProgress && 'border-[#2563EB] shadow-[0_0_0_2px_rgba(37,99,235,0.08)]',
  )

  return (
    <Card className={cn('group', cardBorderClass)}>
      <CardContent className="p-4 space-y-3">
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

        <h3 className="font-medium text-base leading-tight truncate pr-8 capitalize">{task.nama}</h3>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{getEstimasiText(task.estimasi_menit)}</span>
        </div>

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
// Main Component
// ============================================
function SelesaiPageClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['prioritas']>('all')
  const [sortBy, setSortBy] = useState<SortOption>('priority')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch ALL tasks - filter selesai di client
  const { data: allTasks = [], isLoading, error } = useTasks()

  useTasksRealtime([['tasks']])

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

  const handleClearFilters = () => {
    setSearchQuery('')
    setPriorityFilter('all')
    setSortBy('priority')
  }

  // Filter only selesai tasks
  const selesaiTasks = useMemo(() => allTasks.filter(t => t.status === 'selesai'), [allTasks])

  // Search, filter, sort
  const filteredAndSortedTasks = useMemo(() => {
    let tasks = [...selesaiTasks]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      tasks = tasks.filter(t => t.nama.toLowerCase().includes(query))
    }

    if (priorityFilter !== 'all') {
      tasks = tasks.filter(t => t.prioritas === priorityFilter)
    }

    tasks.sort((a, b) => {
      switch (sortBy) {
        case 'priority': {
          const priorityDiff = PRIORITY_ORDER.indexOf(a.prioritas) - PRIORITY_ORDER.indexOf(b.prioritas)
          if (priorityDiff !== 0) return priorityDiff
          return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        }
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'dueDate':
          return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
        default:
          return 0
      }
    })

    return tasks
  }, [selesaiTasks, searchQuery, priorityFilter, sortBy])

  const totalSelesai = selesaiTasks.length
  const totalEstimatedMinutes = selesaiTasks.reduce((sum, t) => sum + t.estimasi_menit, 0)
  const hasActiveFilters = searchQuery || priorityFilter !== 'all' || sortBy !== 'priority'

  if (!isMounted) {
    return (
      <div className="space-y-6">
        <Card className={CARD_BASE}><CardContent className="py-12 text-center"><p className="text-muted-foreground">Memuat tugas...</p></CardContent></Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className={CARD_BASE}><CardContent className="py-12 text-center"><p className="text-muted-foreground">Memuat tugas...</p></CardContent></Card>
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

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tugas Selesai</h1>
          <p className="text-sm text-muted-foreground">{totalSelesai} tugas diselesaikan</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg min-w-[90px]">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Selesai</p>
            <p className="text-sm font-bold text-slate-900">{totalSelesai}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg min-w-[90px]">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Waktu</p>
            <p className="text-sm font-bold text-slate-900">{getEstimasiText(totalEstimatedMinutes)}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama tugas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')} aria-label="Hapus pencarian">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as 'all' | Task['prioritas'])}>
            <SelectTrigger className="w-auto min-w-[140px] max-w-[180px]"><SelectValue placeholder="Semua Prioritas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Prioritas</SelectItem>
              <SelectItem value="p1">Mendesak</SelectItem>
              <SelectItem value="p2">Tinggi</SelectItem>
              <SelectItem value="p3">Sedang</SelectItem>
              <SelectItem value="p4">Rendah</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-auto min-w-[140px] max-w-[180px]"><SelectValue placeholder="Urutkan" /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs">
              <X className="h-3 w-3 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Task Cards */}
      {filteredAndSortedTasks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <Card className="border-dashed border-slate-200/50 dark:border-dashed dark:border-slate-700/50 bg-white">
            <CardContent className="py-12">
              <span className="text-4xl mb-4 block" aria-hidden="true">✅</span>
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Belum ada tugas selesai</p>
              <p className="text-sm text-slate-500 mb-6">Tugas yang diselesaikan akan muncul di sini.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Action Button */}
      <Button
        onClick={() => { setEditingTask({ id: '', nama: '', tanggal: format(new Date(), 'yyyy-MM-dd'), estimasi_menit: 30, prioritas: 'p3', status: 'belum' }); setIsFormOpen(true) }}
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

export default function SelesaiPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Card className={CARD_BASE}><CardContent className="py-12 text-center"><p className="text-muted-foreground">Memuat tugas...</p></CardContent></Card></div>}>
      <SelesaiPageClient />
    </Suspense>
  )
}