-- ============================================================
-- Quran table: drop unused columns, rename catatan → status
-- ============================================================

-- 1. Migrate data: 'Sudah baca' → 'sudah', 'Tidak membaca: X' → 'tidak_baca: X'
UPDATE public.quran
SET catatan = 'sudah'
WHERE catatan = 'Sudah baca';

UPDATE public.quran
SET catatan = 'tidak_baca: ' || TRIM(SUBSTRING(catatan FROM 15))
WHERE catatan LIKE 'Tidak membaca:%';

-- 2. Rename catatan → status
ALTER TABLE public.quran RENAME COLUMN catatan TO status;

-- 3. Drop unused columns
ALTER TABLE public.quran DROP COLUMN IF EXISTS surat;
ALTER TABLE public.quran DROP COLUMN IF EXISTS juz;
ALTER TABLE public.quran DROP COLUMN IF EXISTS halaman_mulai;
ALTER TABLE public.quran DROP COLUMN IF EXISTS halaman_selesai;
ALTER TABLE public.quran DROP COLUMN IF EXISTS jumlah_halaman;
