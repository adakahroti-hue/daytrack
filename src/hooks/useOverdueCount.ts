"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

async function fetchOverdueCount(): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("get_overdue_count")
  if (error) throw new Error(error.message)
  return (data as number) ?? 0
}

export function useOverdueCount() {
  return useQuery({
    queryKey: ["overdue-count"],
    queryFn: fetchOverdueCount,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    gcTime: 5 * 60 * 1000,
  })
}
