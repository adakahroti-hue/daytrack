// Jadwal jam bangun — dipakai di halaman Tidur (revisi Aldy)
export const JAM_BANGUN_OPTIONS = [
  { value: '03:30', label: '03.30' },
  { value: '04:30', label: '04.30' },
  { value: '05:00', label: '05.00' },
  { value: '05:30', label: '05.30' },
  { value: '06:00', label: '06.00' },
  { value: '07:00', label: '07.00' },
  { value: '08:00', label: '08.00' },
  { value: '09:00', label: '09.00' },
]

// Jadwal jam tidur — dipakai di halaman Tidur & card Kesehatan di Overview (batch 24)
// Satu sumber kebenaran agar jadwal tidak divergen antar halaman.
export const JAM_TIDUR_OPTIONS = [
  { value: '22:00', label: '22.00', status: 'tepat' as const },
  { value: '23:00', label: '23.00', status: 'tepat' as const },
  { value: '23:30', label: '23.30', status: 'begadang' as const },
  { value: '00:00', label: '00.00', status: 'begadang' as const },
  { value: '00:30', label: '00.30', status: 'begadang' as const },
  { value: '01:00', label: '01.00', status: 'begadang' as const },
  { value: '01:30', label: '01.30', status: 'begadang' as const },
]
