-- Drop unused columns from pmo table
ALTER TABLE public.pmo DROP COLUMN IF EXISTS trigger;
ALTER TABLE public.pmo DROP COLUMN IF EXISTS strategi;
