import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getActiveGoal,
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

export function useActiveGoal() {
  return useQuery({ queryKey: ["goal", "active"], queryFn: () => getActiveGoal() })
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useUpdateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; description?: string; order?: number } }) =>
      updateMilestone(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMilestone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useCreateStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { milestone_id: string; title: string; target_date?: string | null }) => createStep(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useToggleStepCompleted() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) => toggleStepCompleted(id, isCompleted),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}

export function useDeleteStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStep(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goal"] }),
  })
}
