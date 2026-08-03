-- Add index on tanggal column for faster date filtering
CREATE INDEX IF NOT EXISTS idx_tasks_tanggal ON tasks(tanggal);
CREATE INDEX IF NOT EXISTS idx_tasks_user_tanggal ON tasks(user_id, tanggal);