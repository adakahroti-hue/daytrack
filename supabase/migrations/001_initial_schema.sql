-- ============================================
-- DAYTRACK DATABASE MIGRATION
-- 14 Tables + RLS Policies + Indexes
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TASKS TABLE
-- ============================================
CREATE TABLE public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    nama TEXT NOT NULL,
    tanggal_jam TIMESTAMPTZ NOT NULL,
    estimasi_menit INT DEFAULT 0,
    prioritas TEXT CHECK (prioritas IN ('p1', 'p2', 'p3', 'p4')) DEFAULT 'p3',
    aspek TEXT CHECK (aspek IN ('psikis', 'produktivitas', 'keuangan', 'hubungan')) DEFAULT 'produktivitas',
    deadline TIMESTAMPTZ,
    status TEXT CHECK (status IN ('proses', 'belum', 'selesai')) DEFAULT 'belum',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_date ON public.tasks(user_id, tanggal_jam);
CREATE INDEX idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_user_priority ON public.tasks(user_id, prioritas);
CREATE INDEX idx_tasks_user_aspect ON public.tasks(user_id, aspek);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 2. SHOLAT TABLE
-- ============================================
CREATE TABLE public.sholat (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    subuh BOOLEAN DEFAULT FALSE,
    dhuha BOOLEAN DEFAULT FALSE,
    dzuhur BOOLEAN DEFAULT FALSE,
    ashar BOOLEAN DEFAULT FALSE,
    maghrib BOOLEAN DEFAULT FALSE,
    isya BOOLEAN DEFAULT FALSE,
    alasan_subuh TEXT CHECK (alasan_subuh IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    alasan_dhuha TEXT CHECK (alasan_dhuha IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    alasan_dzuhur TEXT CHECK (alasan_dzuhur IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    alasan_ashar TEXT CHECK (alasan_ashar IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    alasan_maghrib TEXT CHECK (alasan_maghrib IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    alasan_isya TEXT CHECK (alasan_isya IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tanggal)
);

CREATE INDEX idx_sholat_user_date ON public.sholat(user_id, tanggal);

ALTER TABLE public.sholat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own sholat" ON public.sholat
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 3. QURAN TABLE
-- ============================================
CREATE TABLE public.quran (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    setelah_subuh BOOLEAN DEFAULT FALSE,
    setelah_dzuhur BOOLEAN DEFAULT FALSE,
    setelah_ashar BOOLEAN DEFAULT FALSE,
    setelah_maghrib BOOLEAN DEFAULT FALSE,
    setelah_isya BOOLEAN DEFAULT FALSE,
    alasan_setelah_subuh TEXT CHECK (alasan_setelah_subuh IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    alasan_setelah_dzuhur TEXT CHECK (alasan_setelah_dzuhur IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    alasan_setelah_ashar TEXT CHECK (alasan_setelah_ashar IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    alasan_setelah_maghrib TEXT CHECK (alasan_setelah_maghrib IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    alasan_setelah_isya TEXT CHECK (alasan_setelah_isya IN ('malas', 'lupa', 'sibuk', 'sakit', 'perjalanan', 'tak_ada_tempat', 'bersama_teman', 'lainnya')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tanggal)
);

CREATE INDEX idx_quran_user_date ON public.quran(user_id, tanggal);

ALTER TABLE public.quran ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own quran" ON public.quran
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 4. DOA TABLE
-- ============================================
CREATE TABLE public.doa (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    status TEXT CHECK (status IN ('ya', 'tidak')) DEFAULT 'tidak',
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tanggal)
);

CREATE INDEX idx_doa_user_date ON public.doa(user_id, tanggal);

ALTER TABLE public.doa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own doa" ON public.doa
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. SYUKUR TABLE
-- ============================================
CREATE TABLE public.syukur (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    status TEXT CHECK (status IN ('ya', 'tidak')) DEFAULT 'tidak',
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tanggal)
);

CREATE INDEX idx_syukur_user_date ON public.syukur(user_id, tanggal);

ALTER TABLE public.syukur ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own syukur" ON public.syukur
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 6. TIDUR TABLE
-- ============================================
CREATE TABLE public.tidur (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    status TEXT CHECK (status IN ('tepat', 'begadang')) DEFAULT 'tepat',
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tanggal)
);

CREATE INDEX idx_tidur_user_date ON public.tidur(user_id, tanggal);

ALTER TABLE public.tidur ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own tidur" ON public.tidur
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 7. MASALAH TABLE
-- ============================================
CREATE TABLE public.masalah (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    masalah TEXT NOT NULL,
    solusi TEXT,
    status TEXT CHECK (status IN ('belum', 'sudah')) DEFAULT 'belum',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_masalah_user_date ON public.masalah(user_id, tanggal);
CREATE INDEX idx_masalah_user_status ON public.masalah(user_id, status);

ALTER TABLE public.masalah ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own masalah" ON public.masalah
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 8. MINUM_AIR TABLE
-- ============================================
CREATE TABLE public.minum_air (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    setelah_bangun BOOLEAN DEFAULT FALSE,
    pertengahan_pagi BOOLEAN DEFAULT FALSE,
    setelah_dzuhur BOOLEAN DEFAULT FALSE,
    sebelum_maghrib BOOLEAN DEFAULT FALSE,
    setelah_ashar BOOLEAN DEFAULT FALSE,
    setelah_isya BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tanggal)
);

CREATE INDEX idx_minum_air_user_date ON public.minum_air(user_id, tanggal);

ALTER TABLE public.minum_air ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own minum_air" ON public.minum_air
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 9. PMO TABLE
-- ============================================
CREATE TABLE public.pmo (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari_ke INT CHECK (hari_ke BETWEEN 1 AND 7) NOT NULL,
    nama_hari TEXT NOT NULL,
    status TEXT CHECK (status IN ('berhasil', 'relapse')) DEFAULT 'berhasil',
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tanggal)
);

CREATE INDEX idx_pmo_user_date ON public.pmo(user_id, tanggal);

ALTER TABLE public.pmo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own pmo" ON public.pmo
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 10. KESENANGAN TABLE
-- ============================================
CREATE TABLE public.kesenangan (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    kesenangan TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tanggal)
);

CREATE INDEX idx_kesenangan_user_date ON public.kesenangan(user_id, tanggal);

ALTER TABLE public.kesenangan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own kesenangan" ON public.kesenangan
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 11. SARAN_PERBAIKAN TABLE
-- ============================================
CREATE TABLE public.saran_perbaikan (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    hari TEXT NOT NULL,
    saran TEXT NOT NULL,
    keterangan TEXT,
    status TEXT CHECK (status IN ('belum', 'proses', 'selesai')) DEFAULT 'belum',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saran_perbaikan_user_date ON public.saran_perbaikan(user_id, tanggal);
CREATE INDEX idx_saran_perbaikan_user_status ON public.saran_perbaikan(user_id, status);

ALTER TABLE public.saran_perbaikan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own saran_perbaikan" ON public.saran_perbaikan
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 12. KHUSUS: Update triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER sholat_updated_at BEFORE UPDATE ON public.sholat
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER quran_updated_at BEFORE UPDATE ON public.quran
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER doa_updated_at BEFORE UPDATE ON public.doa
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER syukur_updated_at BEFORE UPDATE ON public.syukur
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tidur_updated_at BEFORE UPDATE ON public.tidur
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER masalah_updated_at BEFORE UPDATE ON public.masalah
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER minum_air_updated_at BEFORE UPDATE ON public.minum_air
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER pmo_updated_at BEFORE UPDATE ON public.pmo
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER kesenangan_updated_at BEFORE UPDATE ON public.kesenangan
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER saran_perbaikan_updated_at BEFORE UPDATE ON public.saran_perbaikan
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 13. ENABLE REALTIME FOR KEY TABLES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sholat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quran;
ALTER PUBLICATION supabase_realtime ADD TABLE public.minum_air;
ALTER PUBLICATION supabase_realtime ADD TABLE public.masalah;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saran_perbaikan;

-- ============================================
-- 14. GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, service_role;