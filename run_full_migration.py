import requests
import json
import time

# Supabase project details
PROJECT_REF = 'ftskhefwlhfbmettbgecp'
URL = f'https://{PROJECT_REF}.supabase.co'

# Read service role key
with open('.env.local') as f:
    for line in f:
        if 'SERVICE_ROLE_KEY' in line:
            SERVICE_ROLE_KEY = line.split('=', 1)[1].strip()
            break

HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Read migration SQL
with open('supabase/migrations/20250727000001_initial_schema.sql') as f:
    SQL = f.read()

# Split into statements
statements = [s.strip() for s in SQL.split(';') if s.strip() and not s.strip().startswith('--')]

print(f"Total statements to execute: {len(statements)}")

# We need to use the Supabase Management API to execute SQL
# But we need a personal access token for that
# Let's try using the SQL execution through the REST API with a special function

# First, let's try to see if we can create a function to execute SQL
# This requires direct SQL execution which we can't do via REST API

# Alternative: Try the Supabase Dashboard SQL Editor API
# The dashboard uses a different endpoint

# Let's try the management API with the service role key
# This sometimes works for some operations

# Try to execute via a direct connection using the pooler with correct credentials
# The pooler username format is: postgres.{project_ref}

import psycopg2

# Try connecting with the correct pooler credentials
POOLER_HOST = 'aws-0-ap-southeast-1.pooler.supabase.com'
POOLER_PORT = 5432
USER = f'postgres.{PROJECT_REF}'
DB = 'postgres'

try:
    conn = psycopg2.connect(
        host=POOLER_HOST,
        port=POOLER_PORT,
        dbname=DB,
        user=USER,
        password=SERVICE_ROLE_KEY,
        connect_timeout=30
    )
    print(f"SUCCESS: Connected to pooler!")
    
    cursor = conn.cursor()
    cursor.execute(SQL)
    conn.commit()
    print("Migration executed successfully!")
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Connection failed: {e}")
    
    # Try session pooler port 6543
    try:
        conn = psycopg2.connect(
            host=POOLER_HOST,
            port=6543,
            dbname=DB,
            user=USER,
            password=SERVICE_ROLE_KEY,
            connect_timeout=30
        )
        print(f"SUCCESS: Connected to session pooler!")
        cursor = conn.cursor()
        cursor.execute(SQL)
        conn.commit()
        print("Migration executed successfully!")
        cursor.close()
        conn.close()
    except Exception as e2:
        print(f"Session pooler also failed: {e2}")

