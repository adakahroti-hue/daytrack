-- ============================================================
-- SEED: buat table mental_block (jika belum ada) + insert 31 entri
-- Generate by Nerobot — 2026-08-28
-- Cara pakai: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================

-- 1) Buat table (idempoten, aman dijalankan berulang)
CREATE TABLE IF NOT EXISTS public.mental_block (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tanggal DATE NOT NULL,
    masalah TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mental_block_user_tanggal ON public.mental_block(user_id, tanggal);
ALTER TABLE public.mental_block ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own mental_block" ON public.mental_block;
CREATE POLICY "Users can CRUD own mental_block" ON public.mental_block
    FOR ALL USING (auth.uid() = user_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'mental_block' AND relnamespace = 'public'::regnamespace) THEN
        EXECUTE 'DROP TRIGGER IF EXISTS mental_block_updated_at ON public.mental_block';
        EXECUTE 'CREATE TRIGGER mental_block_updated_at BEFORE UPDATE ON public.mental_block FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
    END IF;
END
$$;

DO $$
BEGIN
    BEGIN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.mental_block';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END
$$;

-- 2) Insert 31 entri (user_id diambil otomatis dari data existing)
DO $$
DECLARE
    v_uid uuid;
BEGIN
    -- ambil user_id dari tabel yang sudah punya data (DayTrack single-user)
    SELECT user_id INTO v_uid FROM public.refleksi LIMIT 1;
    IF v_uid IS NULL THEN
        SELECT id INTO v_uid FROM auth.users ORDER BY created_at ASC LIMIT 1;
    END IF;

    INSERT INTO public.mental_block (user_id, tanggal, masalah) VALUES
        (v_uid, '2026-08-28', 'kenapa aku canggung saat berterima kasih'),
        (v_uid, '2026-08-28', 'kenapa aku canggung saat terlalu dekat dengan orang lain'),
        (v_uid, '2026-08-28', 'kenapa aku canggung saat berbicara dengan orang yang jauh lebih sukses dariku'),
        (v_uid, '2026-08-28', 'kenapa aku sinusitus'),
        (v_uid, '2026-08-28', 'kenapa rambutku rontok'),
        (v_uid, '2026-08-28', 'kenapa aku benci jualan kelas'),
        (v_uid, '2026-08-28', 'kenapa aku menanggap diriku jelek'),
        (v_uid, '2026-08-28', 'kenapa aku selalu awkward saat pertemuan kedua dengan orang'),
        (v_uid, '2026-08-28', 'kenapa aku selalu menganggap wanita cantik sesuatu yang luar biasa bagiku'),
        (v_uid, '2026-08-28', 'kenapa aku begitu dapat uang,rasanya nggak tenang kalau nggak belanja'),
        (v_uid, '2026-08-28', 'kenapa aku cenderung kembali malas pada saat sudah mendapatkan hasil atas disiplin dalam durasi waktu tertentu yang berhasil aku capai'),
        (v_uid, '2026-08-28', 'kenapa aku malas basa basi'),
        (v_uid, '2026-08-28', 'kenapa aku malas dan tak mau masuk ke dalam rumah ma asbul'),
        (v_uid, '2026-08-28', 'kenapa aku canggung ke keluargaku'),
        (v_uid, '2026-08-28', 'kenapa aku kalau ngobrol cenderung kaku'),
        (v_uid, '2026-08-28', 'kenapa aku coli'),
        (v_uid, '2026-08-28', 'kenapa aku sakit hati ketika chatku tak dibalas'),
        (v_uid, '2026-08-28', 'kenapa aku merasa rendah diri'),
        (v_uid, '2026-08-28', 'kenapa aku cenderung belibet saat grogi'),
        (v_uid, '2026-08-28', 'kenapa saat aku kenalan dengan orang random, biasa untuk pertemuan keduanya jadi canggung seprti di tambak boyo'),
        (v_uid, '2026-08-28', 'kenapa memangnya kalau orang melihat aku botak'),
        (v_uid, '2026-08-28', 'apa sebenarnya tujuan hidupku'),
        (v_uid, '2026-08-28', 'kenapa aku sulit konsisten'),
        (v_uid, '2026-08-28', 'kenapa aku terlalu banyak alasan'),
        (v_uid, '2026-08-28', 'kenapa aku sulit bilang tidak ke teman'),
        (v_uid, '2026-08-28', 'kenapa pada saat ngerantau lama. cenderung gampang nangis kalau bahas soal ibu'),
        (v_uid, '2026-08-28', 'kenapa aku sulit punya ikatan emosional ke ayah'),
        (v_uid, '2026-08-28', 'kenapa aku takut jualan karena aku takut oran lain perhitungan sama aku.'),
        (v_uid, '2026-08-28', 'kenapa saat aku main game dikatain'),
        (v_uid, '2026-08-28', 'kenapa pada saat orang cari aku, aku cenderung cari alasan untuk mengulur waktu. dalam hal cari untuk kerja tugas. untuk belajar di aku. ini juga relate saat ada cewek yang fix sudah tertarik padaku. aku cenderung gak peduli dan mengulurnya'),
        (v_uid, '2026-08-28', 'bagaimana memanfaatkan mekanisme penjaga gerbang ini untuk boost disiplin dan pencapaian');
END $$;

-- Selesai! 🐱
