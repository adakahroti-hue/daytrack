-- CREATE TABLE: pengingat (reminder sederhana: nama, tanggal, jam)
CREATE TABLE IF NOT EXISTS public.pengingat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL DEFAULT '',
  tanggal DATE,
  jam TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pengingat_user ON public.pengingat(user_id);

ALTER TABLE public.pengingat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own pengingat" ON public.pengingat;
CREATE POLICY "Users can CRUD own pengingat" ON public.pengingat
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pengingat_updated_at') THEN
    CREATE TRIGGER pengingat_updated_at BEFORE UPDATE ON public.pengingat
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pengingat') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pengingat;
  END IF;
END $$;
