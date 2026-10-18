-- ============================================================
-- HAPUS database tab Semua & Hari Ini: tabel `tugas` (opsi 1 Aldy)
--
-- PREREQUISITE (sudah dilakukan di kode, commit ini):
--   1. Tab Hari Ini & Semua dihapus dari router + sidebar.
--   2. Semua fungsi umum (create/update/delete/toggle/pause/reorder/
--      reschedule) di app/actions/tasks.ts sudah DIALIHKAN membaca
--      tabel `tugas_prioritas`.
--   3. Badge sidebar tidak lagi memanggil RPC get_task_counts.
--
-- EFEK PERMANEN:
--   • Seluruh riwayat tugas LAMA di tabel `tugas` HILANG
--     (yang tidak pernah dipindah ke tugas_prioritas).
--   • Card Overview sudah tidak membaca tabel ini sejak awal (mati).
--
-- CARA PAKAI: jalankan di Supabase → SQL Editor.
-- ============================================================

BEGIN;

-- 1. Fungsi RPC yang membaca tabel tugas — hentikan dulu agar DROP tidak gagal
DROP FUNCTION IF EXISTS public.get_task_counts();
DROP FUNCTION IF EXISTS public.get_overdue_count();

-- 2. Tabel inti tab Semua / Hari Ini
DROP TABLE IF EXISTS public.tugas CASCADE;

-- 3. Catatan di RPC yang sudah dipertahankan (berjalan di tugas_prioritas)
CREATE OR REPLACE FUNCTION public.get_task_counts()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
SELECT jsonb_build_object(
  'primer',    (SELECT COUNT(*) FROM tugas_prioritas WHERE user_id = auth.uid() AND jenjang = 'primer'  AND status = 'belum'),
  'sekunder',  (SELECT COUNT(*) FROM tugas_prioritas WHERE user_id = auth.uid() AND jenjang = 'sekunder' AND status = 'belum'),
  'selesai',   (SELECT COUNT(*) FROM tugas_prioritas WHERE user_id = auth.uid() AND status = 'selesai')
)
$$;
GRANT EXECUTE ON FUNCTION public.get_task_counts() TO authenticated;

COMMENT ON FUNCTION public.get_task_counts IS
  'Badge sidebar — kini menghitung dari tugas_prioritas (tabel tugas sudah dihapus).';

COMMIT;

-- Verifikasi cepat (opsional):
--   SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tugas'; -- harus 0