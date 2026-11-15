-- ============================================================
-- DayTrack — HAPUS TAB Arus Kas + database-nya
-- Jalankan di: Supabase Dashboard → SQL Editor → New query → RUN SEKALI
--
-- Urutan AMAN (WAJIB seperti ini):
--   1) RPC get_overview_data di-RECREATE dulu TANPA field arus_kas
--      (kalau tabel di-drop duluan, tab Overview bisa error total)
--   2) Baru tabelnya dihapus
-- ============================================================

-- ===== 1) RPC Overview tanpa arus_kas =====
CREATE OR REPLACE FUNCTION public.get_overview_data(p_start date, p_end date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT jsonb_build_object(
  'prayer',  (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM sholat_wajib t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'quran',   (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM quran t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'sunnah',  (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM sholat_sunnah t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'water',   (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM minum_air t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'pmo',     (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM pmo t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'pmo_all', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM pmo t WHERE t.user_id = auth.uid()),
  'tidur',   (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM tidur t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'masalah', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM refleksi t WHERE t.user_id = auth.uid())
)
$$;

GRANT EXECUTE ON FUNCTION public.get_overview_data(date, date) TO authenticated;

-- ===== 2) Hapus tabel Arus Kas (index/trigger/RLS ikut terhapus) =====
DROP TABLE IF EXISTS public.arus_kas CASCADE;

-- Cek cepat (opsional — harus keluar kosong):
-- select table_name from information_schema.tables
--  where table_schema='public' and table_name='arus_kas';
