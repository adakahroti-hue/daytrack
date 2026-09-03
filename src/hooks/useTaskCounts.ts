"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export interface TaskCounts {
  hari_ini: number
  semua: number
  selesai: number
}

async function fetchTaskCounts(): Promise<TaskCounts> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("get_task_counts")
  if (error) throw new Error(error.message)
  return (data as TaskCounts) || { hari_ini: 0, semua: 0, selesai: 0 }
}

export function useTaskCounts() {
  return useQuery({
    queryKey: ["task-counts"],
    queryFn: fetchTaskCounts,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    gcTime: 5 * 60 * 1000,
  })
}
