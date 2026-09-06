-- CREATE TABLE: jejak_waktu (pelacakan aktivitas: mulai -> selesai -> durasi)
CREATE TABLE IF NOT EXISTS public.jejak_waktu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jejak_waktu_user ON public.jejak_waktu(user_id);
CREATE INDEX IF NOT EXISTS idx_jejak_waktu_user_status ON public.jejak_waktu(user_id, status);

ALTER TABLE public.jejak_waktu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own jejak_waktu" ON public.jejak_waktu;
CREATE POLICY "Users can CRUD own jejak_waktu" ON public.jejak_waktu
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'jejak_waktu_updated_at') THEN
    CREATE TRIGGER jejak_waktu_updated_at BEFORE UPDATE ON public.jejak_waktu
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'jejak_waktu') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jejak_waktu;
  END IF;
END $$;
