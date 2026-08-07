-- Revisi batch 12: penanda paket tugas (parent/child/single)
-- group_id   : id paket (null = single). Parent & child dalam satu paket berbagi group_id yang sama.
-- group_order: nomor urut dalam paket. Parent = 1, child = 2,3,4,... (unik per paket).
alter table public.tasks add column if not exists group_id uuid;
alter table public.tasks add column if not exists group_order integer;
create index if not exists idx_tasks_group_id on public.tasks(group_id);
