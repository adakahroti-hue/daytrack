-- ============================================
-- ADD terlewat_tanggal TO tasks
-- Mencatat tanggal asli tugas yang terlewat lalu
-- dijadwalkan ulang otomatis ke hari ini.
-- ============================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS terlewat_tanggal DATE DEFAULT NULL;
