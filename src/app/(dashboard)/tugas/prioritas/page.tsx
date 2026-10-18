"use client"

import { useState, useEffect, useMemo } from 'react'
import { Target, Flag, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn, CARD_BASE } from '@/lib/utils'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskGroupDialog } from '@/components/tasks/task-group'
import { TaskCard, type TaskCardTask, type TaskCardStatus } from '@/components/tasks/TaskCard'
import {
  useTugasPrioritas,
  useCreateTugasPrioritas,
  useUpdateTugasPrioritas,
  useDeleteTugasPrioritas,
  useToggleTugasPrioritasStatus,
  type TugasPrioritasRow,
} from '@/hooks/useTugasPrioritas'
import { useTugasPrioritasRealtime } from '@/hooks/useRealtime'
import { useHeaderControls } from '@/components/layout/HeaderControls'
import { useMounted } from '@/hooks/useMounted'

// Row tabel TERPISAH `tugas_prioritas` — cocok dengan tipe kartu TaskCard
type PriorityTask = TugasPrioritasRow

type TaskFormData = {
  nama: string
  tanggal?: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: 'belum' | 'proses' | 'selesai'
  // opsional di form (default 'primer' saat submit)
  jenjang?: 'primer' | 'sekunder'
}

type EditingTask = TaskFormData & { id: string }

const PRIORITY_ORDER: PriorityTask['prioritas'][] = ['p1', 'p2', 'p3', 'p4']
const STATUS_ORDER: PriorityTask['status'][] = ['belum', 'proses', 'selesai']
// Referensi Set kosong tetap (fitur pilih tugas sudah dihapus — hanya dipertahankan agar tipe kartu cocok)
const EMPTY_SET: Set<string> = new Set()

// Urut: prioritas tinggi dulu → anggota paket (parent dulu) → status → terbaru
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
  onAdd,
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
  onAdd?: () => void
  selectionMode: boolean
  selectedIds: Set<string>
  onEdit: (task: TaskCardTask) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskCardStatus) => void
  onToggleSelect?: (id: string) => void
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
        {/* Tombol Tambah KHUSUS kolom ini (ikon saja) — tugas baru langsung masuk kolom ini */}
        {onAdd && (
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 bg-slate-900 hover:bg-slate-800 text-white rounded-full"
            onClick={onAdd}
            aria-label={`Tambah tugas ${title}`}
            title="Tambah tugas"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
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
  // Jenjang target saat menambah: 'primer' (kolom kiri) | 'sekunder' (kolom kanan)
  const [addJenjang, setAddJenjang] = useState<'primer' | 'sekunder'>('primer')
  const [groupTask, setGroupTask] = useState<PriorityTask | null>(null)
  const { setHeaderAddAction } = useHeaderControls()
  const isMounted = useMounted()


  // Tombol tambah di header kanan atas (sama seperti tab Semua)
  useEffect(() => {
    setHeaderAddAction(() => () => { setEditingTask(null); setAddJenjang('primer'); setIsFormOpen(true) })
    return () => setHeaderAddAction(null)
  }, [setHeaderAddAction])

  const { data: allTasks = [], isLoading, error } = useTugasPrioritas()
  useTugasPrioritasRealtime([['tugas_prioritas']])

  const createTask = useCreateTugasPrioritas()
  const updateTask = useUpdateTugasPrioritas()
  const deleteTask = useDeleteTugasPrioritas()
  const toggleTaskStatus = useToggleTugasPrioritasStatus()

  // Kolom: jenjang = primer (kiri) / sekunder (kanan); hanya tugas aktif (belum/proses)
  const activeTasks = useMemo(
    () => (allTasks as PriorityTask[]).filter((t) => t.status !== 'selesai'),
    [allTasks]
  )
  const primerTasks = useMemo(
    () => activeTasks.filter((t) => t.jenjang === 'primer').sort(byPrioritySort),
    [activeTasks]
  )
  const sekunderTasks = useMemo(
    () => activeTasks.filter((t) => t.jenjang === 'sekunder').sort(byPrioritySort),
    [activeTasks]
  )

  const handleEdit = (task: TaskCardTask) => {
    const t = task as PriorityTask
    setEditingTask({
      id: t.id,
      nama: t.nama,
      tanggal: t.tanggal ?? undefined,
      estimasi_menit: t.estimasi_menit,
      prioritas: t.prioritas,
      status: t.status,
      jenjang: t.jenjang ?? 'primer',
    })
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus tugas ini?')) deleteTask.mutate(id)
  }

  const handleStatusChange = (id: string, status: TaskCardStatus) => {
    toggleTaskStatus.mutate({ id, status })
  }

  // Pindah tugas antar kolom (Primer <-> Sekunder) — update kolom jenjang saja
  const handleSetJenjang = (task: TaskCardTask) => {
    const next = ((task as PriorityTask).jenjang ?? 'primer') === 'primer' ? 'sekunder' : 'primer'
    updateTask.mutate({ id: task.id, data: { jenjang: next } })
  }



  // Mode tambah cuma kirim nama — jenjang ikut kolom tombol, default lain dari schema
  const [quickNama, setQuickNama] = useState('')

  const handleSubmit = (data: TaskFormData) => {
    const taskData = {
      ...data,
      jenjang: data.jenjang ?? addJenjang,
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
    selectionMode: false,
    selectedIds: EMPTY_SET,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onStatusChange: handleStatusChange,
    onToggleSelect: undefined,
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
    // Umumnya "tabel tugas_prioritas belum ada" → arahkan jalankan migrasi
    return (
      <div className="space-y-6">
        <Card className={CARD_BASE}>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-destructive font-medium">Gagal memuat tugas prioritas</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {error.message}
            </p>
            <p className="text-xs text-slate-400">
              Biasanya karena migrasi database belum dijalankan:
              <br />
              <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">supabase/migrations/20261018000002_create_tugas_prioritas.sql</code>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto py-6 pb-24">
      {/* Fitur "Pilih Tugas" dihapus dari tab Prioritas (permintaan Aldy) — hapus massal tidak ada lagi */}

      {/* Dua kolom: Primer (kiri) | Sekunder (kanan) — menumpuk di mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <PriorityColumn
          title="Primer"
          subtitle="Tugas inti — yang harus beres duluan"
          icon={Target}
          accent="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
          tasks={primerTasks}
          onAdd={() => { setEditingTask(null); setAddJenjang('primer'); setQuickNama(''); setIsFormOpen(true) }}
          {...shared}
        />
        <PriorityColumn
          title="Sekunder"
          subtitle="Tugas pendukung — menyusul setelah primer"
          icon={Flag}
          accent="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          tasks={sekunderTasks}
          onAdd={() => { setEditingTask(null); setAddJenjang('sekunder'); setQuickNama(''); setIsFormOpen(true) }}
          {...shared}
        />
      </div>

      {/* Empty state global */}
      {allTasks.length === 0 && (
        <div className="py-14 text-center">
          <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-lg">Belum ada tugas prioritas</p>
          <p className="text-sm text-muted-foreground mt-1">Tambahkan tugas pertama — pilih jenjangnya di form</p>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}</DialogTitle>
          </DialogHeader>
          {editingTask ? (
            <TaskForm
              initialData={editingTask}
              onSubmit={handleSubmit}
              onCancel={() => { setIsFormOpen(false); setEditingTask(null) }}
              showJenjang
            />
          ) : (
            /* Tambah: field hanya Nama Tugas — jenjang mengikuti kolom tombol */
            <form
              className="space-y-4 p-4"
              onSubmit={(e) => {
                e.preventDefault()
                const nama = quickNama.trim()
                if (!nama) return
                createTask.mutate({ nama, jenjang: addJenjang, estimasi_menit: 0, prioritas: 'p3', status: 'belum' })
                setQuickNama('')
                setIsFormOpen(false)
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="quick-nama">Nama Tugas</Label>
                <Input
                  id="quick-nama"
                  autoFocus
                  placeholder="Contoh: Kerjakan laporan bulanan"
                  value={quickNama}
                  onChange={(e) => setQuickNama(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-400">
                Masuk kolom <span className="font-semibold text-slate-600 dark:text-slate-300">{addJenjang === 'primer' ? 'Primer' : 'Sekunder'}</span> — prioritas, estimasi & status bisa diatur lewat Edit.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setQuickNama('') }}>
                  Batal
                </Button>
                <Button type="submit" disabled={createTask.isPending || !quickNama.trim()}>
                  {createTask.isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog penanda paket */}
      <TaskGroupDialog
        open={!!groupTask}
        onOpenChange={(open) => !open && setGroupTask(null)}
        task={groupTask}
        allTasks={allTasks as unknown as TaskCardTask[]}
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