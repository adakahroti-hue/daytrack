"use client"

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DurationStepper } from './DurationStepper'

const taskSchema = z.object({
  nama: z.string().min(1, 'Nama tugas wajib diisi'),
  tanggal: z.string().optional(),
  estimasi_menit: z.number().int().min(0),
  prioritas: z.enum(['p1', 'p2', 'p3', 'p4']),
  status: z.enum(['belum', 'proses', 'selesai', 'ide']),
})

type TaskFormData = z.infer<typeof taskSchema>

const PRIORITAS_OPTIONS = [
  { value: 'p1', label: 'P1 - Mendesak' },
  { value: 'p2', label: 'P2 - Tinggi' },
  { value: 'p3', label: 'P3 - Sedang' },
  { value: 'p4', label: 'P4 - Rendah' },
]

const STATUS_OPTIONS = [
  { value: 'belum', label: 'Belum' },
  { value: 'proses', label: 'Proses' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'ide', label: 'Ide (belum action)' },
]

interface TaskFormProps {
  initialData?: Partial<TaskFormData> | null
  onSubmit: (data: TaskFormData) => void
  onCancel: () => void
  hideDate?: boolean
}

export function TaskForm({ initialData, onSubmit, onCancel, hideDate }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      nama: '',
      tanggal: format(new Date(), 'yyyy-MM-dd'),
      estimasi_menit: 0,
      prioritas: 'p3',
      status: 'belum',
      ...initialData,
    },
  })

  // Sync jam & menit dari estimasi_menit
  const estimasiMenit = watch('estimasi_menit') || 0
  const [jam, setJam] = useState(Math.floor(estimasiMenit / 60))
  const [menit, setMenit] = useState(estimasiMenit % 60)
  // Rev: izinkan tanggal kosong ("ide yang belum matang")
  const hasDate = watch('tanggal') && watch('tanggal')!.length > 0

  const toggleDate = () => {
    if (hasDate) {
      setValue('tanggal', '', { shouldValidate: false })
    } else {
      setValue('tanggal', format(new Date(), 'yyyy-MM-dd'), { shouldValidate: false })
    }
  }

  // Update jam/menit saat initialData berubah (misal edit)
  useEffect(() => {
    if (initialData?.estimasi_menit !== undefined) {
      const m = initialData.estimasi_menit
      setJam(Math.floor(m / 60))
      setMenit(m % 60)
    }
  }, [initialData?.estimasi_menit])

  // Update estimasi_menit saat jam/menit berubah via stepper
  const handleJamChange = (h: number) => {
    setJam(h)
    setValue('estimasi_menit', h * 60 + menit, { shouldValidate: true })
  }

  const handleMenitChange = (m: number) => {
    setMenit(m)
    setValue('estimasi_menit', jam * 60 + m, { shouldValidate: true })
  }

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

      {!hideDate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tanggal">Tanggal</Label>
            <button
              type="button"
              onClick={toggleDate}
              className="text-xs text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline"
            >
              {hasDate ? 'Kosongkan (ide belum matang)' : 'Isi tanggal'}
            </button>
          </div>
          <Input
            id="tanggal"
            type="date"
            disabled={!hasDate}
            {...register('tanggal')}
          />
          {!hasDate && (
            <p className="text-xs text-slate-400">Tanggal dikosongkan — catatan ide yang belum ditentukan jadwalnya.</p>
          )}
        </div>
      )}

      {/* Estimasi Pengerjaan — Timer Picker (stepper) */}
      <div className="space-y-2">
        <Label>Estimasi Pengerjaan</Label>
        <DurationStepper
          hours={jam}
          minutes={menit}
          onHoursChange={handleJamChange}
          onMinutesChange={handleMenitChange}
        />
        {/* Hidden input untuk menyimpan nilai numerik ke form */}
        <input type="hidden" {...register('estimasi_menit', { valueAsNumber: true })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prioritas">Prioritas</Label>
          <Controller
            control={control}
            name="prioritas"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
          />
        </div>
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
