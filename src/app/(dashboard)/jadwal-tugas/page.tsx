"use client"

import { useState } from 'react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { Plus, Filter, MoreVertical, Edit, Trash2, CheckCircle2, Clock, AlertTriangle, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn, getPriorityColor, getPriorityLabel, getAspectColor, getAspectLabel, getStatusLabel, getStatusColor, formatDate, formatTime, getEstimasiText, isOverdue } from '@/lib/utils'
import { TaskForm } from '@/components/tasks/TaskForm'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus } from '@/hooks/useTasks'
import { useTasksRealtime } from '@/hooks/useRealtime'

// Task type from Supabase database
type Task = {
  id: string
  user_id: string
  nama: string
  tanggal_jam: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  aspek: 'psikis' | 'produktivitas' | 'keuangan' | 'hubungan'
  deadline: string | null
  status: 'belum' | 'proses' | 'selesai'
  created_at: string
  updated_at: string
}

// Local type for task form data
type TaskFormData = {
  nama: string
  tanggal: string
  jam: string
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  aspek: 'psikis' | 'produktivitas' | 'keuangan' | 'hubungan'
  deadline_tanggal?: string
  deadline_jam?: string
  status: 'belum' | 'proses' | 'selesai'
}

export default function JadwalTugasPage() {
  const [activeTab, setActiveTab] = useState<'hari-ini' | 'selesai' | 'semua'>('hari-ini')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskFormData | null>(null)

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // Fetch tasks using TanStack Query
  const { data: allTasks = [], isLoading, error } = useTasks()
  const { data: todayTasks = [] } = useTasks(todayStr)
  const { data: completedTasks = [] } = useTasks(undefined, 'selesai')

  // Subscribe to realtime updates
  useTasksRealtime([
    ['tasks'],
    ['tasks', todayStr],
    ['tasks', '', 'selesai'],
  ])

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTaskStatus = useToggleTaskStatus()

  const tabs = [
    { id: 'hari-ini', label: `Hari Ini (${todayTasks.length})` },
    { id: 'selesai', label: `Selesai (${completedTasks.length})` },
    { id: 'semua', label: `Semua (${allTasks.length})` },
  ]

  const handleEdit = (task: typeof allTasks[0]) => {
    const taskDate = new Date(task.tanggal_jam)
    const deadlineDate = task.deadline ? new Date(task.deadline) : null
    const formData: TaskFormData = {
      nama: task.nama,
      tanggal: format(taskDate, 'yyyy-MM-dd'),
      jam: format(taskDate, 'HH:mm'),
      estimasi_menit: task.estimasi_menit,
      prioritas: task.prioritas,
      aspek: task.aspek,
      deadline_tanggal: deadlineDate ? format(deadlineDate, 'yyyy-MM-dd') : undefined,
      deadline_jam: deadlineDate ? format(deadlineDate, 'HH:mm') : undefined,
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
    if (editingTask) {
      // Update existing task
      const taskId = allTasks.find(t => t.nama === editingTask.nama && t.tanggal_jam === new Date(`${data.tanggal}T${data.jam}`).toISOString())?.id
      if (taskId) {
        updateTask.mutate({ id: taskId, data })
      }
    } else {
      // Create new task
      const taskData = {
        ...data,
        tanggal_jam: new Date(`${data.tanggal}T${data.jam}`).toISOString(),
        deadline: data.deadline_tanggal && data.deadline_jam 
          ? new Date(`${data.deadline_tanggal}T${data.deadline_jam}`).toISOString()
          : undefined,
      }
      createTask.mutate(taskData)
    }
    setIsFormOpen(false)
    setEditingTask(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Jadwal Tugas</h1>
            <p className="text-muted-foreground">Kelola dan lacak tugas harian Anda</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Memuat tugas...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Jadwal Tugas</h1>
            <p className="text-muted-foreground">Kelola dan lacak tugas harian Anda</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Gagal memuat tugas: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter tasks based on active tab
  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'hari-ini':
        return todayTasks
      case 'selesai':
        return completedTasks
      case 'semua':
      default:
        return allTasks
    }
  }

  const filteredTasks = getFilteredTasks()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Tugas</h1>
          <p className="text-muted-foreground">Kelola dan lacak tugas harian Anda</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Tugas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}</DialogTitle>
            </DialogHeader>
            <TaskForm
              initialData={editingTask}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsFormOpen(false)
                setEditingTask(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'hari-ini' | 'selesai' | 'semua')} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-1 bg-muted p-1 rounded-lg">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="px-4 py-2 text-sm font-medium">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="hari-ini" className="mt-4">
          <TaskTable tasks={filteredTasks} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </TabsContent>

        <TabsContent value="selesai" className="mt-4">
          <TaskTable tasks={filteredTasks} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </TabsContent>

        <TabsContent value="semua" className="mt-4">
          <TaskTable tasks={filteredTasks} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TaskTable({ 
  tasks, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: { 
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: 'belum' | 'proses' | 'selesai') => void
}) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Tidak ada tugas</p>
        </CardContent>
      </Card>
    )
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by status: belum -> proses -> selesai, then by time
    const statusOrder = { belum: 0, proses: 1, selesai: 2 }
    const statusDiff = statusOrder[a.status] - statusOrder[b.status]
    if (statusDiff !== 0) return statusDiff
    return new Date(a.tanggal_jam).getTime() - new Date(b.tanggal_jam).getTime()
  })

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="w-[40%]">Nama Tugas</TableHead>
              <TableHead className="w-[15%]">Tanggal & Jam</TableHead>
              <TableHead className="w-[10%]">Estimasi</TableHead>
              <TableHead className="w-[10%]">Prioritas</TableHead>
              <TableHead className="w-[10%]">Aspek</TableHead>
              <TableHead className="w-[10%]">Deadline</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[5%] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => (
              <TableRow key={task.id} className={task.status === 'selesai' ? 'opacity-60' : ''}>
                <TableCell className="font-medium">{task.nama}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{formatDate(task.tanggal_jam)}</div>
                    <div className="text-muted-foreground">{formatTime(task.tanggal_jam)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{getEstimasiText(task.estimasi_menit)}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPriorityColor(task.prioritas)}>
                    {getPriorityLabel(task.prioritas)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getAspectColor(task.aspek)}>
                    {getAspectLabel(task.aspek)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.deadline ? (
                    <div className="text-sm">
                      <div>{formatDate(task.deadline)}</div>
                      <div className="text-muted-foreground">{formatTime(task.deadline)}</div>
                      {isOverdue(task.deadline, task.status) && (
                        <span className="text-xs text-destructive font-medium">⚠ Terlambat</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Select value={task.status} onValueChange={(value) => onStatusChange(task.id, value as 'belum' | 'proses' | 'selesai')}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="belum">Belum</SelectItem>
                      <SelectItem value="proses">Proses</SelectItem>
                      <SelectItem value="selesai">Selesai</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  )
}