-- Revisi 3: index komposit (user_id, tanggal) untuk tabel log — mempercepat query range
-- di tab Quran, Minum Air, Sholat, dll. Sebelumnya hanya tasks yang punya index.
CREATE INDEX IF NOT EXISTS idx_prayer_logs_user_tanggal ON prayer_logs (user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_quran_logs_user_tanggal ON quran_logs (user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_minum_air_logs_user_tanggal ON minum_air_logs (user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_doa_logs_user_tanggal ON doa_logs (user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_syukur_logs_user_tanggal ON syukur_logs (user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_tidur_logs_user_tanggal ON tidur_logs (user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_masalah_logs_user_tanggal ON masalah_logs (user_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_pmo_logs_user_tanggal ON pmo_logs (user_id, tanggal);
