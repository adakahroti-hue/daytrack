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
import { useActiveGoal, useCreateGoal, useCreateMilestone, useUpdateMilestone, useDeleteMilestone, useCreateStep, useUpdateStep, useToggleStepCompleted, useDeleteStep } from "@/hooks/useGoal"

export default function GoalPage() {
  const { data: goal, isLoading } = useActiveGoal()
  const createGoal = useCreateGoal()
  const createMilestone = useCreateMilestone()
  const updateMilestone = useUpdateMilestone()
  const deleteMilestone = useDeleteMilestone()
  const createStep = useCreateStep()
  const updateStep = useUpdateStep()
  const toggleStep = useToggleStepCompleted()
  const deleteStep = useDeleteStep()

  const [tab, setTab] = useState<GoalTab>("roadmap")
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
    const goalProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
    return { completedSteps, totalSteps, activeDays, totalDuration, goalProgress }
  }, [goal])

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-400">Memuat…</div>
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
        <Dialog open={createGoalOpen} onOpenChange={(o) => !o && setCreateGoalOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Goal Baru</DialogTitle>
            </DialogHeader>
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
                    createGoal.mutate({ title: goalTitle.trim() }, { onSuccess: () => { setGoalTitle(""); setCreateGoalOpen(false) } })
                  }}
                >
                  Buat
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <GoalHeader goalTitle={goal.title} goalProgress={stats.goalProgress} targetDate={goal.target_date} />
      <GoalStats
        completedSteps={stats.completedSteps}
        totalSteps={stats.totalSteps}
        activeDays={stats.activeDays}
        totalDuration={stats.totalDuration}
        targetDate={goal.target_date}
      />

      <div className="flex items-center justify-between">
        <GoalTabs active={tab} onChange={setTab} />
        {tab === "roadmap" && (
          <Button size="sm" onClick={() => setMilestoneModal({ open: true, edit: null })}>
            <Plus className="h-4 w-4" /> Tambah Step Utama
          </Button>
        )}
      </div>

      {tab === "roadmap" && (
        <RoadmapList
          milestones={goal.milestones}
          onToggleStep={(id, c) => toggleStep.mutate({ id, isCompleted: c })}
          onEditStep={(step) => setStepModal({ open: true, milestoneId: step.milestone_id, edit: step })}
          onDeleteStep={(id) => deleteStep.mutate(id)}
          onAddStep={(milestoneId) => setStepModal({ open: true, milestoneId, edit: null })}
          onEditMilestone={(m) => setMilestoneModal({ open: true, edit: m })}
          onDeleteMilestone={(id) => deleteMilestone.mutate(id)}
        />
      )}

      {tab === "progress" && <ProgressLogList logs={goal.progressLogs} />}

      {tab === "insight" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Milestone</p>
            <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{goal.milestones.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Step Selesai</p>
            <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{stats.completedSteps}/{stats.totalSteps}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Hari Aktif</p>
            <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{stats.activeDays}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total Waktu</p>
            <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
              {Math.floor(stats.totalDuration / 60)}j {stats.totalDuration % 60}m
            </p>
          </div>
        </div>
      )}

      <AddMilestoneModal
        open={milestoneModal.open}
        initial={milestoneModal.edit}
        onClose={() => setMilestoneModal({ open: false, edit: null })}
        onSubmit={(data) => {
          if (milestoneModal.edit) {
            updateMilestone.mutate({ id: milestoneModal.edit.id, data })
          } else {
            createMilestone.mutate({ goal_id: goal.id, ...data })
          }
        }}
      />

      <AddStepModal
        open={stepModal.open}
        initial={stepModal.edit}
        onClose={() => setStepModal({ open: false, milestoneId: null, edit: null })}
        onSubmit={(data) => {
          if (stepModal.edit) {
            updateStep.mutate({ id: stepModal.edit.id, data })
          } else if (stepModal.milestoneId) {
            createStep.mutate({ milestone_id: stepModal.milestoneId, ...data })
          }
        }}
      />
    </div>
  )
}
