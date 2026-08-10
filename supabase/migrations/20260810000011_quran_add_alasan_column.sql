-- ============================================================
-- Quran table: add 'alasan' column, split from 'status'
-- ============================================================

-- 1. Add alasan column
ALTER TABLE public.quran ADD COLUMN IF NOT EXISTS alasan TEXT;

-- 2. Split data: 'tidak_baca: X' → status='tidak_baca', alasan='X'
--    'Tidak membaca: X' (legacy) → status='tidak_baca', alasan='X'
UPDATE public.quran
SET alasan = TRIM(SUBSTRING(status FROM 12)),
    status = 'tidak_baca'
WHERE status LIKE 'tidak_baca:%';

UPDATE public.quran
SET alasan = TRIM(SUBSTRING(status FROM 15)),
    status = 'tidak_baca'
WHERE status LIKE 'Tidak membaca:%';

-- 3. Normalize legacy 'Sudah baca' → 'sudah'
UPDATE public.quran
SET status = 'sudah'
WHERE status = 'Sudah baca';
