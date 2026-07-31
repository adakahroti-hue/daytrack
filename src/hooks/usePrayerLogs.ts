import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
export { useQueryClient }
import { 
  getPrayerLog,
  getPrayerLogRange,
  upsertPrayerLog,
  togglePrayer,
  updatePrayerQuality
} from "@/app/actions/prayer-logs"
import type { PrayerLogFormData } from "@/app/actions/prayer-logs"
export function usePrayerLog(tanggal: string) {
  return useQuery({
    queryKey: ["prayer_logs", tanggal],
    queryFn: () => getPrayerLog(tanggal),
    enabled: !!tanggal,
    staleTime: 30_000, // 30 detik — tidak fetch ulang kalau data masih fresh
  })
}
export function usePrayerLogRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["prayer_logs", "range", startDate, endDate],
    queryFn: () => getPrayerLogRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  })
}
export function useUpsertPrayerLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: PrayerLogFormData) => upsertPrayerLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prayer_logs"] })
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
      prayerTime: "subuh" | "dzuhur" | "ashar" | "maghrib" | "isya"; 
      value: boolean; 
      reason?: string 
    }) => togglePrayer(tanggal, prayerTime, value, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prayer_logs"] })
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
      prayerTime: "subuh" | "dzuhur" | "ashar" | "maghrib" | "isya";
      quality: number;
    }) => updatePrayerQuality(tanggal, prayerTime, quality),
    onSuccess: (data, variables) => {
      // Optimistically update the cache so the UI responds instantly
      queryClient.setQueryData(["prayer_logs", variables.tanggal], (old: any) => {
        if (!old) return old
        return {
          ...old,
          [`kualitas_${variables.prayerTime}`]: variables.quality,
        }
      })
      queryClient.invalidateQueries({ queryKey: ["prayer_logs"] })
    },
    onError: (error) => {
      console.error("Failed to update prayer quality:", error)
    },
  })
}
