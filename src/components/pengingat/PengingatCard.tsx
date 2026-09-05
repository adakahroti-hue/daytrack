"use client"

import { memo } from "react"
import { format, isBefore, startOfDay, differenceInDays } from "date-fns"
import { id } from "date-fns/locale"
import { MoreHorizontal, Edit, Trash2, Bell, Calendar, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn, CARD_BASE, CARD_HOVER } from "@/lib/utils"
import type { Pengingat } from "@/app/actions/pengingat"

function PengingatCardComponent({
  pengingat,
  onEdit,
  onDelete,
}: {
  pengingat: Pengingat
  onEdit: (p: Pengingat) => void
  onDelete: (id: string) => void
}) {
  const taskDate = pengingat.tanggal ? new Date(pengingat.tanggal) : null
  const today = startOfDay(new Date())
  const isOverdue = taskDate ? isBefore(taskDate, today) : false
  const daysOverdue = isOverdue ? differenceInDays(today, taskDate!) : 0

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 rounded-xl",
        CARD_BASE,
        CARD_HOVER,
        isOverdue && "border-l-3 border-l-red-400 dark:border-l-red-500"
      )}
    >
      <CardContent className="px-4 pt-4 pb-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0 relative z-20">
            <Bell className="h-4 w-4 shrink-0 text-slate-400" />
            <h3 className="font-medium text-base leading-tight flex-1 truncate">{pengingat.nama}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mt-1 -mr-1.5 shrink-0 opacity-70"
                aria-label="Menu pengingat"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onEdit(pengingat)}
                className="flex items-center gap-2"
                inset={false}
              >
                <Edit className="h-4 w-4" />Edit Pengingat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(pengingat.id)}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
                inset={false}
              >
                <Trash2 className="h-4 w-4" />Hapus Pengingat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className={cn("whitespace-nowrap", isOverdue && "text-destructive font-medium")}>
                {taskDate ? format(taskDate, "d MMM yyyy", { locale: id }) : "Tanggal —"}
              </span>
            </div>
            {pengingat.jam && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{pengingat.jam}</span>
              </div>
            )}
            {isOverdue && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-0.5 gap-1 h-5 text-destructive border-destructive/30 bg-destructive/10"
              >
                <AlertTriangle className="h-3 w-3" />
                Terlambat {daysOverdue} hari
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const PengingatCard = memo(PengingatCardComponent)
