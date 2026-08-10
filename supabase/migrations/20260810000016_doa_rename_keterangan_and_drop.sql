-- ============================================================
-- doa table: clean data, rename keterangan→alasan, drop untuk_siapa
-- ============================================================

-- 1. Clean data: strip 'Tidak doa: ' prefix
UPDATE public.doa
SET keterangan = TRIM(SUBSTRING(keterangan FROM 11))
WHERE keterangan LIKE 'Tidak doa: %';

-- 2. Rename keterangan → alasan
ALTER TABLE public.doa RENAME COLUMN keterangan TO alasan;

-- 3. Drop unused column
ALTER TABLE public.doa DROP COLUMN IF EXISTS untuk_siapa;
