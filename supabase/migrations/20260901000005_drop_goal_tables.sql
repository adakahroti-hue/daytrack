-- DROP TABLE: goal & goal_utama (tab Goal dihapus per permintaan user)
-- CASCADE agar policy/trigger/index terkait ikut terhapus

DROP TABLE IF EXISTS public.goal_utama CASCADE;
DROP TABLE IF EXISTS public.goal CASCADE;
