"use client"

import { useMemo, useState } from "react"
import { Plus, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GoalHeader } from "@/components/goal/GoalHeader"
import { GoalStats } from "@/components/goal/GoalStats"
import { GoalTabs, type GoalTab } from "@/components/goal/GoalTabs"
import { RoadmapList } from "@/components/goal/RoadmapList"
import { AddMilestoneModal } from "@/components/goal/AddMilestoneModal"
import { AddStepModal } from "@/components/goal/AddStepModal"
import { ProgressLogList } from "@/components/goal/ProgressLogList"
import { useActiveGoal, useListGoals, useSetActiveGoal, useCreateGoal, useUpdateGoal, useDeleteGoal, useCreateMilestone, useUpdateMilestone, useDeleteMilestone, useCreateStep, useUpdateStep, useToggleStepCompleted, useDeleteStep } from "@/hooks/useGoal"

function errMsg(e: any) {
  return e?.message || "unknown error"
}

export default function GoalPage() {
  const { data: goal, isLoading, error: goalError } = useActiveGoal()
  const { data: goals } = useListGoals()
  const setActiveGoal = useSetActiveGoal()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const createMilestone = useCreateMilestone()
  const updateMilestone = useUpdateMilestone()
  const deleteMilestone = useDeleteMilestone()
  const createStep = useCreateStep()
  const updateStep = useUpdateStep()
  const toggleStep = useToggleStepCompleted()
  const deleteStep = useDeleteStep()

  const [tab, setTab] = useState<GoalTab>("roadmap")
  const [editGoalOpen, setEditGoalOpen] = useState(false)
  const [deleteGoalOpen, setDeleteGoalOpen] = useState(false)
  const [goalName, setGoalName] = useState("")
  const [milestoneModal, setMilestoneModal] = useState<{ open: boolean; edit: any }>({ open: false, edit: null })
  const [stepModal, setStepModal] = useState<{ open: boolean; milestoneId: string | null; edit: any }>({
    open: false,
    milestoneId: null,
    edit: null,
  })
  const [createGoalOpen, setCreateGoalOpen] = useState(false)
  const [goalTitle, setGoalTitle] = useState("")

  const stats = useMemo(() => {
    if (!goal) return { completedSteps: 0, totalSteps: 0, activeDays: 0, totalDuration: 0, goalProgress: 0 }
    const allSteps = goal.milestones.flatMap((m) => m.steps)
    const completedSteps = allSteps.filter((s) => s.is_completed).length
    const totalSteps = allSteps.length
    const activeDays = new Set(goal.progressLogs.map((l) => l.date)).size
    const totalDuration = goal.progressLogs.reduce((a, l) => a + (l.duration || 0), 0)
    // Progress goal = rata-rata progress tiap milestone (bobot sama per milestone).
    // - Milestone dengan step: progress = step selesai / total step
    // - Milestone tanpa step: 100% kalau dicentang manual, selain itu 0%
    // Jadi 1 milestone saja yang dicentang → goal 100%.
    const msProgress = goal.milestones.map((m) => {
      if (m.steps.length > 0) {
        const done = m.steps.filter((s) => s.is_completed).length
        // milestone dicentang manual → hitung penuh walau ada step yang belum
        return m.is_completed ? 1 : done / m.steps.length
      }
      return m.is_completed ? 1 : 0
    })
    const goalProgress = msProgress.length > 0
      ? (msProgress.reduce((a, b) => a + b, 0) / msProgress.length) * 100
      : 0
    return { completedSteps, totalSteps, activeDays, totalDuration, goalProgress }
  }, [goal])

  // Dialog "Buat Goal Baru" — di-render di LUAR blok if(!goal) agar bisa dipakai saat belum ada goal maupun sudah ada goal
  const createGoalDialog = (
    <Dialog open={createGoalOpen} onOpenChange={(o) => !o && setCreateGoalOpen(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Goal Baru</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500">Goal baru akan jadi goal aktif. Goal-goal sebelumnya tetap tersimpan dan bisa dipilih kembali lewat dropdown di atas.</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nama Goal</Label>
            <Input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Misal: Menabung rumah" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateGoalOpen(false)}>Batal</Button>
            <Button
              disabled={!goalTitle.trim() || createGoal.isPending}
              onClick={() => {
                createGoal.mutate(
                  { title: goalTitle.trim() },
                  {
                    onSuccess: () => { setGoalTitle(""); setCreateGoalOpen(false) },
                    onError: (e: any) => {
                      import("sonner").then(({ toast }) => toast.error(`Gagal simpan goal: ${e?.message || "unknown error"}`))
                    },
                  }
                )
              }}
            >
              Buat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-400">Memuat…</div>
  }

  if (goalError) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-medium text-rose-700">Gagal memuat goal</p>
          <p className="mt-1 text-xs text-rose-600/80 break-words">{goalError.message}</p>
        </div>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <Target className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Belum ada goal. Buat goal pertamamu.</p>
          <Button className="mt-4" onClick={() => setCreateGoalOpen(true)}>
            <Plus className="h-4 w-4" /> Buat Goal
          </Button>
        </div>
        {createGoalDialog}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-none space-y-4 p-4">
      <GoalHeader
        goalTitle={goal.title}
        goalProgress={stats.goalProgress}
        targetDate={goal.target_date}
        goals={goals || []}
        activeGoalId={goal.id}
        onSelectGoal={(id) =>
          setActiveGoal.mutate(id, {
            onError: (e: any) =>
              import("sonner").then(({ toast }) => toast.error(`Gagal ganti goal: ${errMsg(e)}`)),
          })
        }
        onEdit={() => { setGoalName(goal.title); setEditGoalOpen(true) }}
        onDelete={() => setDeleteGoalOpen(true)}
        onNewGoal={() => setCreateGoalOpen(true)}
      />

      <div className="flex items-center justify-between">
        <GoalTabs active={tab} onChange={setTab} />
        {tab === "roadmap" && (
          <Button size="sm" onClick={() => setMilestoneModal({ open: true, edit: null })}>
            <Plus className="h-4 w-4" /> Tambah Milestone
          </Button>
        )}
      </div>

      {tab === "roadmap" && (
        <RoadmapList
          milestones={goal.milestones}
          onToggleStep={(id, c) => toggleStep.mutate(
            { id, isCompleted: c },
            { onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal update step: ${errMsg(e)}`)) }
          )}
          onToggleAllSteps={(milestoneId, c) => {
            const m = goal.milestones.find((m) => m.id === milestoneId)
            if (!m) return
            const targets = m.steps.filter((s) => s.is_completed !== c)
            targets.forEach((s) =>
              toggleStep.mutate(
                { id: s.id, isCompleted: c },
                { onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal update step: ${errMsg(e)}`)) }
              )
            )
          }}
          onEditStep={(step) => setStepModal({ open: true, milestoneId: step.milestone_id, edit: step })}
          onDeleteStep={(id) => deleteStep.mutate(id, {
            onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal hapus step: ${errMsg(e)}`)),
          })}
          onAddStep={(milestoneId) => setStepModal({ open: true, milestoneId, edit: null })}
          onToggleMilestone={(id, c) => updateMilestone.mutate(
            { id, data: { is_completed: c } },
            { onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal update milestone: ${errMsg(e)}`)) }
          )}
          onEditMilestone={(m) => setMilestoneModal({ open: true, edit: m })}
          onMoveMilestone={(id, dir) => {
            // Tukar order dengan milestone tetangga — optimistic + 2 update paralel
            const sorted = [...goal.milestones].sort((a, b) => a.order - b.order)
            const idx = sorted.findIndex((m) => m.id === id)
            if (idx < 0) return
            const target = dir === "up" ? idx - 1 : idx + 1
            if (target < 0 || target >= sorted.length) return
            const a = sorted[idx]
            const b = sorted[target]
            ;[a, b].forEach((m) =>
              updateMilestone.mutate(
                { id: m.id, data: { order: m === a ? b.order : a.order } },
                {
                  onError: (e: any) =>
                    import("sonner").then(({ toast }) => toast.error(`Gagal pindah milestone: ${errMsg(e)}`)),
                }
              )
            )
          }}
          onDeleteMilestone={(id) => deleteMilestone.mutate(id, {
            onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal hapus milestone: ${errMsg(e)}`)),
          })}
        />
      )}

      {tab === "progress" && <ProgressLogList logs={goal.progressLogs} />}

      {tab === "insight" && (
        <GoalStats
          completedSteps={stats.completedSteps}
          totalSteps={stats.totalSteps}
          activeDays={stats.activeDays}
          totalDuration={stats.totalDuration}
          targetDate={goal.target_date}
          milestoneCount={goal.milestones.length}
        />
      )}

      <AddMilestoneModal
        open={milestoneModal.open}
        initial={milestoneModal.edit}
        onClose={() => setMilestoneModal({ open: false, edit: null })}
        onSubmit={(data) => {
          if (milestoneModal.edit) {
            updateMilestone.mutate(
              { id: milestoneModal.edit.id, data },
              {
                onSuccess: () => setMilestoneModal({ open: false, edit: null }),
                onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal simpan milestone: ${errMsg(e)}`)),
              }
            )
          } else {
            createMilestone.mutate(
              { goal_id: goal.id, ...data },
              {
                onSuccess: () => setMilestoneModal({ open: false, edit: null }),
                onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal buat milestone: ${errMsg(e)}`)),
              }
            )
          }
        }}
      />

      <AddStepModal
        open={stepModal.open}
        initial={stepModal.edit}
        onClose={() => setStepModal({ open: false, milestoneId: null, edit: null })}
        onSubmit={(data) => {
          if (stepModal.edit) {
            updateStep.mutate(
              { id: stepModal.edit.id, data },
              {
                onSuccess: () => setStepModal({ open: false, milestoneId: null, edit: null }),
                onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal simpan step: ${errMsg(e)}`)),
              }
            )
          } else if (stepModal.milestoneId) {
            createStep.mutate(
              { milestone_id: stepModal.milestoneId, ...data },
              {
                onSuccess: () => setStepModal({ open: false, milestoneId: null, edit: null }),
                onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal buat step: ${errMsg(e)}`)),
              }
            )
          }
        }}
      />

      {/* Modal edit nama goal */}
      <Dialog open={editGoalOpen} onOpenChange={(o) => !o && setEditGoalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Nama Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Goal</Label>
              <Input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Nama goal" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditGoalOpen(false)}>Batal</Button>
              <Button
                disabled={!goalName.trim() || updateGoal.isPending}
                onClick={() => {
                  updateGoal.mutate(
                    { id: goal.id, data: { title: goalName.trim() } },
                    {
                      onSuccess: () => setEditGoalOpen(false),
                      onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal simpan nama goal: ${errMsg(e)}`)),
                    }
                  )
                }}
              >
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog konfirmasi hapus goal */}
      <Dialog open={deleteGoalOpen} onOpenChange={(o) => !o && setDeleteGoalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Goal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Yakin ingin menghapus goal <span className="font-semibold text-slate-900">{goal.title}</span> beserta seluruh milestone, step, dan log progresnya? Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteGoalOpen(false)}>Batal</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleteGoal.isPending}
              onClick={() => {
                deleteGoal.mutate(
                  goal.id,
                  {
                    onSuccess: () => { setDeleteGoalOpen(false) },
                    onError: (e: any) => import("sonner").then(({ toast }) => toast.error(`Gagal hapus goal: ${errMsg(e)}`)),
                  }
                )
              }}
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog buat goal baru — selalu tersedia (single-goal: goal lama otomatis dihapus) */}
      {createGoalDialog}
    </div>
  )
}
