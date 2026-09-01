import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export function AddMilestoneModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: { title: string; description: string }) => void
  initial?: { title: string; description: string } | null
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    setTitle(initial?.title || "")
    setDescription(initial?.description || "")
  }, [open, initial])

  const submit = () => {
    if (!title.trim()) return
    onSubmit({ title: title.trim(), description: description.trim() })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Step Utama" : "Tambah Step Utama"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Judul</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nama milestone" />
          </div>
          <div className="space-y-1">
            <Label>Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi (opsional)" />
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
