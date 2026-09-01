-- Hapus kolom tanggal di tabel mental_block (TIDAK perlu field tanggal)
-- Catatan: data lama tetap aman; kolom tanggal di-drop.

ALTER TABLE public.mental_block DROP COLUMN IF EXISTS tanggal;
