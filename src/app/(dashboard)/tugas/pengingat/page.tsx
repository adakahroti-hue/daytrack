"use client"

import { useState } from "react"
import { Plus, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PengingatFormModal } from "@/components/pengingat/PengingatFormModal"
import { PengingatList } from "@/components/pengingat/PengingatList"
import { usePengingat } from "@/hooks/usePengingat"
import type { Pengingat } from "@/app/actions/pengingat"

export default function PengingatPage() {
  const { data: items = [], isLoading, create, update, remove } = usePengingat()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Pengingat | null>(null)

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (p: Pengingat) => {
    setEditing(p)
    setModalOpen(true)
  }

  const handleSubmit = (data: { nama: string; tanggal: string | null; jam: string | null }) => {
    if (editing) {
      update.mutate({ id: editing.id, data })
    } else {
      create.mutate(data)
    }
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = (id: string) => {
    if (confirm("Yakin ingin menghapus pengingat ini?")) {
      remove.mutate(id)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900">
          <Bell className="h-5 w-5" />
          <h1 className="text-xl font-bold">Pengingat</h1>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Tambah Pengingat
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Memuat…
        </div>
      ) : (
        <PengingatList items={items} onEdit={openEdit} onDelete={handleDelete} />
      )}

      <PengingatFormModal
        open={modalOpen}
        initial={editing ? { id: editing.id, nama: editing.nama, tanggal: editing.tanggal || "", jam: editing.jam || "" } : null}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        onSubmit={handleSubmit}
        isSaving={create.isPending || update.isPending}
      />
    </div>
  )
}
