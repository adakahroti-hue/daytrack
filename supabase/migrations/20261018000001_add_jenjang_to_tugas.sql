-- Kelompok tugas "jabatan": primer (inti) vs sekunder (pendukung).
-- Dipakai tab baru /tugas/prioritas (dua kolom: Primer | Sekunder).
-- Default 'primer' → semua tugas lama langsung tampil di kolom kiri;
-- pindahkan ke 'sekunder' lewat form Edit Tugas (dropdown Jenjang).
ALTER TABLE public.tugas
  ADD COLUMN IF NOT EXISTS jenjang TEXT NOT NULL DEFAULT 'primer'
  CONSTRAINT tugas_jenjang_check CHECK (jenjang IN ('primer', 'sekunder'));