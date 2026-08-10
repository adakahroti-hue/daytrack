-- ============================================================
-- PMO table: rename catatan → alasan, clean data
-- ============================================================

-- 1. Clean data: strip 'Relapse: ' prefix
UPDATE public.pmo
SET catatan = TRIM(SUBSTRING(catatan FROM 9))
WHERE catatan LIKE 'Relapse: %';

-- 2. Rename catatan → alasan
ALTER TABLE public.pmo RENAME COLUMN catatan TO alasan;
