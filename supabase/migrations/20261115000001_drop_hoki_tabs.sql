-- ============================================================
-- DayTrack — HAPUS TAB: Doa, Syukur (Bersyukur), Sedekah + datanya
-- Jalankan di: Supabase Dashboard → SQL Editor → New query → RUN SEKALI
--
-- Urutan AMAN (WAJIB urut seperti ini):
--   1) RPC get_overview_data di-RECREATE dulu TANPA 3 field itu
--      (kalau tabel di-drop duluan, tab Overview bisa error total)
--   2) Baru tabelnya dihapus
-- ============================================================

-- ===== 1) RPC Overview tanpa syukur / doa / sedekah =====
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
  'arus_kas',(SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM arus_kas t WHERE t.user_id = auth.uid()),
  'masalah', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM refleksi t WHERE t.user_id = auth.uid())
)
$$;

GRANT EXECUTE ON FUNCTION public.get_overview_data(date, date) TO authenticated;

-- ===== 2) Hapus tabel tab Doa / Syukur / Sedekah =====
-- (termasuk kemungkinan tabel lama doa_logs/syukur_logs — aman pakai IF EXISTS)
DROP TABLE IF EXISTS public.doa CASCADE;
DROP TABLE IF EXISTS public.syukur CASCADE;
DROP TABLE IF EXISTS public.sedekah CASCADE;
DROP TABLE IF EXISTS public.doa_logs CASCADE;
DROP TABLE IF EXISTS public.syukur_logs CASCADE;

-- Selesai. Cek cepat (opsional, harus keluar kosong):
-- select table_name from information_schema.tables
--  where table_schema='public' and table_name in ('doa','syukur','sedekah','doa_logs','syukur_logs');
