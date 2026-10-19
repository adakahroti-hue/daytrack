-- Tab Tugas (tugas_prioritas): kolom urutan manual per kolom (primer/sekunder).
-- Diisi oleh fitur drag posisi kartu — sebelumnya urutan dihitung otomatis
-- (pos_order NULL = urut otomatis komputer).
ALTER TABLE public.tugas_prioritas
  ADD COLUMN IF NOT EXISTS pos_order INTEGER;

COMMENT ON COLUMN public.tugas_prioritas.pos_order IS
  'Urutan manual dalam kolom (primer/sekunder) dari drag kartu — NULL = urut otomatis';