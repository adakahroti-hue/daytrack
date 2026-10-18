-- ============================================================
-- Tab Prioritas PUNYA DATA SENDIRI: public.tugas_prioritas
-- Terpisah TOTAL dari public.tugas (tab Semua / Hari Ini / Overview).
-- Kolom `jenjang` = 'primer' (kolom kiri) | 'sekunder' (kolom kanan).
-- Selesai ditandai status = 'selesai' (tetap ersimpan, tidak dihapus).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tugas_prioritas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nama TEXT NOT NULL,
  tanggal DATE,
  estimasi_menit INTEGER NOT NULL DEFAULT 0 CHECK (estimasi_menit >= 0),
  prioritas TEXT NOT NULL DEFAULT 'p3' CHECK (prioritas IN ('p1','p2','p3','p4')),
  status TEXT NOT NULL DEFAULT 'belum' CHECK (status IN ('belum','proses','selesai')),
  jenjang TEXT NOT NULL DEFAULT 'primer' CHECK (jenjang IN ('primer','sekunder')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  accumulated_seconds INTEGER DEFAULT 0,
  is_paused BOOLEAN DEFAULT FALSE,
  last_resumed_at TIMESTAMPTZ,
  terlewat_tanggal DATE,
  group_id UUID,
  group_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tugas_prioritas_user_jenjang
  ON public.tugas_prioritas(user_id, jenjang);

-- Batalkan kolom jenjang di tabel tugas (revisi lama, tidak dipakai lagi —
-- tab Semua & Prioritas sekarang memakai tabel terpisah).
ALTER TABLE public.tugas DROP COLUMN IF EXISTS jenjang;

-- RLS: hanya pemilik row yang boleh baca/tulis
ALTER TABLE public.tugas_prioritas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own tugas_prioritas" ON public.tugas_prioritas;
CREATE POLICY "Users can CRUD own tugas_prioritas" ON public.tugas_prioritas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at otomatis (pakai trigger bawaan project)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tugas_prioritas_updated_at'
  ) THEN
    CREATE TRIGGER tugas_prioritas_updated_at
      BEFORE UPDATE ON public.tugas_prioritas
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END
$$;

-- Realtime supaya tab Prioritas ter-update live (best-effort)
DO $$
BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tugas_prioritas';
EXCEPTION WHEN duplicate_object THEN NULL;
           WHEN undefined_object THEN NULL;
END
$$;

COMMENT ON TABLE public.tugas_prioritas IS
  'Tugas tab Prioritas — TERPISAH dari public.tugas (Semua/Hari Ini/Overview).';