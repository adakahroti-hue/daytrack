-- Rev 6: status untuk minum air — 'sudah' (sudah minum) / 'lupa' (lupa minum), NULL = belum dicatat
ALTER TABLE minum_air_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;
