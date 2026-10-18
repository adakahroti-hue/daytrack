"use client"

import { useState, useEffect, useMemo } from 'react'
import { format, isBefore, startOfDay } from 'date-fns'
import { Check, Target, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn, CARD_BASE } from '@/lib/utils'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskGroupDialog } from '@/components/tasks/task-group'
import { TaskCard, type TaskCardTask, type TaskCardStatus } from '@/components/tasks/TaskCard'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus } from '@/hooks/useTasks'
import { useTasksRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'
import { useMounted } from '@/hooks/useMounted'

type PriorityTask = TaskCardTask & { jenjang: 'primer' | 'sekunder' }

type TaskFormData = {
  nama: string
  tanggal?: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: 'belum' | 'proses' | 'selesai'
  jenjang: 'primer' | 'sekunder'
}

type EditingTask = TaskFormData & { id: string }

const PRIORITY_ORDER: PriorityTask['prioritas'][] = ['p1', 'p2', 'p3', 'p4']
const STATUS_ORDER: PriorityTask['status'][] = ['belum', 'proses', 'selesai']

// Urut: prioritas tinggi dulu → status (belum dulu) → terbaru
function byPrioritySort(a: PriorityTask, b: PriorityTask) {
  const p = PRIORITY_ORDER.indexOf(a.prioritas) - PRIORITY_ORDER.indexOf(b.prioritas)
  if (p !== 0) return p
  if (a.group_id && b.group_id && a.group_id === b.group_id) {
    const go = (a.group_order ?? 99) - (b.group_order ?? 99)
    if (go !== 0) return go
  }
  const s = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  if (s !== 0) return s
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

// Satu kolom: judul + jumlah + daftar tugas
function PriorityColumn({
  title,
  subtitle,
  icon: Icon,
  accent,
  tasks,
  selectionMode,
  selectedIds,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleSelect,
  onSetGroup,
  onSetJenjang,
}: {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  tasks: PriorityTask[]
  selectionMode: boolean
  selectedIds: Set<string>
  onEdit: (task: TaskCardTask) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskCardStatus) => void
  onToggleSelect: (id: string) => void
  onSetGroup: (task: TaskCardTask) => void
  onSetJenjang: (task: TaskCardTask) => void
}) {
  return (
    <section className="min-w-0">
      {/* Header kolom */}
      <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-700/60">
        <span className={cn('p-2 rounded-lg shrink-0', accent)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight text-slate-900 dark:text-white capitalize">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-xs font-bold tabular-nums px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
          {tasks.length} tugas
        </span>
      </div>

      {/* Daftar tugas */}
      {tasks.length === 0 ? (
        <div className="py-10 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
          <Flag className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Tidak ada tugas {title.toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              selectionMode={selectionMode}
              selected={selectedIds.has(task.id)}
              onToggleSelect={onToggleSelect}
              onSetGroup={onSetGroup}
              onSetJenjang={onSetJenjang}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function PrioritasPageClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  const [groupTask, setGroupTask] = useState<PriorityTask | null>(null)
  const { setHeaderAddAction } = useHeaderControls()
  const isMounted = useMounted()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  // Tombol tambah di header kanan atas (sama seperti tab Semua)
  useEffect(() => {
    setHeaderAddAction(() => () => { setEditingTask(null); setIsFormOpen(true) })
    return () => setHeaderAddAction(null)
  }, [setHeaderAddAction])

  const { data: allTasks = [], isLoading, error } = useTasks(undefined)
  useTasksRealtime([['tugas']])

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTaskStatus = useToggleTaskStatus()

  // Tugas aktif yang BELUM selesai (kolom jadi bersih; tugas selesai ada di tab Semua)
  const activeTasks = useMemo(
    () => (allTasks as PriorityTask[]).filter((t) => t.status !== 'selesai'),
    [allTasks]
  )

  const primerTasks = useMemo(
    () => activeTasks.filter((t) => (t.jenjang ?? 'primer') === 'primer').sort(byPrioritySort),
    [activeTasks]
  )
  const sekunderTasks = useMemo(
    () => activeTasks.filter((t) => t.jenjang === 'sekunder').sort(byPrioritySort),
    [activeTasks]
  )

  const handleEdit = (task: TaskCardTask) => {
    setEditingTask({
      id: task.id,
      nama: task.nama,
      tanggal: task.tanggal ?? undefined,
      estimasi_menit: task.estimasi_menit,
      prioritas: task.prioritas,
      status: task.status,
      jenjang: task.jenjang ?? 'primer',
    })
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus tugas ini?')) deleteTask.mutate(id)
  }

  const handleStatusChange = (id: string, status: TaskCardStatus) => {
    toggleTaskStatus.mutate({ id, status })
  }

  // Pindah tugas antar kolom (Primer <-> Sekunder)
  const handleSetJenjang = (task: TaskCardTask) => {
    const next = (task.jenjang ?? 'primer') === 'primer' ? 'sekunder' : 'primer'
    updateTask.mutate({ id: task.id, data: { jenjang: next } })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = (data: TaskFormData) => {
    const taskData = {
      ...data,
      tanggal: data.tanggal && data.tanggal.length > 0 ? data.tanggal : undefined,
    }
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, data: taskData })
    } else {
      createTask.mutate(taskData)
    }
    setIsFormOpen(false)
    setEditingTask(null)
  }

  const shared = {
    selectionMode,
    selectedIds,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onStatusChange: handleStatusChange,
    onToggleSelect: toggleSelect,
    onSetGroup: (t: TaskCardTask) => setGroupTask(t as PriorityTask),
    onSetJenjang: handleSetJenjang,
  }

  if (!isMounted || isLoading) {
    return (
      <div className="space-y-6">
        <Card className={CARD_BASE}>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-sm text-slate-500 font-mono">Memuat tugas...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className={CARD_BASE}>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Gagal memuat tugas: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto py-6 pb-24">
      {/* Toolbar: Pilih Tugas (untuk hapus massal) */}
      <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectionMode((v) => !v)}>
          <Check className="h-3.5 w-3.5" /> {selectionMode ? 'Selesai Pilih' : 'Pilih Tugas'}
        </Button>
        {selectionMode && selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="destructive"
            className="h-8"
            onClick={() => {
              if (confirm(`Yakin ingin menghapus ${selectedIds.size} tugas yang dipilih?`)) {
                // nonaktifkan dulu agar tidak dobel
                const ids = Array.from(selectedIds)
                setSelectedIds(new Set())
                setSelectionMode(false)
                ids.forEach((id) => deleteTask.mutate(id))
              }
            }}
          >
            Hapus ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Dua kolom: Primer (kiri) | Sekunder (kanan) — menumpuk di mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <PriorityColumn
          title="Primer"
          subtitle="Tugas inti — yang harus beres duluan"
          icon={Target}
          accent="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
          tasks={primerTasks}
          {...shared}
        />
        <PriorityColumn
          title="Sekunder"
          subtitle="Tugas pendukung — menyusul setelah primer"
          icon={Flag}
          accent="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          tasks={sekunderTasks}
          {...shared}
        />
      </div>

      {/* Empty state global: belum ada tugas sama sekali */}
      {allTasks.length === 0 && (
        <div className="py-14 text-center">
          <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-lg">Belum ada tugas</p>
          <p className="text-sm text-muted-foreground mt-1">Tambahkan tugas pertama — pilih jenjangnya di form</p>
        </div>
      )}

      {/* Add/Edit Task Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}</DialogTitle>
          </DialogHeader>
          <TaskForm
            initialData={editingTask}
            onSubmit={handleSubmit}
            onCancel={() => { setIsFormOpen(false); setEditingTask(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog penanda paket */}
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
            { onSuccess: () => setGroupTask(null) }
          )
        }}
      />
    </div>
  )
}

export default function PrioritasPage() {
  return <PrioritasPageClient />
}