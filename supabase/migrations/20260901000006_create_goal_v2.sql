-- CREATE TABLE: goal (satu goal aktif per user, tapi izinkan beberapa rows)
CREATE TABLE IF NOT EXISTS public.goal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  target_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goal_user ON public.goal(user_id);
ALTER TABLE public.goal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own goal" ON public.goal;
CREATE POLICY "Users can CRUD own goal" ON public.goal
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CREATE TABLE: goal_milestone (milestone dari sebuah goal)
CREATE TABLE IF NOT EXISTS public.goal_milestone (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goal(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goal_milestone_goal ON public.goal_milestone(goal_id);
ALTER TABLE public.goal_milestone ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own goal_milestone" ON public.goal_milestone;
CREATE POLICY "Users can CRUD own goal_milestone" ON public.goal_milestone
  FOR ALL USING (EXISTS (SELECT 1 FROM public.goal g WHERE g.id = goal_id AND g.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.goal g WHERE g.id = goal_id AND g.user_id = auth.uid()));

-- CREATE TABLE: goal_step (step dari sebuah milestone)
CREATE TABLE IF NOT EXISTS public.goal_step (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.goal_milestone(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goal_step_milestone ON public.goal_step(milestone_id);
ALTER TABLE public.goal_step ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own goal_step" ON public.goal_step;
CREATE POLICY "Users can CRUD own goal_step" ON public.goal_step
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.goal_milestone m
    JOIN public.goal g ON g.id = m.goal_id
    WHERE m.id = milestone_id AND g.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.goal_milestone m
    JOIN public.goal g ON g.id = m.goal_id
    WHERE m.id = milestone_id AND g.user_id = auth.uid()));

-- CREATE TABLE: goal_progress_log (log harian aktivitas goal)
CREATE TABLE IF NOT EXISTS public.goal_progress_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goal(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.goal_milestone(id) ON DELETE SET NULL,
  step_id UUID REFERENCES public.goal_step(id) ON DELETE SET NULL,
  activity TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goal_log_goal ON public.goal_progress_log(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_log_date ON public.goal_progress_log(date);
ALTER TABLE public.goal_progress_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own goal_progress_log" ON public.goal_progress_log;
CREATE POLICY "Users can CRUD own goal_progress_log" ON public.goal_progress_log
  FOR ALL USING (EXISTS (SELECT 1 FROM public.goal g WHERE g.id = goal_id AND g.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.goal g WHERE g.id = goal_id AND g.user_id = auth.uid()));

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'goal_updated_at') THEN
    CREATE TRIGGER goal_updated_at BEFORE UPDATE ON public.goal
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'goal_milestone_updated_at') THEN
    CREATE TRIGGER goal_milestone_updated_at BEFORE UPDATE ON public.goal_milestone
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'goal_step_updated_at') THEN
    CREATE TRIGGER goal_step_updated_at BEFORE UPDATE ON public.goal_step
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'goal') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.goal;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'goal_milestone') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_milestone;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'goal_step') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_step;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'goal_progress_log') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_progress_log;
  END IF;
END $$;
