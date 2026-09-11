"use client"

import { useState, useMemo, useEffect } from 'react'
import { Lightbulb, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TaskForm } from "@/components/tasks/TaskForm"
import { IdeaCard } from "@/components/bank-ide/IdeaCard"
import { useBankIde, useCreateIdea, useUpdateIdea, useDeleteIdea, usePromoteIdea } from '@/hooks/useBankIde'
import { useBankIdeRealtime } from '@/hooks/useRealtime'
import type { Idea } from '@/app/actions/bank-ide'
import type { TaskFormData } from '@/app/actions/tasks'
import { useHeaderControls } from '@/components/layout/HeaderControls'

function BankIdePageClient() {
  const [isIdeFormOpen, setIsIdeFormOpen] = useState(false)
  const [editingIde, setEditingIde] = useState<Idea | null>(null)
  const [promoteId, setPromoteId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  // Rev mobile: tombol "Tambah Ide" pindah ke header kanan atas — registrasi handler via context
  const { setHeaderAddAction } = useHeaderControls()
  useEffect(() => {
    setHeaderAddAction(() => () => { setEditingIde(null); setIsIdeFormOpen(true) })
    return () => setHeaderAddAction(null)
  }, [setHeaderAddAction])

  // Ambil ide dari tabel bank_ide (terpisah dari tugas)
  const { data: ideas = [], isLoading, error } = useBankIde()
  useBankIdeRealtime()

  const createIdea = useCreateIdea()
  const updateIdea = useUpdateIdea()
  const deleteIdea = useDeleteIdea()
  const promoteIdea = usePromoteIdea()

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus ide ini?')) deleteIdea.mutate(id)
  }

  // "Jadikan Tugas": buka form lengkap (field lain) untuk ide ini
  const handlePromoteIde = (id: string) => {
    setPromoteId(id)
  }

  const handleIdeSubmit = (catatan: string) => {
    if (editingIde) {
      updateIdea.mutate({ id: editingIde.id, data: { catatan } })
    } else {
      createIdea.mutate({ catatan })
    }
    setIsIdeFormOpen(false)
    setEditingIde(null)
  }

  // Submit dari form "Jadikan Tugas" — isi field lain lalu buat tugas baru, hapus ide
  const handlePromoteSubmit = (data: TaskFormData) => {
    if (!promoteId) return
    promoteIdea.mutate({
      id: promoteId,
      taskData: {
        nama: data.nama,
        tanggal: data.tanggal && data.tanggal.length > 0 ? data.tanggal : undefined,
        estimasi_menit: data.estimasi_menit,
        prioritas: data.prioritas,
      },
    })
    setPromoteId(null)
  }

  const isCompletelyEmpty = ideas.length === 0

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
    <div className="space-y-6 max-w-[1440px] mx-auto py-6 pb-24">
      {/* Rev mobile: padding kiri-kanan mobile dihapus (main layout sudah p-4) */}
      {ideas.length === 0 ? (
        <div className="py-16 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-lg">Belum ada ide</p>
          <p className="text-sm text-muted-foreground mt-1">Tambahkan ide yang belum matang — nanti bisa dijadikan tugas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onEdit={(it) => { setEditingIde(it); setIsIdeFormOpen(true) }}
              onDelete={handleDelete}
              onPromote={handlePromoteIde}
            />
          ))}
        </div>
      )}

      {/* Tombol tambah ide kini ada di header kanan atas (rev mobile) */}

      {/* Dialog catatan ide (hanya catatan) */}
      <Dialog open={isIdeFormOpen} onOpenChange={setIsIdeFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIde ? 'Edit Ide' : 'Tambah Ide Baru'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const catatan = (fd.get('catatan') as string)?.trim()
              if (catatan) handleIdeSubmit(catatan)
            }}
            className="space-y-4 p-4"
          >
            <div className="space-y-2">
              <Label htmlFor="ide-catatan">Catatan Ide *</Label>
              <Input
                id="ide-catatan"
                name="catatan"
                defaultValue={editingIde?.catatan ?? ''}
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
              initialData={{ status: 'belum' }}
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
