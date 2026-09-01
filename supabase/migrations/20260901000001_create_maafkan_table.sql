-- CREATE TABLE: maafkan (kategori Pelajaran — mirip mental_block + kolom status)
-- Fungsi: mencatat event/trigger dari mental block yang ingin dimaafkan.

CREATE TABLE IF NOT EXISTS public.maafkan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  kejadian text NOT NULL,
  status text NOT NULL DEFAULT 'belum',   -- 'belum' | 'sudah'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maafkan_user_tanggal ON public.maafkan(user_id, tanggal);

ALTER TABLE public.maafkan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own maafkan" ON public.maafkan;
CREATE POLICY "Users can CRUD own maafkan" ON public.maafkan
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'maafkan' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS maafkan_updated_at ON public.maafkan';
    EXECUTE 'CREATE TRIGGER maafkan_updated_at BEFORE UPDATE ON public.maafkan FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
  END IF;
END $$;

-- Realtime (opsional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.maafkan';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
