-- ============================================
-- ADD QUALITY COLUMNS TO prayer_logs TABLE
-- ============================================

ALTER TABLE public.prayer_logs
  ADD COLUMN IF NOT EXISTS kualitas_subuh SMALLINT DEFAULT NULL CHECK (kualitas_subuh IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS kualitas_dzuhur SMALLINT DEFAULT NULL CHECK (kualitas_dzuhur IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS kualitas_ashar SMALLINT DEFAULT NULL CHECK (kualitas_ashar IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS kualitas_maghrib SMALLINT DEFAULT NULL CHECK (kualitas_maghrib IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS kualitas_isya SMALLINT DEFAULT NULL CHECK (kualitas_isya IN (1, 2, 3));

-- Realtime: prayer_logs sudah di publikasi, kolom baru otomatis ikut
-- (Supabase realtime mendukung perubahan skema secara otomatis)
