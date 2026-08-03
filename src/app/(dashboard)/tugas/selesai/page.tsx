"use client"

import { useState, useMemo, useEffect } from 'react'
import { format, isToday, isWithinInterval, startOfWeek, endOfWeek, isBefore, startOfDay, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, Edit, Trash2, Search, X, Clock, Calendar, Play, Check, CheckCircle2, MoreHorizontal, Flag, Filter, Zap, Target, TrendingUp, AlertTriangle, RotateCcw, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn, getEstimasiText, getMissionStatusColor, getMissionPriorityColor, getMissionPriorityIcon, getMissionGroupName, getMissionPriorityShortLabel, getMissionPriorityBorder, getMissionGroupDescriptionWithCount, CARD_BASE, CARD_HOVER, STAT_ICON_CONTAINERS, BRAND_COLORS, getActualDurationText, compareEstimasiVsActual, getLiveDurationText } from '@/lib/utils'
import { TaskForm } from '@/components/tasks/TaskForm'
import { Checkbox } from '@/components/ui/checkbox'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus, useBulkDeleteTasks, useBulkResetTasks } from '@/hooks/useTasks'
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

function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onSelect,
  isSelected,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: 'belum' | 'proses' | 'selesai') => void
  onSelect?: (id: string, checked: boolean) => void
  isSelected?: boolean
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
    isInProgress && 'border-[#2563EB] shadow-[0_0_0_2px_rgba(37,99,235,0.08)]',
  )

  return (
    <Card className={cn('group', cardBorderClass)}>
      <CardContent className="p-4 space-y-3">
        {/* Selection Checkbox */}
        {onSelect && (
          <div className="flex items-start justify-between gap-2 -mt-2 -mr-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked: boolean) => onSelect?.(task.id, checked)}
              className="mt-1 ml-1"
            />
            <div className="flex items-start justify-between gap-2 flex-1">
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
            </div>
          </div>
        )}
        {!onSelect && (
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
        )}

        <h3 className="font-medium text-base leading-tight truncate pr-8 capitalize">{task.nama}</h3>

        {/* Estimasi vs Real Duration */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Estimasi: {getEstimasiText(task.estimasi_menit)}</span>
          </div>
          {task.status === 'selesai' && task.started_at && task.completed_at && (
            <>
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
            </>
          )}
          {task.status === 'proses' && task.started_at && (
            <div className="flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300 animate-pulse">
              <Clock className="h-3.5 w-3.5" />
              <span>Sedang: {getLiveDurationText(task.started_at)}</span>
            </div>
          )}
        </div>

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
// Main Component
// ============================================
function SelesaiPageClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['prioritas']>('all')
  const [sortBy, setSortBy] = useState<SortOption>('priority')
  const [isMounted, setIsMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch ALL tasks - filter selesai di client
  const { data: allTasks = [], isLoading, error } = useTasks()

  useTasksRealtime([['tasks']])

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTaskStatus = useToggleTaskStatus()
  const bulkDeleteTasks = useBulkDeleteTasks()
  const bulkResetTasks = useBulkResetTasks()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)

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

  // Selection handlers
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(prev => {
      const next = !prev
      if (!next) {
        // Exit selection mode - clear all selections
        setSelectedIds([])
        setIsSelectAll(false)
      }
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAndSortedTasks.map(t => t.id))
      setIsSelectAll(true)
    } else {
      setSelectedIds([])
      setIsSelectAll(false)
    }
  }

  const handleSelectTask = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
      if (selectedIds.length + 1 === filteredAndSortedTasks.length) setIsSelectAll(true)
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id))
      setIsSelectAll(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} tugas?`)) return
    bulkDeleteTasks.mutate(selectedIds)
    setSelectedIds([])
    setIsSelectAll(false)
  }

  const handleBulkReset = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Yakin ingin mengembalikan ${selectedIds.length} tugas ke status "Belum"?`)) return
    bulkResetTasks.mutate(selectedIds)
    setSelectedIds([])
    setIsSelectAll(false)
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
      {/* Search & Filter Bar - 2 columns on mobile (search + select btn), single row on desktop */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Mobile: Search + Select button in one row */}
        <div className="flex items-center gap-2 w-full sm:hidden">
          <div className="relative flex-1">
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
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="sm"
            onClick={handleToggleSelectionMode}
            className={cn(
              "gap-1.5 shrink-0",
              isSelectionMode && "bg-blue-600 text-white border-blue-600",
              !isSelectionMode && "text-slate-700 border-slate-300 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
            )}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>{isSelectionMode ? 'Batal' : 'Pilih'}</span>
          </Button>
        </div>

        {/* Desktop: Search on left */}
        <div className="relative hidden sm:block sm:max-w-xs flex-1">
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

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as 'all' | Task['prioritas'])}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[140px] sm:max-w-[180px]"><SelectValue placeholder={isMobile ? 'Prioritas' : 'Semua Prioritas'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Prioritas</SelectItem>
              <SelectItem value="p1">Mendesak</SelectItem>
              <SelectItem value="p2">Tinggi</SelectItem>
              <SelectItem value="p3">Sedang</SelectItem>
              <SelectItem value="p4">Rendah</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[140px] sm:max-w-[180px]"><SelectValue placeholder={isMobile ? 'Urutkan' : 'Urutkan'} /></SelectTrigger>
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
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="sm"
            onClick={handleToggleSelectionMode}
            className={cn(
              "hidden sm:inline-flex gap-1.5",
              isSelectionMode && "bg-blue-600 text-white border-blue-600",
              !isSelectionMode && "text-slate-700 border-slate-300 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
            )}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>{isSelectionMode ? 'Batal Pilih' : 'Pilih'}</span>
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar - appears when items selected */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800 animate-slide-in">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {selectedIds.length} tugas dipilih
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkReset}
              disabled={bulkResetTasks.isPending}
              className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Kembalikan ke Belum
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleteTasks.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Hapus
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedIds([]); setIsSelectAll(false) }}
              className="text-slate-600 dark:text-slate-400"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Batal
            </Button>
          </div>
        </div>
      )}

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
              onSelect={isSelectionMode ? handleSelectTask : undefined}
              isSelected={selectedIds.includes(task.id)}
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