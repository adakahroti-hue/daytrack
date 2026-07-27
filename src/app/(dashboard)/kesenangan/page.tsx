"use client"

import { useState } from 'react'
import { format, subDays, addDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, RotateCcw, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useKesenangan, useUpsertKesenangan, useKesenanganRange } from '@/hooks/useKesenangan'
import { useKesenanganRealtime } from '@/hooks/useRealtime'

export default function KesenanganPage() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const isToday = isSameDay(currentDate, new Date())

  const { data: kesenanganData, isLoading, error } = useKesenangan(dateKey)
  const { data: weeklyData } = useKesenanganRange(
    format(startOfWeek(currentDate, { locale: id }), 'yyyy-MM-dd'),
    format(endOfWeek(currentDate, { locale: id }), 'yyyy-MM-dd')
  )
  const upsertMutation = useUpsertKesenangan()

  // Subscribe to realtime updates
  useKesenanganRealtime([['kesenangan', dateKey]])

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1))
  }
  const goToToday = () => setCurrentDate(new Date())

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const kesenangan = formData.get('kesenangan') as string
    
    if (!kesenangan.trim()) return

    upsertMutation.mutate({
      tanggal: dateKey,
      hari: format(currentDate, 'EEEE', { locale: id }),
      kesenangan: kesenangan.trim(),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smile className="h-6 w-6 text-primary" />
            Kesenangan
          </h1>
          <p className="text-muted-foreground">Catat momen bahagia hari ini</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium whitespace-nowrap">{format(currentDate, 'EEEE, d MMMM yyyy', { locale: id })}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateDay('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && <Button variant="ghost" size="icon" onClick={goToToday}><RotateCcw className="h-4 w-4" /></Button>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Apa Kesenangan Hari Ini?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <p className="text-center text-destructive py-8">Gagal memuat data: {error.message}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2">
              <Label htmlFor="kesenangan">Ceritakan momen bahagia Anda hari ini</Label>
              <Textarea
                id="kesenangan"
                name="kesenangan"
                placeholder="Contoh: Nonton film bareng keluarga, makan enak di resto favorit, main game dengan teman..."
                defaultValue={kesenanganData?.kesenangan || ''}
                rows={6}
                className="resize-none"
                required
              />
              {kesenanganData?.kesenangan && (
                <p className="text-sm text-muted-foreground">
                  Tersimpan: {kesenanganData.kesenangan.length} karakter
                </p>
              )}
              <Button type="submit" disabled={upsertMutation.isPending} className="w-full sm:w-auto">
                {upsertMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {weeklyData && weeklyData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Kesenangan Minggu Ini</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span>Total Entri</span>
                <span className="font-bold">{weeklyData.filter(d => d.kesenangan).length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span>Rata-rata Panjang</span>
                <span className="font-bold">
                  {weeklyData.filter(d => d.kesenangan).length > 0
                    ? Math.round(weeklyData.filter(d => d.kesenangan).reduce((sum, d) => sum + d.kesenangan.length, 0) / weeklyData.filter(d => d.kesenangan).length)
                    : 0} karakter
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}