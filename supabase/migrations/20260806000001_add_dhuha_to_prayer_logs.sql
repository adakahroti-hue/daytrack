-- ============================================
-- ADD DHUHA SUPPORT TO prayer_logs
-- Fixes: halaman Sholat (tabel habit tracker 6 kolom) membaca tabel
-- prayer_logs yang belum punya kolom Dhuha.
-- ============================================

ALTER TABLE public.prayer_logs
  ADD COLUMN IF NOT EXISTS sholat_dhuha BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS alasan_dhuha TEXT CHECK (alasan_dhuha IN ('malas', 'lupa', 'ketiduran', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
  ADD COLUMN IF NOT EXISTS kualitas_dhuha SMALLINT DEFAULT NULL CHECK (kualitas_dhuha IN (1, 2, 3));

-- ============================================
-- BACKFILL: salin data lama dari tabel `sholat` (legacy) ke prayer_logs
-- Hanya untuk tanggal yang belum ada di prayer_logs (tidak menimpa data baru).
-- ============================================

INSERT INTO public.prayer_logs (
  user_id, tanggal, status,
  sholat_subuh, sholat_dhuha, sholat_dzuhur, sholat_ashar, sholat_maghrib, sholat_isya,
  alasan_subuh, alasan_dhuha, alasan_dzuhur, alasan_ashar, alasan_maghrib, alasan_isya
)
SELECT
  s.user_id, s.tanggal,
  CASE WHEN s.subuh AND s.dhuha AND s.dzuhur AND s.ashar AND s.maghrib AND s.isya
       THEN 'sudah' ELSE 'belum' END,
  s.subuh, s.dhuha, s.dzuhur, s.ashar, s.maghrib, s.isya,
  s.alasan_subuh, s.alasan_dhuha, s.alasan_dzuhur, s.alasan_ashar, s.alasan_maghrib, s.alasan_isya
FROM public.sholat s
WHERE NOT EXISTS (
  SELECT 1 FROM public.prayer_logs p
  WHERE p.user_id = s.user_id AND p.tanggal = s.tanggal
);
