"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export interface OverviewData {
  prayer: any[]
  quran: any[]
  sunnah: any[]
  water: any[]
  syukur: any[]
  doa: any[]
  sedekah: any[]
  pmo: any[]
  pmo_all: any[]
  tidur: any[]
  arus_kas: any[]
  masalah: any[]
}

async function fetchOverviewData(start: string, end: string): Promise<OverviewData> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("get_overview_data", {
    p_start: start,
    p_end: end,
  })
  if (error) throw new Error(error.message)
  return (data as OverviewData) || {
    prayer: [], quran: [], sunnah: [], water: [], syukur: [],
    doa: [], sedekah: [], pmo: [], pmo_all: [], tidur: [], arus_kas: [], masalah: [],
  }
}

export function useOverviewData(start: string, end: string) {
  return useQuery({
    queryKey: ["overview", "data", start, end],
    queryFn: () => fetchOverviewData(start, end),
    enabled: !!start && !!end,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    gcTime: 5 * 60 * 1000,
  })
}
