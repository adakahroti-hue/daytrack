import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  getPrayerLog, 
  getPrayerLogRange, 
  upsertPrayerLog,
  togglePrayer 
} from "@/app/actions/prayer-logs"
import type { PrayerLogFormData } from "@/app/actions/prayer-logs"
export function usePrayerLog(tanggal: string) {
  return useQuery({
    queryKey: ["prayer_logs", tanggal],
    queryFn: () => getPrayerLog(tanggal),
    enabled: !!tanggal,
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
  })
}
