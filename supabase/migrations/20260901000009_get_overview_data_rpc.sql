-- RPC: ambil semua data overview dalam 1 query (menggantikan ~12 query paralel per buka Overview)
-- NAMA TABEL disesuaikan dengan skema DB aktual:
--   prayer_logs -> sholat_wajib | minum_air_logs -> minum_air | quran_logs -> quran | masalah_logs -> refleksi
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
  'syukur',  (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM syukur t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'doa',     (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM doa t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'sedekah', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM sedekah t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'pmo',     (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM pmo t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'pmo_all', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM pmo t WHERE t.user_id = auth.uid()),
  'tidur',   (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM tidur t WHERE t.user_id = auth.uid() AND t.tanggal >= p_start AND t.tanggal <= p_end),
  'arus_kas',(SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM arus_kas t WHERE t.user_id = auth.uid()),
  'masalah', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM refleksi t WHERE t.user_id = auth.uid())
)
$$;

GRANT EXECUTE ON FUNCTION public.get_overview_data(date, date) TO authenticated;
