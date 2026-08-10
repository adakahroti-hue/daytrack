-- Drop unused columns from syukur table
-- isi_syukur, kategori, catatan — tidak pernah ditampilkan di UI

ALTER TABLE public.syukur DROP COLUMN IF EXISTS isi_syukur;
ALTER TABLE public.syukur DROP COLUMN IF EXISTS kategori;
ALTER TABLE public.syukur DROP COLUMN IF EXISTS catatan;
