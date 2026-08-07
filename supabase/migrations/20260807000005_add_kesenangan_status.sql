-- ============================================================
-- Revisi 6 (batch 5): tabel kesenangan & saran_perbaikan
-- ------------------------------------------------------------
-- Latar belakang: tab Kesenangan lama memakai tabel `fun_queue`
-- dan tab "Saran Perbaikan" lama memakai `improvement_backlog`,
-- sehingga tabel legacy `kesenangan` dan `saran_perbaikan` TIDAK ADA
-- di database (error 42P01: relation "kesenangan" does not exist).
--
-- Migration ini:
--   1) Membuat tabel `kesenangan` bila belum ada (+ kolom status)
--   2) Membuat tabel `saran_perbaikan` bila belum ada
--   3) RLS policy + index + realtime untuk kedua tabel
-- Aman dijalankan berulang (idempotent).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1) TABEL KESENANGAN (tab Kesenangan — Tanggal, Hari, Kesenangan, Status) ──
CREATE TABLE IF NOT EXISTS public.kesenangan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    kesenangan TEXT NOT NULL,
    status TEXT DEFAULT 'belum',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kesenangan_user_date ON public.kesenangan(user_id, tanggal);

ALTER TABLE public.kesenangan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own kesenangan" ON public.kesenangan;
CREATE POLICY "Users can CRUD own kesenangan" ON public.kesenangan
    FOR ALL USING (auth.uid() = user_id);

-- aman bila tabel sudah ada tanpa kolom status
ALTER TABLE public.kesenangan ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'belum';

-- ── 2) TABEL SARAN_PERBAIKAN (tab Masukan Daytrack — Tanggal, Hari, Saran, Tujuan, Status) ──
CREATE TABLE IF NOT EXISTS public.saran_perbaikan (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    saran TEXT NOT NULL,
    keterangan TEXT,
    status TEXT CHECK (status IN ('belum', 'proses', 'selesai')) DEFAULT 'belum',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saran_perbaikan_user_date ON public.saran_perbaikan(user_id, tanggal);

ALTER TABLE public.saran_perbaikan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own saran_perbaikan" ON public.saran_perbaikan;
CREATE POLICY "Users can CRUD own saran_perbaikan" ON public.saran_perbaikan
    FOR ALL USING (auth.uid() = user_id);

-- ── 3) REALTIME — daftarkan ke publikasi supabase_realtime ──
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.kesenangan;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.saran_perbaikan;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
