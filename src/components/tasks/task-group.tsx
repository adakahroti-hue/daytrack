'use client'

import { useEffect, useState } from 'react'
import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ─── Revisi batch 12: penanda paket tugas (parent / child / single) ───
// Parent: pita nomor 1. Child: pita nomor 2,3,4,... (unik dalam satu paket, dipilih user).
// Single: tanpa pita. Warna pita membedakan paket yang berbeda (deterministik dari group_id).

export type TaskGroupInfo = {
  group_id?: string | null
  group_order?: number | null
}

export type GroupableTask = TaskGroupInfo & {
  id: string
  nama: string
}

const RIBBON_COLORS = [
  'bg-indigo-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-lime-500',
  'bg-cyan-500',
  'bg-fuchsia-500',
]

// Revisi: warna paket dialokasikan per group_id — parent & child satu paket berbagi warna,
// dan setiap parent baru mendapat warna yang belum dipakai group lain (tanpa bentrok).
const groupColorAlloc: Record<string, string> = {}

export function ribbonColorFor(groupId: string): string {
  const existing = groupColorAlloc[groupId]
  if (existing) return existing
  const used = new Set(Object.values(groupColorAlloc))
  const free = RIBBON_COLORS.find(c => !used.has(c))
  groupColorAlloc[groupId] = free ?? RIBBON_COLORS[groupId.length % RIBBON_COLORS.length]
  return groupColorAlloc[groupId]
}

/** Pita penanda paket di pojok kiri atas card tugas. */
export function TaskGroupRibbon({ groupId, order }: { groupId: string; order: number }) {
  const isParent = order === 1
  return (
    <div
      className={cn(
        'absolute top-0 left-3 z-10 w-6 h-8 flex items-start justify-center pt-1 text-[11px] font-bold text-white',
        ribbonColorFor(groupId)
      )}
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
      title={isParent ? 'Parent paket' : `Child paket #${order}`}
      aria-label={isParent ? 'Tugas parent paket' : `Tugas child nomor ${order}`}
    >
      {order}
    </div>
  )
}

/** Dialog untuk mengatur penanda paket sebuah tugas. */
export function TaskGroupDialog({
  open,
  onOpenChange,
  task,
  allTasks,
  onSave,
  isSaving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: GroupableTask | null
  allTasks: GroupableTask[]
  onSave: (data: { group_id: string | null; group_order: number | null }) => void
  isSaving?: boolean
}) {
  const [role, setRole] = useState<'single' | 'parent' | 'child'>('single')
  const [parentGroupId, setParentGroupId] = useState<string>('')
  const [order, setOrder] = useState<number>(2)

  // Daftar parent yang tersedia (group_order = 1), bukan tugas ini sendiri
  const parents = allTasks.filter(t => t.group_id && t.group_order === 1 && t.id !== task?.id)

  // Nomor urut yang masih kosong dalam paket terpilih
  const usedOrders = new Set(
    allTasks.filter(t => t.group_id && t.group_id === parentGroupId).map(t => t.group_order ?? 0)
  )
  const maxUsed = Math.max(1, ...usedOrders)
  const freeOrders: number[] = []
  for (let n = 2; n <= maxUsed + 1; n++) {
    if (!usedOrders.has(n)) freeOrders.push(n)
  }

  // Reset state setiap kali dialog dibuka untuk tugas tertentu
  useEffect(() => {
    if (!open || !task) return
    if (task.group_id && task.group_order === 1) {
      setRole('parent')
      setParentGroupId(task.group_id)
      setOrder(1)
    } else if (task.group_id && task.group_order) {
      setRole('child')
      setParentGroupId(task.group_id)
      setOrder(task.group_order)
    } else {
      setRole('single')
      setParentGroupId('')
      setOrder(2)
    }
  }, [open, task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Jika nomor yang tersimpan ternyata sudah dipakai (konflik), geser ke yang kosong
  useEffect(() => {
    if (role === 'child' && parentGroupId && usedOrders.has(order)) {
      if (freeOrders.length > 0) setOrder(freeOrders[0])
    }
  }, [role, parentGroupId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    if (role === 'single') {
      onSave({ group_id: null, group_order: null })
    } else if (role === 'parent') {
      // Parent baru → paket baru dengan nomor 1; parent lama → pertahankan paketnya
      if (task?.group_id && task.group_order === 1) {
        onSave({ group_id: task.group_id, group_order: 1 })
      } else {
        onSave({ group_id: crypto.randomUUID(), group_order: 1 })
      }
    } else {
      if (!parentGroupId) return
      onSave({ group_id: parentGroupId, group_order: order })
    }
  }

  const childValid = role !== 'child' || (parentGroupId && !usedOrders.has(order))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Penanda Paket
          </DialogTitle>
        </DialogHeader>
        {task && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 line-clamp-1">Tugas: <span className="font-medium text-slate-900">{task.nama}</span></p>

            {/* Pilihan peran */}
            <div className="grid grid-cols-3 gap-2">
              {(['single', 'parent', 'child'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors capitalize',
                    role === r
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            {role === 'single' && (
              <p className="text-xs text-slate-500">Tugas berdiri sendiri — tanpa pita nomor.</p>
            )}
            {role === 'parent' && (
              <p className="text-xs text-slate-500">
                Tugas menjadi kepala paket — pita nomor <span className="font-semibold">1</span> di kiri atas card.
              </p>
            )}

            {role === 'child' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Masuk paket (parent):</label>
                  {parents.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                      Belum ada parent. Jadikan salah satu tugas sebagai parent terlebih dahulu.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {parents.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setParentGroupId(p.group_id!)}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors',
                            parentGroupId === p.group_id
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:bg-slate-50'
                          )}
                        >
                          <span className={cn('w-4 h-5 rounded-sm shrink-0', ribbonColorFor(p.group_id!))} />
                          <span className="truncate">{p.nama}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {parentGroupId && (
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Nomor urut dalam paket:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: Math.max(1, maxUsed) }, (_, i) => i + 2).map(n => {
                        const used = usedOrders.has(n)
                        return (
                          <button
                            key={n}
                            type="button"
                            disabled={used}
                            onClick={() => setOrder(n)}
                            className={cn(
                              'h-8 w-8 rounded-lg border text-sm font-semibold transition-colors',
                              used
                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed line-through'
                                : order === n
                                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            )}
                            title={used ? 'Sudah dipakai' : `Pilih nomor ${n}`}
                          >
                            {n}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Nomor yang sudah dipakai dalam paket ini tidak bisa dipilih.</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button
                size="sm"
                className="bg-[#0F172A] hover:bg-slate-800 text-white"
                disabled={!childValid || isSaving}
                onClick={handleSave}
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
