import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AddMilestoneModal({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: { title: string }) => void
  initial?: { title: string } | null
}) {
  const [title, setTitle] = useState("")

  useEffect(() => {
    setTitle(initial?.title || "")
  }, [open, initial])

  const submit = () => {
    if (!title.trim()) return
    onSubmit({ title: title.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Milestone" : "Tambah Milestone"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Judul</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nama milestone"
              onKeyDown={(e) => { if (e.key === "Enter") submit() }}
            />
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
