-- Add kualitas column to quran_logs for rating baca (1-5)
ALTER TABLE public.quran_logs ADD COLUMN IF NOT EXISTS kualitas SMALLINT CHECK (kualitas >= 1 AND kualitas <= 5);
