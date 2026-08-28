"use client"

import { useState, useMemo, useEffect } from 'react'
import { Plus, Lightbulb, Target, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskCard, type TaskCardTask, type TaskCardStatus } from '@/components/tasks/TaskCard'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus } from '@/hooks/useTasks'
import { useTasksRealtime } from '@/hooks/useRealtime'

type Task = TaskCardTask
type TaskFormData = {
  nama: string
  tanggal?: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: TaskCardStatus
}

type EditingTask = TaskFormData & { id: string }

function BankIdePageClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  // Ambil SELURUH tugas, lalu filter status 'ide' (journal-style, tidak terpengaruh filter waktu)
  const { data: allTasks = [], isLoading, error } = useTasks(undefined)
  useTasksRealtime([['tugas']])

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTaskStatus = useToggleTaskStatus()

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
    if (confirm('Yakin ingin menghapus ide ini?')) deleteTask.mutate(id)
  }

  // "Jadikan Tugas": ubah status ide -> belum (siap di-action)
  const handlePromoteIde = (id: string) => {
    toggleTaskStatus.mutate({ id, status: 'belum' })
  }

  const handleSubmit = (data: TaskFormData) => {
    const taskData = { ...data, tanggal: data.tanggal && data.tanggal.length > 0 ? data.tanggal : undefined }
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, data: taskData })
    } else {
      createTask.mutate(taskData)
    }
    setIsFormOpen(false)
    setEditingTask(null)
  }

  const ideTasks = useMemo(
    () => (allTasks as Task[]).filter(t => t.status === 'ide')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [allTasks]
  )

  const totalTasks = (allTasks as Task[]).length
  const isCompletelyEmpty = totalTasks === 0

  function SkeletonLoader() {
    return (
      <div className="space-y-4 w-full max-w-xs mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!isMounted) {
    return (
      <div className="space-y-6">
        <Card><CardContent className="py-12 text-center"><SkeletonLoader /></CardContent></Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card><CardContent className="py-12 text-center"><SkeletonLoader /></CardContent></Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card><CardContent className="py-12 text-center"><p className="text-destructive">Gagal memuat: {error.message}</p></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {ideTasks.length === 0 ? (
        <div className="py-16 text-center">
          {isCompletelyEmpty ? (
            <>
              <Lightbulb className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-lg">Belum ada ide</p>
              <p className="text-sm text-muted-foreground mt-1">Tambahkan ide yang belum matang — nanti bisa dijadikan tugas.</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-lg">Belum ada ide tersimpan</p>
              <p className="text-sm text-muted-foreground mt-1">Semua ide sudah dijadikan tugas atau belum ditambahkan.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ideTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              variant="ide"
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={(id, status) => toggleTaskStatus.mutate({ id, status })}
              onPromoteIde={handlePromoteIde}
            />
          ))}
        </div>
      )}

      <Button
        onClick={() => { setEditingTask(null); setIsFormOpen(true) }}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 bg-violet-600 hover:bg-violet-700 text-white"
        aria-label="Tambah ide baru"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Ide' : 'Tambah Ide Baru'}</DialogTitle>
          </DialogHeader>
          <TaskForm
            initialData={editingTask ? { ...editingTask, status: 'ide' } : { status: 'ide' } as any}
            onSubmit={handleSubmit}
            onCancel={() => { setIsFormOpen(false); setEditingTask(null) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function BankIdePage() {
  return <BankIdePageClient />
}
