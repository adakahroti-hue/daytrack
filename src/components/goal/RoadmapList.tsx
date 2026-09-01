import { MilestoneItem } from "./MilestoneItem"

export function RoadmapList({
  milestones,
  onToggleStep,
  onEditStep,
  onDeleteStep,
  onAddStep,
  onEditMilestone,
  onDeleteMilestone,
}: {
  milestones: any[]
  onToggleStep: (id: string, isCompleted: boolean) => void
  onEditStep: (step: any) => void
  onDeleteStep: (id: string) => void
  onAddStep: (milestoneId: string) => void
  onEditMilestone: (milestone: any) => void
  onDeleteMilestone: (id: string) => void
}) {
  if (milestones.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
        Belum ada milestone. Klik “+ Tambah Step Utama” di kanan atas untuk membuat roadmap.
      </p>
    )
  }
  const sorted = [...milestones].sort((a, b) => a.order - b.order)
  return (
    <div className="space-y-3">
      {sorted.map((m) => (
        <MilestoneItem
          key={m.id}
          milestone={m}
          onToggleStep={onToggleStep}
          onEditStep={onEditStep}
          onDeleteStep={onDeleteStep}
          onAddStep={onAddStep}
          onEditMilestone={onEditMilestone}
          onDeleteMilestone={onDeleteMilestone}
        />
      ))}
    </div>
  )
}
