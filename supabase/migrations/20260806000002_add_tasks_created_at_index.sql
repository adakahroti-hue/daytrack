-- Index untuk query tasks: tab Semua (ORDER BY created_at DESC LIMIT N)
-- Halaman Hari Ini memakai (user_id, tanggal) yang sudah ada di migrasi 20260801000002
CREATE INDEX IF NOT EXISTS idx_tasks_user_created_at ON public.tasks(user_id, created_at DESC);
