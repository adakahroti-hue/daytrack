import os, psycopg2

PROJ = 'ftskhfwlhfbmettbgecp'
sq_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
sql = open('/home/hermes/daytrack/supabase/migrations/20260813000001_create_keuangan_tables.sql').read()

applied = False
for port in (5432, 6543):
    try:
        conn = psycopg2.connect(
            host='aws-0-ap-southeast-1.pooler.supabase.com',
            port=port, dbname='postgres',
            user=f'postgres.{PROJ}', password=sq_key, connect_timeout=30)
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        print(f"OK via port {port}")
        cur.close(); conn.close()
        applied = True
        break
    except Exception as e:
        print(f"port {port} gagal: {e}")

if not applied:
    print("MIGRATION GAGAL")
    raise SystemExit(1)

# Verify
conn = psycopg2.connect(host='aws-0-ap-southeast-1.pooler.supabase.com', port=6543,
    dbname='postgres', user=f'postgres.{PROJ}', password=sq_key, connect_timeout=30)
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('arus_kas','keranjang') ORDER BY table_name")
print("Tables exist:", [r[0] for r in cur.fetchall()])
cur.close(); conn.close()
