import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
export { useQueryClient }
import { 
  getPrayerLog,
  upsertPrayerLog,
  togglePrayer,
  updatePrayerQuality
} from "@/app/actions/prayer-logs"
import type { PrayerLogFormData } from "@/app/actions/prayer-logs"
export function usePrayerLog(tanggal: string) {
  return useQuery({
    queryKey: ["sholat", tanggal],
    queryFn: () => getPrayerLog(tanggal),
    enabled: !!tanggal,
    staleTime: 30_000, // 30 detik — tidak fetch ulang kalau data masih fresh
  })
}
// Baca langsung browser -> Supabase: satu round-trip, tanpa overhead server action
// (getUser + serialisasi action) — mempercepat first load tab sholat.
// getSession() membaca sesi lokal (tanpa network); user_id tetap difilter eksplisit.
async function fetchPrayerLogRangeDirect(startDate: string, endDate: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("sholat")
    .select("*")
    .eq("user_id", session.user.id)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export function usePrayerLogRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["sholat", "range", startDate, endDate],
    queryFn: () => fetchPrayerLogRangeDirect(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    gcTime: 5 * 60 * 1000,
  })
}
export function useUpsertPrayerLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: PrayerLogFormData) => upsertPrayerLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sholat"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
    onError: (error) => {
      console.error("Failed to upsert prayer log:", error)
    },
  })
}
export function useTogglePrayer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ tanggal, prayerTime, value, reason }: { 
      tanggal: string; 
      prayerTime: "subuh" | "dhuha" | "dzuhur" | "ashar" | "maghrib" | "isya"; 
      value: boolean; 
      reason?: string 
    }) => togglePrayer(tanggal, prayerTime, value, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sholat"] })
      queryClient.invalidateQueries({ queryKey: ["overview"] })
    },
    onError: (error) => {
      console.error("Failed to toggle prayer:", error)
    },
  })
}
export function useUpdatePrayerQuality() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tanggal, prayerTime, quality }: {
      tanggal: string;
      prayerTime: "subuh" | "dhuha" | "dzuhur" | "ashar" | "maghrib" | "isya";
      quality: number;
    }) => updatePrayerQuality(tanggal, prayerTime, quality),
    onSuccess: (data, variables) => {
      // Optimistically update the cache so the UI responds instantly
      queryClient.setQueryData(["sholat", variables.tanggal], (old: any) => {
        if (!old) return old
        return {
          ...old,
          [`kualitas_${variables.prayerTime}`]: variables.quality,
        }
      })
      queryClient.invalidateQueries({ queryKey: ["sholat"] })
    },
    onError: (error) => {
      console.error("Failed to update prayer quality:", error)
    },
  })
}
