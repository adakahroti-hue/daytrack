import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
export { useQueryClient }
import {
  getSholatSunnah,
  upsertSholatSunnah,
  toggleSholatSunnah,
  updateSholatSunnahQuality,
} from "@/app/actions/sholat-sunnah"
import type { SholatSunnahFormData } from "@/app/actions/sholat-sunnah"

export function useSholatSunnah(tanggal: string) {
  return useQuery({
    queryKey: ["sholat_sunnah", tanggal],
    queryFn: () => getSholatSunnah(tanggal),
    enabled: !!tanggal,
    staleTime: 30_000,
  })
}

async function fetchSholatSunnahRangeDirect(startDate: string, endDate: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("sholat_sunnah")
    .select("*")
    .eq("user_id", session.user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export function useSholatSunnahRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["sholat_sunnah", "range", startDate, endDate],
    queryFn: () => fetchSholatSunnahRangeDirect(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    gcTime: 5 * 60 * 1000,
  })
}

export function useUpsertSholatSunnah() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SholatSunnahFormData) => upsertSholatSunnah(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sholat_sunnah"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
    onError: (error) => {
      console.error("Failed to upsert sholat sunnah:", error)
    },
  })
}

export function useToggleSholatSunnah() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tanggal, prayerTime, value, reason }: {
      tanggal: string
      prayerTime: "dhuha" | "tahajud"
      value: boolean
      reason?: string
    }) => toggleSholatSunnah(tanggal, prayerTime, value, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sholat_sunnah"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
    onError: (error) => {
      console.error("Failed to toggle sholat sunnah:", error)
    },
  })
}

export function useUpdateSholatSunnahQuality() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tanggal, prayerTime, quality }: {
      tanggal: string
      prayerTime: "dhuha" | "tahajud"
      quality: number
    }) => updateSholatSunnahQuality(tanggal, prayerTime, quality),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["sholat_sunnah", variables.tanggal], (old: any) => {
        if (!old) return old
        return {
          ...old,
          [`kualitas_${variables.prayerTime}`]: variables.quality,
        }
      })
      queryClient.invalidateQueries({ queryKey: ["sholat_sunnah"] })
    },
    onError: (error) => {
      console.error("Failed to update sholat sunnah quality:", error)
    },
  })
}
