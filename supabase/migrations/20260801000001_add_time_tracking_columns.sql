-- Add time tracking columns to tasks table
ALTER TABLE tasks
  ADD COLUMN started_at TIMESTAMPTZ NULL,
  ADD COLUMN completed_at TIMESTAMPTZ NULL;
