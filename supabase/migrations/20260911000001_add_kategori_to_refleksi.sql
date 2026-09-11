-- ALTER TABLE: refleksi — tambah kolom kategori (dropdown 4 opsi kebiasaan)
-- Isi: 'kebiasaan_berpikir' | 'kebiasaan_bertindak' | 'kebiasaan_bersikap' | 'kebiasaan_berbicara'
-- NULL = belum dipilih kategori (baris lama aman).
ALTER TABLE public.refleksi
  ADD COLUMN IF NOT EXISTS kategori TEXT
  CONSTRAINT refleksi_kategori_check
  CHECK (kategori IN ('kebiasaan_berpikir', 'kebiasaan_bertindak', 'kebiasaan_bersikap', 'kebiasaan_berbicara'));

-- Tabel refleksi sudah terdaftar di realtime publication — tidak perlu perubahan.
