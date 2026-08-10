import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, locale: string = 'id-ID'): string {
  return new Date(date).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateShort(date: Date | string, locale: string = 'id-ID'): string {
  return new Date(date).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function getDayName(date: Date | string): string {
  return new Date(date).toLocaleDateString('id-ID', { weekday: 'long' })
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function getMonthName(month: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  return months[month]
}

// ============================================
// NEW COLOR SYSTEM - Navy as primary brand
// ============================================

// Navy/Dark Blue - Primary Brand Color
export const BRAND_COLORS = {
  primary: 'bg-[#0F172A] text-white',           // Navy 900
  primaryHover: 'hover:bg-[#1E293B]',           // Navy 800
  primaryLight: 'bg-[#1E293B] text-white',      // Navy 800
  primaryOutline: 'border-[#0F172A] text-[#0F172A] dark:border-[#1E293B] dark:text-[#E2E8F0]',
  primarySoft: 'bg-[#0F172A]/10 text-[#0F172A] dark:bg-[#1E293B]/30 dark:text-[#E2E8F0]',
  primaryRing: 'focus-visible:ring-[#0F172A]/50',
}

// Status Colors - ONLY for status elements
export const STATUS_COLORS = {
  belum: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    ring: 'focus-visible:ring-slate-400/50',
    soft: 'bg-slate-50 dark:bg-slate-900/50',
  },
  proses: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    ring: 'focus-visible:ring-amber-400/50',
    soft: 'bg-amber-50 dark:bg-amber-900/20',
  },
  selesai: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    ring: 'focus-visible:ring-green-400/50',
    soft: 'bg-green-50 dark:bg-green-900/20',
  },
  terlambat: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    ring: 'focus-visible:ring-red-400/50',
    soft: 'bg-red-50 dark:bg-red-900/20',
  },
}

// Priority Colors - Soft tones for badges
export const PRIORITY_COLORS = {
  p1: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
  },
  p2: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  p3: {
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    icon: 'text-sky-600 dark:text-sky-400',
  },
  p4: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
  },
}

// Neutral card border
export const CARD_BORDER = 'border-[#E5E7EB] dark:border-[#374151]'
export const CARD_BORDER_HOVER = 'hover:border-[#D1D5DB] dark:hover:border-[#4B5563]'

// ============================================
// Status helpers
// ============================================
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    proses: 'Proses',
    belum: 'Belum',
    selesai: 'Selesai',
  }
  return labels[status] || status
}

export function getStatusShortLabel(status: string): string {
  const labels: Record<string, string> = {
    proses: 'Proses',
    belum: 'Belum',
    selesai: 'Selesai',
  }
  return labels[status] || status
}

// Status color for badges (uses STATUS_COLORS)
export function getStatusColor(status: string): string {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.belum
  return `${colors.bg} ${colors.text} ${colors.border}`
}

// Status color for outline badges
export function getStatusOutlineColor(status: string): string {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.belum
  return `${colors.text} ${colors.border} hover:${colors.soft} hover:${colors.text}`
}

// ============================================
// Priority helpers
// ============================================
export function getMissionPriorityIcon(priority: string): string {
  const icons: Record<string, string> = {
    p1: '🔥',
    p2: '⚡',
    p3: '📌',
    p4: '🌱',
  }
  return icons[priority] || icons.p3
}

export function getMissionGroupName(priority: string): string {
  const names: Record<string, string> = {
    p1: 'Misi Mendesak',
    p2: 'Misi Penting',
    p3: 'Misi Harian',
    p4: 'Misi Ringan',
  }
  return names[priority] || names.p3
}

export function getMissionPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    p1: 'P1 – Mendesak',
    p2: 'P2 – Tinggi',
    p3: 'P3 – Sedang',
    p4: 'P4 – Rendah',
  }
  return labels[priority] || labels.p3
}

export function getMissionPriorityShortLabel(priority: string): string {
  const labels: Record<string, string> = {
    p1: 'P1',
    p2: 'P2',
    p3: 'P3',
    p4: 'P4',
  }
  return labels[priority] || labels.p3
}

// Priority color for badges (uses PRIORITY_COLORS)
export function getMissionPriorityColor(priority: string): string {
  const colors = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.p3
  return `${colors.bg} ${colors.text} ${colors.border}`
}

// Priority border for cards (subtle left border)
export function getMissionPriorityBorder(priority: string): string {
  const borders: Record<string, string> = {
    p1: 'border-l-3 border-red-400 dark:border-l-red-500',
    p2: 'border-l-3 border-amber-400 dark:border-l-amber-500',
    p3: 'border-l-3 border-sky-400 dark:border-l-sky-500',
    p4: 'border-l-3 border-green-400 dark:border-l-green-500',
  }
  return borders[priority] || borders.p3
}

export function getMissionGroupDescription(priority: string): string {
  const descriptions: Record<string, string> = {
    p1: 'Prioritas Mendesak',
    p2: 'Prioritas Tinggi',
    p3: 'Prioritas Sedang',
    p4: 'Prioritas Rendah',
  }
  return descriptions[priority] || descriptions.p3
}

export function getMissionGroupDescriptionWithCount(priority: string, count: number): string {
  return `${getMissionGroupDescription(priority)} • ${count} tugas`
}

// ============================================
// Card styles (shared)
// ============================================
export const CARD_BASE = `${CARD_BORDER} ${CARD_BORDER_HOVER} rounded-xl transition-colors duration-200`
export const CARD_HOVER = 'hover:shadow-sm hover:-translate-y-0.5'

// Stats card icon containers
export const STAT_ICON_CONTAINERS = {
  total: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  inProgress: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
}

// ============================================
// Utility helpers
// ============================================
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getEstimasiText(menit: number): string {
  if (menit >= 1440) {
    const hari = Math.floor(menit / 1440)
    const sisaMenit = menit % 1440
    const jam = Math.floor(sisaMenit / 60)
    const sisa = sisaMenit % 60
    if (jam > 0 && sisa > 0) return `${hari} hari ${jam} jam ${sisa} menit`
    if (jam > 0) return `${hari} hari ${jam} jam`
    if (sisa > 0) return `${hari} hari ${sisa} menit`
    return `${hari} hari`
  }
  if (menit >= 60) {
    const jam = Math.floor(menit / 60)
    const sisa = menit % 60
    if (sisa > 0) {
      return `${jam} jam ${sisa} menit`
    }
    return `${jam} jam`
  }
  return `${menit} menit`
}

export function isOverdue(deadline: string | null, status: string): boolean {
  if (!deadline || status === 'selesai') return false
  return new Date(deadline) < new Date()
}

// ============================================
// Time tracking helpers
// ============================================

/**
 * Hitung durasi real (menit) dari started_at ke completed_at
 */
export function getActualDurationMinutes(startedAt: string | null, completedAt: string | null): number {
  if (!startedAt || !completedAt) return 0
  const start = new Date(startedAt).getTime()
  const end = new Date(completedAt).getTime()
  const diffMs = end - start
  if (diffMs <= 0) return 0
  return Math.round(diffMs / 60000) // convert to minutes
}

/**
 * Format durasi real jadi text (sama style getEstimasiText)
 */
export function getActualDurationText(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return 'Belum ada data'
  const menit = getActualDurationMinutes(startedAt, completedAt)
  if (menit === 0) return '< 1 menit'
  return getEstimasiText(menit)
}

/**
 * Bandingin estimasi vs real
 * Return: { selisihMenit, selisihText, status: 'lebih-cepat' | 'lebih-lama' | 'pas' }
 */
export function compareEstimasiVsActual(estimasiMenit: number, startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return { selisihMenit: 0, selisihText: '-', status: 'unknown' as const }
  const actual = getActualDurationMinutes(startedAt, completedAt)
  
  const selisih = actual - estimasiMenit
  const absSelisih = Math.abs(selisih)
  
  let status: 'lebih-cepat' | 'lebih-lama' | 'pas' = 'pas'
  if (selisih < 0) status = 'lebih-cepat'
  else if (selisih > 0) status = 'lebih-lama'
  
  const selisihText = getEstimasiText(absSelisih)
  
  return { selisihMenit: selisih, selisihText, status }
}

/**
 * Hitung live duration (menit) dari started_at sampai sekarang
 * Untuk tugas yang status 'proses'
 */
export function getLiveDurationMinutes(startedAt: string | null): number {
  if (!startedAt) return 0
  const start = new Date(startedAt).getTime()
  const now = Date.now()
  const diffMs = now - start
  if (diffMs <= 0) return 0
  return Math.round(diffMs / 60000)
}

export function getLiveDurationText(startedAt: string | null): string {
  const menit = getLiveDurationMinutes(startedAt)
  if (menit === 0) return '< 1 menit'
  return getEstimasiText(menit)
}

/** Hitung detik aktif (exclude waktu pause) untuk tugas yang sedang proses. */
export function getTaskActiveSeconds(task: {
  accumulated_seconds?: number | null
  is_paused?: boolean | null
  last_resumed_at?: string | null
}): number {
  const base = task.accumulated_seconds || 0
  if (task.is_paused || !task.last_resumed_at) return base
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(task.last_resumed_at).getTime()) / 1000))
  return base + elapsed
}

/** Text durasi aktif berjalan (support pause) — dipakai di kartu tugas proses */
export function getTaskLiveDurationText(task: {
  accumulated_seconds?: number | null
  is_paused?: boolean | null
  last_resumed_at?: string | null
}): string {
  const seconds = getTaskActiveSeconds(task)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h} jam ${m} menit ${s} detik`
  if (m > 0) return `${m} menit ${s} detik`
  return `${s} detik`
}

/** Durasi real (menit) tugas selesai, memakai accumulated_seconds bila ada (exclude pause) */
export function getTaskActualDurationMinutes(task: {
  accumulated_seconds?: number | null
  started_at?: string | null
  completed_at?: string | null
}): number {
  if (task.accumulated_seconds && task.accumulated_seconds > 0) {
    return Math.max(1, Math.round(task.accumulated_seconds / 60))
  }
  if (task.started_at && task.completed_at) {
    return getActualDurationMinutes(task.started_at, task.completed_at)
  }
  return 0
}

/** Text durasi real (support pause) untuk tugas selesai */
export function getTaskActualDurationText(task: {
  accumulated_seconds?: number | null
  started_at?: string | null
  completed_at?: string | null
}): string {
  const menit = getTaskActualDurationMinutes(task)
  if (menit === 0) return '< 1 menit'
  return getEstimasiText(menit)
}

/** Bandingkan estimasi vs durasi real (support pause) */
export function compareTaskEstimasiVsActual(task: {
  estimasi_menit: number
  accumulated_seconds?: number | null
  started_at?: string | null
  completed_at?: string | null
}) {
  if (!task.started_at || !task.completed_at) return { selisihMenit: 0, selisihText: '-', status: 'unknown' as const }
  const actual = getTaskActualDurationMinutes(task)
  const selisih = actual - task.estimasi_menit
  const absSelisih = Math.abs(selisih)
  let status: 'lebih-cepat' | 'lebih-lama' | 'pas' = 'pas'
  if (selisih < 0) status = 'lebih-cepat'
  else if (selisih > 0) status = 'lebih-lama'
  return { selisihMenit: selisih, selisihText: getEstimasiText(absSelisih), status }
}

// ============================================
// Legacy exports for backward compatibility
// ============================================
export function getAspectLabel(aspect: string): string {
  const labels: Record<string, string> = {
    psikis: 'Psikis',
    produktivitas: 'Produktivitas',
    keuangan: 'Keuangan',
    hubungan: 'Hubungan',
  }
  return labels[aspect] || aspect
}

export function getAspectColor(aspect: string): string {
  const colors: Record<string, string> = {
    psikis: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    produktivitas: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    keuangan: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    hubungan: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  }
  return colors[aspect] || colors.produktivitas
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    p1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    p2: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    p3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    p4: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }
  return colors[priority] || colors.p3
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    p1: 'P1 - Mendesak',
    p2: 'P2 - Tinggi',
    p3: 'P3 - Sedang',
    p4: 'P4 - Rendah',
  }
  return labels[priority] || priority
}

// For backward compatibility - alias
export function getMissionStatusColor(status: string): string {
  return getStatusColor(status)
}