"use client"

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const taskSchema = z.object({
  nama: z.string().min(1, 'Nama tugas wajib diisi'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  jam: z.string().min(1, 'Jam wajib diisi'),
  estimasi_menit: z.number().min(0).default(0),
  prioritas: z.enum(['p1', 'p2', 'p3', 'p4']).default('p3'),
  aspek: z.enum(['psikis', 'produktivitas', 'keuangan', 'hubungan']).default('produktivitas'),
  deadline_tanggal: z.string().optional(),
  deadline_jam: z.string().optional(),
  status: z.enum(['belum', 'proses', 'selesai']).default('belum'),
})

// Define the form data type explicitly with required fields for those with defaults
type TaskFormDefaults = {
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

// Create a stricter schema for validation that matches the output type
const taskFormSchema = taskSchema.strict() as z.ZodType<TaskFormDefaults>

interface TaskFormProps {
  initialData?: Partial<TaskFormDefaults> | null
  onSubmit: (data: TaskFormDefaults) => void
  onCancel: () => void
}

const PRIORITAS_OPTIONS = [
  { value: 'p1', label: 'P1 - Mendesak' },
  { value: 'p2', label: 'P2 - Tinggi' },
  { value: 'p3', label: 'P3 - Sedang' },
  { value: 'p4', label: 'P4 - Rendah' },
]

const ASPEK_OPTIONS = [
  { value: 'psikis', label: 'Psikis' },
  { value: 'produktivitas', label: 'Produktivitas' },
  { value: 'keuangan', label: 'Keuangan' },
  { value: 'hubungan', label: 'Hubungan' },
]

const STATUS_OPTIONS = [
  { value: 'belum', label: 'Belum' },
  { value: 'proses', label: 'Proses' },
  { value: 'selesai', label: 'Selesai' },
]

function generateTimeOptions() {
  const times = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }
  return times
}

const TIME_OPTIONS = generateTimeOptions()

export function TaskForm({ initialData, onSubmit, onCancel }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormDefaults>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      nama: '',
      tanggal: format(new Date(), 'yyyy-MM-dd'),
      jam: format(new Date(), 'HH:mm'),
      estimasi_menit: 0,
      prioritas: 'p3',
      aspek: 'produktivitas',
      status: 'belum',
      ...initialData,
    },
  })

  const hasDeadline = watch('deadline_tanggal')

  useEffect(() => {
    if (initialData) {
      // Split datetime if needed
      if (initialData.tanggal && initialData.jam) {
        // Already split
      }
    }
  }, [initialData])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="nama">Nama Tugas *</Label>
        <Input
          id="nama"
          placeholder="Contoh: Kerjakan laporan keuangan"
          {...register('nama')}
        />
        {errors.nama && <p className="text-sm text-destructive">{errors.nama.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tanggal">Tanggal *</Label>
          <Input
            id="tanggal"
            type="date"
            {...register('tanggal')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jam">Jam *</Label>
          <Select {...register('jam')}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih jam" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimasi_menit">Estimasi Pengerjaan (menit)</Label>
        <Input
          id="estimasi_menit"
          type="number"
          min="0"
          step="15"
          {...register('estimasi_menit', { valueAsNumber: true })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prioritas">Prioritas</Label>
          <Select {...register('prioritas')}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih prioritas" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITAS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspek">Aspek</Label>
          <Select {...register('aspek')}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih aspek" />
            </SelectTrigger>
            <SelectContent>
              {ASPEK_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Deadline (Opsional)</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deadline_tanggal">Tanggal Deadline</Label>
            <Input
              id="deadline_tanggal"
              type="date"
              {...register('deadline_tanggal')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline_jam">Jam Deadline</Label>
            <Select {...register('deadline_jam')}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jam" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select {...register('status')}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan...' : initialData ? 'Update' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
