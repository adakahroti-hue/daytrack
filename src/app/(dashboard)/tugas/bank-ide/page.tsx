"use client"

import { useState, useMemo, useEffect } from 'react'
import { Plus, Lightbulb, Target, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TaskForm } from "@/components/tasks/TaskForm"
import { TaskCard, type TaskCardTask } from "@/components/tasks/TaskCard"
import { IdeaCard } from "@/components/bank-ide/IdeaCard"
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useTasksRealtime } from '@/hooks/useRealtime'

type Task = TaskCardTask
type TaskFormData = {
  nama: string
  tanggal?: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: Task['status']
}

type EditingTask = TaskFormData & { id: string }

function BankIdePageClient() {
  const [isIdeFormOpen, setIsIdeFormOpen] = useState(false)
  const [editingIde, setEditingIde] = useState<{ id: string; nama: string } | null>(null)
  const [promoteId, setPromoteId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  // Ambil SELURUH tugas, lalu filter status 'ide' (journal-style, tidak terpengaruh filter waktu)
  const { data: allTasks = [], isLoading, error } = useTasks(undefined)
  useTasksRealtime([['tugas']])

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const handleEdit = (task: Task) => {
    setEditingIde({ id: task.id, nama: task.nama })
    setIsIdeFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus ide ini?')) deleteTask.mutate(id)
  }

  // "Jadikan Tugas": buka form lengkap (field lain) untuk ide ini
  const handlePromoteIde = (id: string) => {
    setPromoteId(id)
  }

  const handleIdeSubmit = (nama: string) => {
    if (editingIde) {
      updateTask.mutate({ id: editingIde.id, data: { nama } })
    } else {
      createTask.mutate({ nama, status: 'ide', estimasi_menit: 0, prioritas: 'p3' })
    }
    setIsIdeFormOpen(false)
    setEditingIde(null)
  }

  // Submit dari form "Jadikan Tugas" — isi field lain lalu status -> belum
  const handlePromoteSubmit = (data: TaskFormData) => {
    if (!promoteId) return
    const taskData = {
      ...data,
      tanggal: data.tanggal && data.tanggal.length > 0 ? data.tanggal : undefined,
      status: 'belum' as const,
    }
    updateTask.mutate({ id: promoteId, data: taskData })
    setPromoteId(null)
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
            <IdeaCard
              key={task.id}
              task={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPromote={handlePromoteIde}
            />
          ))}
        </div>
      )}

      <Button
        onClick={() => { setEditingIde(null); setIsIdeFormOpen(true) }}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 bg-black hover:bg-neutral-800 text-white"
        aria-label="Tambah ide baru"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialog catatan ide (hanya judul/catatan) */}
      <Dialog open={isIdeFormOpen} onOpenChange={setIsIdeFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIde ? 'Edit Ide' : 'Tambah Ide Baru'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const nama = (fd.get('nama') as string)?.trim()
              if (nama) handleIdeSubmit(nama)
            }}
            className="space-y-4 p-4"
          >
            <div className="space-y-2">
              <Label htmlFor="ide-nama">Catatan Ide *</Label>
              <Input
                id="ide-nama"
                name="nama"
                defaultValue={editingIde?.nama ?? ''}
                placeholder="Tulis ide mentahmu di sini..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => { setIsIdeFormOpen(false); setEditingIde(null) }}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog "Jadikan Tugas": isi field lain (tanggal, durasi, prioritas) */}
      <Dialog open={!!promoteId} onOpenChange={(o) => { if (!o) setPromoteId(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Jadikan Tugas</DialogTitle>
          </DialogHeader>
          {promoteId && (
            <TaskForm
              initialData={{ status: 'belum' } as any}
              onSubmit={handlePromoteSubmit}
              onCancel={() => setPromoteId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function BankIdePage() {
  return <BankIdePageClient />
}
