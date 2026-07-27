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

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    p1: 'P1 - Mendesak',
    p2: 'P2 - Tinggi',
    p3: 'P3 - Sedang',
    p4: 'P4 - Rendah',
  }
  return labels[priority] || priority
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    p1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    p2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    p3: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    p4: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  }
  return colors[priority] || colors.p3
}

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

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    proses: 'Proses',
    belum: 'Belum',
    selesai: 'Selesai',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    proses: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    belum: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    selesai: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }
  return colors[status] || colors.belum
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getEstimasiText(menit: number): string {
  if (menit >= 60) {
    const jam = Math.floor(menit / 60)
    const sisa = menit % 60
    return sisa > 0 ? `${jam}j ${sisa}m` : `${jam}j`
  }
  return `${menit}m`
}

export function isOverdue(deadline: string | null, status: string): boolean {
  if (!deadline || status === 'selesai') return false
  return new Date(deadline) < new Date()
}
