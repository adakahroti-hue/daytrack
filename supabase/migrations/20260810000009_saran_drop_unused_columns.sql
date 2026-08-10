-- Drop unused keterangan and status columns from saran_perbaikan
-- keterangan: written but never displayed in UI
-- status: written but never displayed in UI

ALTER TABLE public.saran_perbaikan DROP COLUMN IF EXISTS keterangan;
ALTER TABLE public.saran_perbaikan DROP COLUMN IF EXISTS status;
