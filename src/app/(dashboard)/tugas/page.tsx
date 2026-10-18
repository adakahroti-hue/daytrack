import { redirect } from 'next/navigation'

// Tab "Hari Ini" & "Semua" sudah dihapus (permintaan Aldy) — /tugas kini
// mengarah ke tab Prioritas sebagai satu-satunya tab tugas.
export default function TugasPage() {
  redirect('/tugas/prioritas')
}