"use client"

import { useState } from 'react'
import { format, subDays, addDays, startOfDay, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Heart, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useDoa, useUpsertDoa } from '@/hooks/useDoa'
import { useDoaRealtime } from '@/hooks/useRealtime'

const STATUS_OPTIONS = [
  { value: 'ya', label: 'Ya' },
  { value: 'tidak', label: 'Tidak' },
] as const

export default function DoaPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: doaData, isLoading, error, refetch } = useDoa(dateKey)
  const upsertDoa = useUpsertDoa()

  // Subscribe to realtime updates
  useDoaRealtime([['doa', dateKey]])

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleStatusChange = async (status: 'ya' | 'tidak') => {
    const newKeterangan = status === 'ya' ? (doaData?.keterangan || '') : ''
    
    await upsertDoa.mutateAsync({
      tanggal: dateKey,
      hari: format(currentDate, 'EEEE', { locale: id }),
      status,
      keterangan: newKeterangan,
    })
    
    refetch()
  }

  const handleKeteranganChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!doaData) return
    
    await upsertDoa.mutateAsync({
      tanggal: dateKey,
      hari: format(currentDate, 'EEEE', { locale: id }),
      status: doaData.status,
      keterangan: e.target.value,
    })
    
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Doa Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Status Doa
            {doaData && (
              <span className={cn(
                'text-sm font-normal px-2 py-1 rounded-full',
                doaData.status === 'ya' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              )}>
                {doaData.status === 'ya' ? 'Sudah' : 'Belum'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive py-8">
              <p>Gagal memuat data: {error.message}</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                Coba Lagi
              </Button>
            </div>
          ) : doaData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium w-24">Status</Label>
                <Select
                  value={doaData.status}
                  onValueChange={(value) => handleStatusChange(value as 'ya' | 'tidak')}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Pilih status..." />
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

              <div className="space-y-2">
                <Label className="text-sm font-medium">Keterangan</Label>
                <Textarea
                  value={doaData.keterangan || ''}
                  onChange={handleKeteranganChange}
                  placeholder="Tulis keterangan doa Anda..."
                  rows={3}
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Belum ada data untuk hari ini</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}