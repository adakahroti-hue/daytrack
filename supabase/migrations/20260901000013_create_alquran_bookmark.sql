-- Bookmark terakhir baca Alquran (mode mengaji)
CREATE TABLE IF NOT EXISTS public.alquran_bookmark (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surah INTEGER NOT NULL DEFAULT 1,
  ayat INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_alquran_bookmark_user ON public.alquran_bookmark(user_id);

ALTER TABLE public.alquran_bookmark ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own alquran_bookmark" ON public.alquran_bookmark;
CREATE POLICY "Users can manage own alquran_bookmark" ON public.alquran_bookmark
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'alquran_bookmark_updated_at') THEN
    CREATE TRIGGER alquran_bookmark_updated_at BEFORE UPDATE ON public.alquran_bookmark
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;
