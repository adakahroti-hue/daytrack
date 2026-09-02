"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PengingatFormModal({
  open,
  initial,
  onClose,
  onSubmit,
  isSaving,
}: {
  open: boolean
  initial: { id?: string; nama: string; tanggal: string; jam: string } | null
  onClose: () => void
  onSubmit: (data: { nama: string; tanggal: string | null; jam: string | null }) => void
  isSaving?: boolean
}) {
  const [nama, setNama] = useState("")
  const [tanggal, setTanggal] = useState("")
  const [jam, setJam] = useState("")

  useEffect(() => {
    if (open) {
      setNama(initial?.nama || "")
      setTanggal(initial?.tanggal || "")
      setJam(initial?.jam || "")
    }
  }, [open, initial])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Pengingat" : "Tambah Pengingat"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nama Reminder</Label>
            <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Bayar listrik" />
          </div>
          <div className="space-y-1">
            <Label>Tanggal Reminder</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Jam Reminder</Label>
            <Input type="time" value={jam} onChange={(e) => setJam(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button disabled={!nama.trim() || isSaving} onClick={() => onSubmit({ nama: nama.trim(), tanggal: tanggal || null, jam: jam || null })}>
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
