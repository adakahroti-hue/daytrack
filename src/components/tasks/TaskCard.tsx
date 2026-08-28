"use client"

import { memo } from 'react'
import { format, isBefore, startOfDay, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { Play, Check, CheckCircle2, MoreHorizontal, Edit, Trash2, Layers, Clock, Calendar, AlertTriangle, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { cn, getEstimasiText, getMissionStatusColor, getMissionPriorityColor, BRAND_COLORS, getActualDurationText, compareEstimasiVsActual, getLiveDurationText, PRIORITY_CARD_COLORS, STATUS_SHORT_LABELS, CARD_BASE, CARD_HOVER } from '@/lib/utils'
import { TaskGroupRibbon } from '@/components/tasks/task-group'

export type TaskCardStatus = 'belum' | 'proses' | 'selesai' | 'ide'

export type TaskCardTask = {
  id: string
  user_id: string
  nama: string
  tanggal: string | null
  estimasi_menit: number
  prioritas: 'p1' | 'p2' | 'p3' | 'p4'
  status: TaskCardStatus
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  terlewat_tanggal?: string | null
  group_id?: string | null
  group_order?: number | null
}

// variant:
//  - 'action': tab tugas biasa (Hari Ini/Semua) — tombol Mulai/Selesai
//  - 'ide': tab Bank Ide — tombol "Jadikan Tugas" (ubah status ide -> belum)
export type TaskCardVariant = 'action' | 'ide'

function TaskCardComponent({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onPromoteIde,
  selectionMode,
  selected,
  onToggleSelect,
  onSetGroup,
  variant = 'action',
}: {
  task: TaskCardTask
  onEdit: (task: TaskCardTask) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskCardStatus) => void
  onPromoteIde?: (id: string) => void
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onSetGroup?: (task: TaskCardTask) => void
  variant?: TaskCardVariant
}) {
  const isCompleted = task.status === 'selesai'
  const isInProgress = task.status === 'proses'
  const isPending = task.status === 'belum'
  const isIde = task.status === 'ide'

  const handlePrimaryAction = () => {
    if (isIde) {
      onPromoteIde?.(task.id)
    } else if (isPending) {
      onStatusChange(task.id, 'proses')
    } else if (isInProgress) {
      onStatusChange(task.id, 'selesai')
    }
  }

  const primaryButtonText = isIde ? 'Jadikan Tugas' : isPending ? 'Mulai' : 'Selesai'
  const primaryButtonDisabled = isCompleted
  const PrimaryButtonIcon = () => {
    if (isIde) return <Lightbulb className="h-3.5 w-3.5" />
    if (isPending) return <Play className="h-3.5 w-3.5" />
    if (isInProgress) return <Check className="h-3.5 w-3.5" />
    return <CheckCircle2 className="h-3.5 w-3.5" />
  }

  const taskDate = task.tanggal ? new Date(task.tanggal) : null
  const today = startOfDay(new Date())
  const isOverdue = taskDate ? (isBefore(taskDate, today) && !isCompleted) : false
  const daysOverdue = isOverdue ? differenceInDays(today, taskDate!) : 0

  const statusBadgeClass = cn(
    'text-xs font-medium px-2.5 py-1 rounded-lg border',
    getMissionStatusColor(task.status)
  )
  const priorityBadgeClass = cn(
    'text-xs font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1',
    getMissionPriorityColor(task.prioritas)
  )

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        isCompleted
          ? CARD_BASE
          : cn(
              'rounded-xl transition-colors duration-200',
              isInProgress
                ? 'bg-blue-50 border-blue-300 hover:border-blue-400 dark:bg-blue-950/40 dark:border-blue-800'
                : isIde
                  ? 'bg-violet-50 border-violet-300 hover:border-violet-400 dark:bg-violet-950/40 dark:border-violet-800'
                  : PRIORITY_CARD_COLORS[task.prioritas]
            ),
        CARD_HOVER,
        isCompleted && 'opacity-60',
        isOverdue && !isCompleted && 'border-l-3 border-l-red-400 dark:border-l-red-500',
        isInProgress && 'border-l-3 border-l-amber-400 dark:border-l-amber-500'
      )}
    >
      {task.group_id && task.group_order != null && (
        <TaskGroupRibbon groupId={task.group_id} order={task.group_order} />
      )}
      <CardContent className="pt-4 pb-3 px-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0 relative z-20">
            {selectionMode && (
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect?.(task.id)}
                className="h-4 w-4 shrink-0"
                aria-label="Pilih tugas"
              />
            )}
            <h3 className={cn("font-medium text-base leading-tight capitalize flex-1", task.group_id && "pl-7")}>{task.nama}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mt-1 -mr-1.5 shrink-0 opacity-70"
                aria-label="Menu tugas"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
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
                onClick={() => onSetGroup?.(task as any)}
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

        {task.terlewat_tanggal && task.status !== 'selesai' && (
          <div className="flex items-center gap-1.5 w-fit text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Terlewat — dijadwal ulang dari {format(new Date(task.terlewat_tanggal + 'T00:00:00'), 'd MMMM', { locale: id })}</span>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{getEstimasiText(task.estimasi_menit)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className={cn('whitespace-nowrap', isOverdue && 'text-destructive font-medium')}>
                {task.tanggal ? format(taskDate!, 'd MMM yyyy', { locale: id }) : (isIde ? 'Belum ditentukan' : 'Belum ditentukan')}
              </span>
            </div>
            {isOverdue && !isCompleted && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 gap-1 h-5 text-destructive border-destructive/30 bg-destructive/10">
                <AlertTriangle className="h-3 w-3" />
                Terlambat {daysOverdue} hari
              </Badge>
            )}
          </div>

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

          {task.status === 'proses' && task.started_at && (
            <div className="flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300 animate-pulse pl-6 border-l border-amber-400/50">
              <Clock className="h-3.5 w-3.5" />
              <span>Sedang: {getLiveDurationText(task.started_at)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Badge variant="outline" className={statusBadgeClass}>
            {STATUS_SHORT_LABELS[task.status]}
          </Badge>
          <Button
            variant={isCompleted ? 'outline' : 'default'}
            size="sm"
            className={cn(
              'w-auto sm:w-auto',
              isCompleted && 'bg-muted text-muted-foreground hover:bg-muted/80 border-border',
              isIde && 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm',
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
              <span className="sm:hidden">{isIde ? 'Jadikan' : isPending ? 'Mulai' : 'Selesai'}</span>
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export const TaskCard = memo(TaskCardComponent)
