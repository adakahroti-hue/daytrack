-- RPC: hitung jumlah task terlambat untuk chip filter "Terlambat" di Header.
-- Terlambat = tanggal < hari ini DAN status <> 'selesai' (sama persis dengan logic di client).
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
    AND status <> 'selesai'
$$;

GRANT EXECUTE ON FUNCTION public.get_overdue_count() TO authenticated;
