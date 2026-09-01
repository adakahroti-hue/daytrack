-- Hapus kolom tanggal di tabel refleksi & maafkan (TIDAK perlu field tanggal)
-- Catatan: data lama tetap aman; kolom tanggal di-drop.

ALTER TABLE public.refleksi DROP COLUMN IF EXISTS tanggal;
ALTER TABLE public.maafkan DROP COLUMN IF EXISTS tanggal;
