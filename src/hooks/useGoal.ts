import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getActiveGoal,
  listGoals,
  setActiveGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  createStep,
  updateStep,
  toggleStepCompleted,
  deleteStep,
  addProgressLog,
} from "@/app/actions/goal"

// ── Optimistic helpers ──────────────────────────────────────────────
// Semua mutation goal memakai optimistic update: cache ["goal","active"]
// diubah SEKETIKA saat klik (UI terasa instan), server menyusul di belakang.
// Kalau gagal → rollback + refetch agar kondisinya sinkron dengan server.

type Patch = (g: any) => any

/** Patch optimistis cache goal aktif; rollback otomatis saat error. */
function optimisticGoal(
  qc: ReturnType<typeof useQueryClient>,
  patch: Patch,
) {
  const key = ["goal", "active"]
  const prev = qc.getQueryData<any>(key)
  if (prev) qc.setQueryData(key, patch(prev))
  return () => {
    if (prev) qc.setQueryData(key, prev)
    else qc.removeQueries({ queryKey: key })
  }
}

/** Patch step by id di dalam struktur goal aktif. */
function patchStepIn(goalData: any, stepId: string, data: Partial<any>): any {
  return {
    ...goalData,
    milestones: goalData.milestones.map((m: any) =>
      m.steps.some((s: any) => s.id === stepId)
        ? { ...m, steps: m.steps.map((s: any) => (s.id === stepId ? { ...s, ...data } : s)) }
        : m
    ),
  }
}

/** Patch milestone by id. */
function patchMilestoneIn(goalData: any, msId: string, data: Partial<any>): any {
  return {
    ...goalData,
    milestones: goalData.milestones.map((m: any) => (m.id === msId ? { ...m, ...data } : m)),
  }
}

export function useActiveGoal() {
  return useQuery({
    queryKey: ["goal", "active"],
    queryFn: () => getActiveGoal(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useListGoals() {
  return useQuery({
    queryKey: ["goal", "list"],
    queryFn: () => listGoals(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useSetActiveGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => setActiveGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal"] })
    },
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; target_date?: string | null }) => createGoal(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; target_date?: string | null } }) =>
      updateGoal(id, data),
    onMutate: ({ id, data }) => optimisticGoal(qc, (g) => (g.id === id ? { ...g, ...data } : g)),
    onError: (_e, _v, ctx: any) => ctx?.(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useCreateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { goal_id: string; title: string; description?: string }) => createMilestone(data),
    onSettled: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useUpdateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; description?: string; order?: number; is_completed?: boolean } }) =>
      updateMilestone(id, data),
    onMutate: ({ id, data }) => optimisticGoal(qc, (g) => patchMilestoneIn(g, id, data)),
    onError: (_e, _v, ctx: any) => ctx?.(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMilestone(id),
    onMutate: (id: string) => optimisticGoal(qc, (g) => ({
      ...g,
      milestones: g.milestones.filter((m: any) => m.id !== id),
    })),
    onError: (_e, _v, ctx: any) => ctx?.(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useCreateStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { milestone_id: string; title: string; target_date?: string | null }) => createStep(data),
    onSettled: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useUpdateStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { title?: string; target_date?: string | null; order?: number; is_completed?: boolean }
    }) => updateStep(id, data),
    onMutate: ({ id, data }) => optimisticGoal(qc, (g) => patchStepIn(g, id, data)),
    onError: (_e, _v, ctx: any) => ctx?.(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useToggleStepCompleted() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) => toggleStepCompleted(id, isCompleted),
    onMutate: ({ id, isCompleted }) => optimisticGoal(qc, (g) => patchStepIn(g, id, { is_completed: isCompleted })),
    onError: (_e, _v, ctx: any) => ctx?.(),
    onSettled: () => {
      // TANPA invalidate untuk is_completed murni — patch sudah akurat.
      // invalidate akan memicu refetch 4-query; cukup segarkan di background tipis.
      // (tetap invalidate list untuk konsistensi header dropdown goal)
      qc.invalidateQueries({ queryKey: ["goal", "list"] })
    },
  })
}

export function useDeleteStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStep(id),
    onMutate: (id: string) => optimisticGoal(qc, (g) => ({
      ...g,
      milestones: g.milestones.map((m: any) => ({
        ...m,
        steps: m.steps.filter((s: any) => s.id !== id),
      })),
    })),
    onError: (_e, _v, ctx: any) => ctx?.(),
    onSettled: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useAddProgressLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      goal_id: string
      milestone_id?: string | null
      step_id?: string | null
      activity: string
      duration?: number
      date?: string
    }) => addProgressLog(data),
    onSettled: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}
