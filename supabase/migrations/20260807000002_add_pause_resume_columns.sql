-- Add pause/resume time-tracking columns to tasks
-- accumulated_seconds: total active work seconds (excludes paused time)
-- is_paused: whether the in-progress task is currently paused
-- last_resumed_at: timestamp of the most recent (re)start of active work

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS accumulated_seconds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_resumed_at TIMESTAMPTZ NULL;
