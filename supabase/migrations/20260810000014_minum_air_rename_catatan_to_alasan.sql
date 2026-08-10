-- ============================================================
-- minum_air table: rename catatan → alasan, clean data
-- ============================================================

-- 1. Clean data: strip 'Tidak minum: ' prefix
UPDATE public.minum_air
SET catatan = TRIM(SUBSTRING(catatan FROM 14))
WHERE catatan LIKE 'Tidak minum: %';

-- 2. Rename catatan → alasan
ALTER TABLE public.minum_air RENAME COLUMN catatan TO alasan;
