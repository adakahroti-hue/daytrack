-- Extend prayer quality rating scale from 1-3 to 1-5
-- Drop the old CHECK constraints and re-add them allowing values 1..5

ALTER TABLE public.prayer_logs DROP CONSTRAINT IF EXISTS prayer_logs_kualitas_subuh_check;
ALTER TABLE public.prayer_logs DROP CONSTRAINT IF EXISTS prayer_logs_kualitas_dhuha_check;
ALTER TABLE public.prayer_logs DROP CONSTRAINT IF EXISTS prayer_logs_kualitas_dzuhur_check;
ALTER TABLE public.prayer_logs DROP CONSTRAINT IF EXISTS prayer_logs_kualitas_ashar_check;
ALTER TABLE public.prayer_logs DROP CONSTRAINT IF EXISTS prayer_logs_kualitas_maghrib_check;
ALTER TABLE public.prayer_logs DROP CONSTRAINT IF EXISTS prayer_logs_kualitas_isya_check;

ALTER TABLE public.prayer_logs
  ADD CONSTRAINT prayer_logs_kualitas_subuh_check   CHECK (kualitas_subuh   IN (1, 2, 3, 4, 5)),
  ADD CONSTRAINT prayer_logs_kualitas_dhuha_check   CHECK (kualitas_dhuha   IN (1, 2, 3, 4, 5)),
  ADD CONSTRAINT prayer_logs_kualitas_dzuhur_check  CHECK (kualitas_dzuhur  IN (1, 2, 3, 4, 5)),
  ADD CONSTRAINT prayer_logs_kualitas_ashar_check   CHECK (kualitas_ashar   IN (1, 2, 3, 4, 5)),
  ADD CONSTRAINT prayer_logs_kualitas_maghrib_check CHECK (kualitas_maghrib IN (1, 2, 3, 4, 5)),
  ADD CONSTRAINT prayer_logs_kualitas_isya_check    CHECK (kualitas_isya    IN (1, 2, 3, 4, 5));
