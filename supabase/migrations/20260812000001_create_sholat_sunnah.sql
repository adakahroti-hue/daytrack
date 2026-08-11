-- ─── Tabel sholat_sunnah (Sholat Sunnah: Dhuha + Tahajud) ───
-- Dipisah dari tabel sholat (wajib) agar tab "Sholat Sunnah" mandiri.
CREATE TABLE IF NOT EXISTS public.sholat_sunnah (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    status TEXT DEFAULT 'belum',
    sholat_dhuha BOOLEAN DEFAULT FALSE,
    sholat_tahajud BOOLEAN DEFAULT FALSE,
    alasan_dhuha TEXT,
    alasan_tahajud TEXT,
    kualitas_dhuha SMALLINT DEFAULT NULL CHECK (kualitas_dhuha IN (1, 2, 3, 4, 5)),
    kualitas_tahajud SMALLINT DEFAULT NULL CHECK (kualitas_tahajud IN (1, 2, 3, 4, 5)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, tanggal)
);

CREATE INDEX IF NOT EXISTS idx_sholat_sunnah_user_tanggal ON public.sholat_sunnah (user_id, tanggal);

-- Enable RLS
ALTER TABLE public.sholat_sunnah ENABLE ROW LEVEL SECURITY;

-- Policy: user hanya akses data sendiri
DROP POLICY IF EXISTS "sholat_sunnah_select_own" ON public.sholat_sunnah;
CREATE POLICY "sholat_sunnah_select_own" ON public.sholat_sunnah
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sholat_sunnah_insert_own" ON public.sholat_sunnah;
CREATE POLICY "sholat_sunnah_insert_own" ON public.sholat_sunnah
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sholat_sunnah_update_own" ON public.sholat_sunnah;
CREATE POLICY "sholat_sunnah_update_own" ON public.sholat_sunnah
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sholat_sunnah_delete_own" ON public.sholat_sunnah;
CREATE POLICY "sholat_sunnah_delete_own" ON public.sholat_sunnah
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_sholat_sunnah_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sholat_sunnah_updated_at ON public.sholat_sunnah;
CREATE TRIGGER trg_sholat_sunnah_updated_at
    BEFORE UPDATE ON public.sholat_sunnah
    FOR EACH ROW EXECUTE FUNCTION update_sholat_sunnah_updated_at();
