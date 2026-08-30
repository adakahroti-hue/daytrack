// Opsi jam makan (setiap 30 menit, 04:00 - 23:30)
export interface TimeOption {
  value: string
  label: string
}

function buildOptions(startHour: number, endHour: number): TimeOption[] {
  const opts: TimeOption[] = []
  for (let h = startHour; h <= endHour; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      opts.push({ value: `${hh}:${mm}:00`, label: `${hh}:${mm}` })
    }
  }
  return opts
}

export const MAKAN_TIME_OPTIONS: TimeOption[] = buildOptions(4, 23)
