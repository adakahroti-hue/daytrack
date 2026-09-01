import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AddStepModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: { title: string; target_date: string | null }) => void
  initial?: { title: string; target_date: string | null } | null
}) {
  const [title, setTitle] = useState("")
  const [targetDate, setTargetDate] = useState("")

  useEffect(() => {
    setTitle(initial?.title || "")
    setTargetDate(initial?.target_date || "")
  }, [open, initial])

  const submit = () => {
    if (!title.trim()) return
    onSubmit({ title: title.trim(), target_date: targetDate || null })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Step" : "Tambah Step"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Judul Step</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nama step" />
          </div>
          <div className="space-y-1">
            <Label>Target Tanggal (opsional)</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={submit}>{initial ? "Simpan" : "Tambah"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
