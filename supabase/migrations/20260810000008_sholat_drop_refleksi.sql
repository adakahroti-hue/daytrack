-- Drop unused refleksi column from sholat table
ALTER TABLE public.sholat DROP COLUMN IF EXISTS refleksi;
