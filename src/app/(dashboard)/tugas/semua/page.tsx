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
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
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
// TaskCard Component - Clean, consistent height, neutral by default
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
  onStatusChange: (id: string, status: Task['status']) => void
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
        CARD_BASE,
        CARD_HOVER,
        isCompleted && 'opacity-60',
        isOverdue && !isCompleted && 'border-l-3 border-l-red-400 dark:border-l-red-500',
        isInProgress && 'border-l-3 border-l-amber-400 dark:border-l-amber-500'
      )}
      style={{ minHeight: '190px', display: 'flex', flexDirection: 'column' }}
    >
      <CardContent className="p-5 space-y-4 flex flex-col h-full">
        {/* Top Row: Priority Badge + Dropdown Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={priorityBadgeClass}>
              {PRIORITY_ICONS[task.prioritas]}
              {getMissionPriorityShortLabel(task.prioritas)}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-70"
                aria-label="Menu tugas"
              >
                <MoreHorizontal className="h-4 w-4" />
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

        {/* Task Title - Most Prominent */}
        <h3 className="font-semibold text-base leading-snug pr-8 capitalize flex-1 break-words">{task.nama}</h3>

        {/* Meta Info: Duration + Date */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Estimasi: {getEstimasiText(task.estimasi_menit)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
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
        <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
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
}

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
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['prioritas']>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatusType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('dueDate')
  const [isMounted, setIsMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch ALL tasks - ALWAYS called
  const { data: allTasks = [], isLoading, error } = useTasks(undefined)

  // Subscribe to realtime - ALWAYS called
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

  const handleStatusChange = (id: string, status: Task['status']) => {
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
    setStatusFilter('all')
    setSortBy('priority')
  }

  // Calculate summary stats - ALWAYS calculated
  const totalTasks = allTasks.length
  const belumTasks = allTasks.filter(t => t.status === 'belum').length
  const prosesTasks = allTasks.filter(t => t.status === 'proses').length
  const selesaiTasks = allTasks.filter(t => t.status === 'selesai').length

  // Overdue tasks
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayStart = startOfDay(new Date())
  const overdueTasks = useMemo(() => allTasks.filter(t => 
    isBefore(new Date(t.tanggal), todayStart) && t.status !== 'selesai'
  ), [allTasks])
  const overdueCount = overdueTasks.length

  // Today's tasks for subtle context link
  const todayTasks = useMemo(() => allTasks.filter(t => t.tanggal === today), [allTasks])
  const inProgressToday = todayTasks.filter(t => t.status === 'proses')[0]
  const pendingToday = todayTasks.filter(t => t.status === 'belum')[0]
  const todayFocusTask = inProgressToday || pendingToday

  // Filter and sort tasks - ALWAYS memoized
  const filteredAndSortedTasks = useMemo(() => {
    let tasks = [...allTasks]

    // Exclude completed tasks - they only appear in Selesai tab
    tasks = tasks.filter(t => t.status !== 'selesai')

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      tasks = tasks.filter(t => t.nama.toLowerCase().includes(query))
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      tasks = tasks.filter(t => t.prioritas === priorityFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      tasks = tasks.filter(t => t.status === statusFilter)
    }

    // Sort - Always prioritize "proses" status first, then apply selected sort
    tasks.sort((a, b) => {
      // Status "proses" always comes first
      const aProses = a.status === 'proses' ? 0 : 1
      const bProses = b.status === 'proses' ? 0 : 1
      if (aProses !== bProses) return aProses - bProses

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
  }, [allTasks, searchQuery, priorityFilter, statusFilter, sortBy, today])

  const hasActiveFilters = searchQuery || priorityFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'priority'

  // Render loading/error/mounted states CONDITIONALLY, but hooks already called
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

  // Main render - all hooks already executed above
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Stats are now shown in the header — no inline stats here */}

      {/* Search & Filter Bar - Single Row */}
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

        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatusType)}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[140px] sm:max-w-[180px]"><SelectValue placeholder={isMobile ? 'Status' : 'Semua Status'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="belum">Belum</SelectItem>
              <SelectItem value="proses">Sedang Dikerjakan</SelectItem>
              <SelectItem value="selesai">Selesai</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as 'all' | Task['prioritas'])}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[140px] sm:max-w-[180px]"><SelectValue placeholder={isMobile ? 'Kategori' : 'Semua Kategori'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="p1">P1 Mendesak</SelectItem>
              <SelectItem value="p2">P2 Tinggi</SelectItem>
              <SelectItem value="p3">P3 Sedang</SelectItem>
              <SelectItem value="p4">P4 Rendah</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[160px] sm:max-w-[200px]"><SelectValue placeholder={isMobile ? 'Urutkan' : 'Prioritas Tertinggi'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Prioritas Tertinggi</SelectItem>
              <SelectItem value="newest">Terbaru</SelectItem>
              <SelectItem value="oldest">Terlama</SelectItem>
              <SelectItem value="dueDate">Deadline Terdekat</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="hidden sm:inline-flex gap-1.5 text-muted-foreground hover:text-foreground">
              <Filter className="h-3.5 w-3.5" />
              Bersihkan
            </Button>
          )}
        </div>
      </div>

      {/* Task List - Responsive Grid */}
      <div>
        {filteredAndSortedTasks.length === 0 ? (
          <div className="py-16 text-center">
            {hasActiveFilters ? (
              <>
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-lg">Tidak ada tugas yang cocok</p>
                <p className="text-sm text-muted-foreground mt-1">Coba ubah filter atau kata kunci pencarian</p>
                <Button variant="outline" onClick={handleClearFilters} className="mt-4 gap-1.5">
                  <X className="h-4 w-4" /> Reset Filter
                </Button>
              </>
            ) : (
              <>
                <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-lg">Belum ada tugas sama sekali</p>
                <p className="text-sm text-muted-foreground mt-1">Klik tombol + di kanan bawah untuk menambah tugas</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          </>
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
