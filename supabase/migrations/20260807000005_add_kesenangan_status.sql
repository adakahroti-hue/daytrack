-- Revisi 6 (batch 5): kolom status untuk tabel kesenangan — 'belum' / 'sudah'
ALTER TABLE kesenangan ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'belum';
