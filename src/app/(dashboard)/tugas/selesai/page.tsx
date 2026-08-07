"use client"

import { useState, useMemo, useEffect, memo } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, Edit, Trash2, X, Clock, Calendar, Play, Check, CheckCircle2, MoreHorizontal, Flag, RotateCcw, CheckSquare, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { cn, getEstimasiText, getMissionStatusColor, getMissionPriorityColor, getMissionGroupName, getMissionPriorityShortLabel, getMissionGroupDescriptionWithCount, CARD_BASE, CARD_HOVER, BRAND_COLORS, PRIORITY_COLORS, getActualDurationText, compareEstimasiVsActual, getLiveDurationText } from '@/lib/utils'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskGroupRibbon, TaskGroupDialog } from '@/components/tasks/task-group'
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

// Grouping modes for the task board (sama seperti tab Semua)
const GROUP_MODES = [
  { value: 'prioritas', label: 'Prioritas', icon: Flag },
  { value: 'tanggal', label: 'Tanggal', icon: Calendar },
  { value: 'durasi', label: 'Durasi', icon: Clock },
] as const

type GroupMode = typeof GROUP_MODES[number]['value']

const STATUS_SHORT_LABELS: Record<Task['status'], string> = {
  belum: 'Belum',
  proses: 'Proses',
  selesai: 'Selesai',
}

const PRIORITY_ICONS: Record<Task['prioritas'], string> = {
  p1: '🔥',
  p2: '⚡',
  p3: '📌',
  p4: '🌱',
}

// ============================================
// TaskCard — desain sama seperti tab Semua,
// plus checkbox saat mode pilih aktif
// ============================================
const TaskCard = memo(({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onSelect,
  isSelected,
  onSetGroup,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: Task['status']) => void
  onSelect?: (id: string, checked: boolean) => void
  isSelected?: boolean
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

  const primaryButtonText = isPending ? 'Ambil Misi' : isInProgress ? 'Tandai Selesai' : 'Misi Selesai'
  const primaryButtonDisabled = isCompleted

  const PrimaryButtonIcon = () => {
    if (isPending) return <Play className="h-3.5 w-3.5" />
    if (isInProgress) return <Check className="h-3.5 w-3.5" />
    return <CheckCircle2 className="h-3.5 w-3.5" />
  }

  const taskDate = new Date(task.tanggal)

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
        isSelected && 'border-[#2563EB] shadow-[0_0_0_3px_rgba(37,99,235,0.15)] bg-[#EFF6FF]/40 dark:bg-[#2563EB]/5'
      )}
      style={{ minHeight: '190px', display: 'flex', flexDirection: 'column' }}
    >
      <CardContent className="p-5 space-y-4 flex flex-col h-full">
        {/* Revisi batch 12: pita penanda paket */}
        {task.group_id && task.group_order != null && (
          <TaskGroupRibbon groupId={task.group_id} order={task.group_order} />
        )}
        {/* Top Row: (Checkbox saat mode pilih) + Priority Badge + Dropdown Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(task.id, checked === true)}
                className="mt-0.5"
                aria-label="Pilih tugas"
              />
            )}
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

        {/* Task Title - Most Prominent */}
        <h3 className={cn("font-semibold text-base leading-snug pr-8 capitalize flex-1 break-words", task.group_id && "pl-7")}>{task.nama}</h3>

        {/* Meta Info: Duration + Date */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Estimasi: {getEstimasiText(task.estimasi_menit)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">
                {format(taskDate, 'd MMM yyyy', { locale: id })}
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
              <span className="sm:hidden">{isPending ? 'Ambil' : isInProgress ? 'Selesai' : 'Selesai'}</span>
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

// ============================================
// Main Component
// ============================================
function SelesaiPageClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  // Revisi batch 12: penanda paket (parent/child/single)
  const [groupTask, setGroupTask] = useState<Task | null>(null)
  const [groupMode, setGroupMode] = useState<GroupMode>('prioritas')
  const [isMounted, setIsMounted] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

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
  const bulkDeleteTasks = useBulkDeleteTasks()
  const bulkResetTasks = useBulkResetTasks()

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

  // Selection handlers
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(prev => {
      const next = !prev
      if (!next) {
        // Exit selection mode - clear all selections
        setSelectedIds([])
      }
      return next
    })
  }

  const handleSelectTask = (id: string, checked: boolean) => {
    setSelectedIds(prev => (checked ? [...prev, id] : prev.filter(i => i !== id)))
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} tugas?`)) return
    bulkDeleteTasks.mutate(selectedIds)
    setSelectedIds([])
  }

  const handleBulkReset = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Yakin ingin mengembalikan ${selectedIds.length} tugas ke status "Belum"?`)) return
    bulkResetTasks.mutate(selectedIds)
    setSelectedIds([])
  }

  // Filter hanya tugas selesai
  const selesaiTasks = useMemo(() => allTasks.filter(t => t.status === 'selesai'), [allTasks])
  // Today (for relative group labels)
  const today = format(new Date(), 'yyyy-MM-dd')

  // Group tasks by selected mode — sama seperti tab Semua
  const groupedTasks = useMemo(() => {
    const byPrioritySort = (a: Task, b: Task) => {
      const p = PRIORITY_ORDER.indexOf(a.prioritas) - PRIORITY_ORDER.indexOf(b.prioritas)
      if (p !== 0) return p
      const s = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      if (s !== 0) return s
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }

    const groups: { key: string; title: string; description: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; tasks: Task[] }[] = []

    if (groupMode === 'tanggal') {
      // Group by tanggal (newest first)
      const byDate = new Map<string, Task[]>()
      for (const t of selesaiTasks) {
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
        const tasks = selesaiTasks
          .filter(t => t.estimasi_menit >= b.min && t.estimasi_menit <= b.max)
          .sort(byPrioritySort)
        if (tasks.length > 0) {
          groups.push({ key: b.key, title: b.label, description: `${b.desc} - ${tasks.length} tugas`, icon: Clock, iconColor: 'text-amber-600 dark:text-amber-400', tasks })
        }
      }
    } else {
      // Group by prioritas (default — same look as Semua tab)
      for (const p of PRIORITY_ORDER) {
        const tasks = selesaiTasks.filter(t => t.prioritas === p).sort(byPrioritySort)
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

    return groups
  }, [selesaiTasks, groupMode, today])

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

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Bulk Action Bar - muncul saat ada tugas dipilih */}
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
              onClick={() => setSelectedIds([])}
              className="text-slate-600 dark:text-slate-400"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Task Board - grouped sections (same look as Semua tab) */}
      <div>
        {selesaiTasks.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">Belum ada tugas selesai</p>
            <p className="text-sm text-muted-foreground mt-1">Tugas yang diselesaikan akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedTasks.map((group, idx) => (
              <div key={group.key} className="space-y-4">
                {/* Group Header */}
                <div className="flex items-start gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-700/50 flex-wrap">
                  <group.icon className={cn('h-6 w-6 mt-0.5 flex-shrink-0', group.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white capitalize">{group.title}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{group.description}</p>
                  </div>
                  {/* Toggle grup + tombol Pilih — sebaris dengan nama group pertama, rata kanan */}
                  {idx === 0 && (
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 gap-0.5">
                        {GROUP_MODES.map((gm) => (
                          <button
                            key={gm.value}
                            type="button"
                            onClick={() => setGroupMode(gm.value)}
                            className={cn(
                              'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                              groupMode === gm.value
                                ? 'bg-[#0F172A] text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100'
                            )}
                          >
                            <gm.icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{gm.label}</span>
                          </button>
                        ))}
                      </div>
                      <Button
                        variant={isSelectionMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={handleToggleSelectionMode}
                        className={cn(
                          'gap-1.5',
                          isSelectionMode && 'bg-blue-600 text-white border-blue-600',
                          !isSelectionMode && 'text-slate-700 border-slate-300 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800'
                        )}
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{isSelectionMode ? 'Batal Pilih' : 'Pilih'}</span>
                      </Button>
                    </div>
                  )}
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
                onSetGroup={setGroupTask}
                      onSelect={isSelectionMode ? handleSelectTask : undefined}
                      isSelected={selectedIds.includes(task.id)}
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
        onClick={() => { setEditingTask({ id: '', nama: '', tanggal: format(new Date(), 'yyyy-MM-dd'), estimasi_menit: 30, prioritas: 'p3', status: 'belum' }); setIsFormOpen(true) }}
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
        allTasks={selesaiTasks}
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

export default function SelesaiPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Card className={CARD_BASE}><CardContent className="py-12 text-center"><p className="text-muted-foreground">Memuat tugas...</p></CardContent></Card></div>}>
      <SelesaiPageClient />
    </Suspense>
  )
}
