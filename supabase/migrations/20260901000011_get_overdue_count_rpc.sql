-- RPC: hitung jumlah task terlambat untuk chip filter "Terlambat" di Header (tab Semua).
-- Terlambat = tanggal < hari ini DAN status IN ('belum','proses')
--   - tidak menghitung status 'selesai' (sudah selesai)
--   - tidak menghitung status 'ide' (ide belum jadi tugas, tidak tampil di tab Semua)
-- Sesuai dengan filter task yang ditampilkan di tab Semua:
--   (status='belum' OR (status='proses' AND tanggal < hari ini)) AND status <> 'ide' AND tanggal <> hari ini
CREATE OR REPLACE FUNCTION public.get_overdue_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM tugas
  WHERE user_id = auth.uid()
    AND tanggal < CURRENT_DATE
    AND status IN ('belum', 'proses')
$$;

GRANT EXECUTE ON FUNCTION public.get_overdue_count() TO authenticated;
