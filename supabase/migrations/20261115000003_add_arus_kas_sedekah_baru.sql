-- ============================================================
-- DayTrack — DUA TAB BARU:
--   1) "Arus Kas"  (kategori Keuangan)  -> pencatatan keuangan
--   2) "Sedekah"   (kategori Ibadah)    -> pencatatan sedekah + benefit
--
-- Nama tabel BARU (bukan arus_kas / sedekah lama) supaya aman
-- walau script drop versi lama belum/belum sempat dijalankan.
-- Jalankan: Supabase Dashboard -> SQL Editor -> New query -> RUN SEKALI
-- ============================================================

-- ===== 1) Arus Kas: no (nomor urut dihitung di UI), jumlah uang, status, alasan =====
CREATE TABLE IF NOT EXISTS public.pencatatan_keuangan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jumlah numeric NOT NULL CHECK (jumlah >= 0),
  status text NOT NULL CHECK (status IN ('masuk','keluar')),
  alasan text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pencatatan_keuangan_user ON public.pencatatan_keuangan(user_id, created_at DESC);
ALTER TABLE public.pencatatan_keuangan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own pencatatan_keuangan" ON public.pencatatan_keuangan;
CREATE POLICY "Users can CRUD own pencatatan_keuangan" ON public.pencatatan_keuangan
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== 2) Sedekah: identitas transaksi, tanggal, jenis, penerima, keterangan, nominal, cerita =====
CREATE TABLE IF NOT EXISTS public.catatan_sedekah (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kode text NOT NULL,                              -- nomor identitas transaksi (otomatis SDK-xxxxxx)
  tanggal_sedekah date NOT NULL DEFAULT CURRENT_DATE,
  jenis text NOT NULL DEFAULT 'rutin'
    CHECK (jenis IN ('subuh','jumat','rutin','spontan','lainnya')),
  penerima text NOT NULL DEFAULT '',               -- nama orang / lembaga / masjid
  keterangan text NOT NULL DEFAULT '',             -- deskripsi / tujuan sedekah
  nominal numeric NOT NULL DEFAULT 0 CHECK (nominal >= 0),
  cerita text NOT NULL DEFAULT '',                 -- cerita / pengalaman detail
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_catatan_sedekah_user ON public.catatan_sedekah(user_id, tanggal_sedekah DESC);
ALTER TABLE public.catatan_sedekah ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own catatan_sedekah" ON public.catatan_sedekah;
CREATE POLICY "Users can CRUD own catatan_sedekah" ON public.catatan_sedekah
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== 3) Benefit Sedekah: SATU transaksi bisa punya BANYAK benefit,
--           masing-masing punya tanggal benefit sendiri =====
CREATE TABLE IF NOT EXISTS public.catatan_sedekah_benefit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sedekah_id uuid NOT NULL REFERENCES public.catatan_sedekah(id) ON DELETE CASCADE,
  benefit text NOT NULL,                           -- manfaat / pengalaman positif
  tanggal_benefit date,                            -- kapan benefit dirasakan
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sedekah_benefit_owner ON public.catatan_sedekah_benefit(sedekah_id);
ALTER TABLE public.catatan_sedekah_benefit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own sedekah benefit" ON public.catatan_sedekah_benefit;
CREATE POLICY "Users can CRUD own sedekah benefit" ON public.catatan_sedekah_benefit
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ===== Trigger updated_at (pakai fungsi bawaan project) =====
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'pencatatan_keuangan' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS pencatatan_keuangan_updated_at ON public.pencatatan_keuangan';
    EXECUTE 'CREATE TRIGGER pencatatan_keuangan_updated_at BEFORE UPDATE ON public.pencatatan_keuangan FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'catatan_sedekah' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS catatan_sedekah_updated_at ON public.catatan_sedekah';
    EXECUTE 'CREATE TRIGGER catatan_sedekah_updated_at BEFORE UPDATE ON public.catatan_sedekah FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
  END IF;
END $$;

-- ===== Realtime (supaya tabel baru bisa live-update kaya tab lain) =====
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'pencatatan_keuangan' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pencatatan_keuangan';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'catatan_sedekah' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.catatan_sedekah';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'catatan_sedekah_benefit' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.catatan_sedekah_benefit';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cek cepat (harus keluar 3 baris):
-- select table_name from information_schema.tables where table_schema='public'
--   and table_name in ('pencatatan_keuangan','catatan_sedekah','catatan_sedekah_benefit');
