-- RPC: ambil semua data overview dalam 1 query (menggantikan ~12 query paralel per buka Overview)
-- Mengembalikan JSON berisi raw rows per tabel (processing tetap di client).
-- p_start/p_end membatasi tabel harian; pmo_all/arus_kas/masalah = all-time.
CREATE OR REPLACE FUNCTION public.get_overview_data(p_start date, p_end date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT jsonb_build_object(
  'prayer',  (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM prayer_logs t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'quran',   (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM quran_logs t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'sunnah',  (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM sholat_sunnah t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'water',   (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM minum_air_logs t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'syukur',  (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM syukur_logs t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'doa',     (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM doa_logs t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'sedekah', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM sedekah_logs t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'pmo',     (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM pmo_logs t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'pmo_all', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM pmo_logs t WHERE t.user_id = auth.uid()),
  'tidur',   (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM tidur_logs t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'arus_kas',(SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM arus_kas t WHERE t.user_id = auth.uid()),
  'masalah', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM masalah_logs t WHERE t.user_id = auth.uid())
)
$$;

GRANT EXECUTE ON FUNCTION public.get_overview_data(date, date) TO authenticated;
