-- RPC: hitung badge sidebar (hari_ini / semua / selesai) dalam 1 query ringan.
-- Menggantikan fetch useTasks(undefined) 1000-row yang tadinya jalan di layout (Sidebar).
CREATE OR REPLACE FUNCTION public.get_task_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT jsonb_build_object(
  'hari_ini', (SELECT COUNT(*) FROM tugas WHERE user_id = auth.uid() AND tanggal = CURRENT_DATE AND status <> 'selesai'),
  'semua',    (SELECT COUNT(*) FROM tugas WHERE user_id = auth.uid() AND status = 'belum' AND tanggal <> CURRENT_DATE),
  'selesai',  (SELECT COUNT(*) FROM tugas WHERE user_id = auth.uid() AND status = 'selesai')
)
$$;

GRANT EXECUTE ON FUNCTION public.get_task_counts() TO authenticated;
