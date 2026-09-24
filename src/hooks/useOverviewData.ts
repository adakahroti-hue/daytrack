"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

// ─── Tipe row per bagian data RPC get_overview_data ───
// Interface ini mencakup semua field yang diakses oleh konsumen
// (RoutineTodaySection). Data RPC dari Supabase tanpa generated types,
// sehingga hasil rpc di-cast ke OverviewData sekali di fetchOverviewData.

/** Row sholat wajib — kolom boolean per waktu sholat (sholat_subuh, dst). */
export interface OverviewSholatRow {
  [key: `sholat_${string}`]: unknown
}

/** Row sholat sunnah — sholat_dhuha, sholat_tahajud (pakai index template di atas). */
export type OverviewSunnahRow = OverviewSholatRow

/** Row baca Quran — sesi & status. */
export interface OverviewQuranRow {
  waktu_baca: string
  status: string | null
}

/** Row minum air — jumlah ml + sesi minum. */
export interface OverviewWaterRow {
  jumlah_ml: number
  waktu_minum: string
  status: string | null
}

/** Row checklist harian (syukur, doa, sedekah, pmo, pmo_all). */
export interface OverviewStatusRow {
  status: string | null
  tanggal: string
  created_at?: string | null
}

/** Row tidur — status tepat/terlambat + jam & durasi. */
export interface OverviewTidurRow {
  status: string | null
  tanggal: string
  jam_tidur?: string | null
  jam_bangun?: string | null
  durasi_jam?: number | null
  created_at?: string | null
}

/** Row arus kas (all-time) — kategori, nominal, dompet. */
export interface OverviewArusKasRow {
  kategori: string
  nominal: number
  dompet: string | null
}

/** Row masalah/refleksi — id, teks, waktu dibuat. */
export interface OverviewMasalahRow {
  id: string | number
  masalah: string | null
  created_at: string | null
}

export interface OverviewData {
  prayer: OverviewSholatRow[]
  quran: OverviewQuranRow[]
  sunnah: OverviewSunnahRow[]
  water: OverviewWaterRow[]
  syukur: OverviewStatusRow[]
  doa: OverviewStatusRow[]
  sedekah: OverviewStatusRow[]
  pmo: OverviewStatusRow[]
  pmo_all: OverviewStatusRow[]
  tidur: OverviewTidurRow[]
  arus_kas: OverviewArusKasRow[]
  masalah: OverviewMasalahRow[]
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
