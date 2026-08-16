-- ARUS KAS: tambah dompet 'paylater' ke constraint CHECK
-- paylater = utang/cicilan (ShopeePayLater, Kredivo, dll) saat uang keluar

ALTER TABLE public.arus_kas
  DROP CONSTRAINT IF EXISTS arus_kas_dompet_check;

ALTER TABLE public.arus_kas
  ADD CONSTRAINT arus_kas_dompet_check
  CHECK (
    (kategori = 'uang_keluar' AND dompet IN ('kebutuhan', 'tabungan', 'self_reward', 'sedekah', 'paylater'))
    OR (kategori = 'uang_masuk' AND dompet IS NULL)
  );
