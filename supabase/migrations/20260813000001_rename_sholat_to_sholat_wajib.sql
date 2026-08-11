-- ─── RENAME tabel sholat → sholat_wajib ───
-- Supaya konsisten dengan tab "Sholat Wajib" (terpisah dari sholat_sunnah).
ALTER TABLE IF EXISTS public.sholat RENAME TO sholat_wajib;

-- Rename index agar konsisten
ALTER INDEX IF EXISTS idx_sholat_user_date RENAME TO idx_sholat_wajib_user_date;

-- Policy & trigger ikut ter-rename otomatis oleh Postgres saat tabel di-rename.
-- (Policy "Users can CRUD own sholat" → "Users can CRUD own sholat_wajib" otomatis.)
