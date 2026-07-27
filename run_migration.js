const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://ftskhfwlhfbmettbgecp.supabase.co'
const supabaseKey = fs.readFileSync('.env.local', 'utf8').split('\n').find(l => l.includes('SERVICE_ROLE_KEY')).split('=')[1].trim()

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  const sql = fs.readFileSync('supabase/migrations/20250727000001_initial_schema.sql', 'utf8')
  const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'))
  
  // Try to create a function to execute DDL
  const createFunc = `
    CREATE OR REPLACE FUNCTION exec_ddl(sql text) RETURNS void LANGUAGE plpgsql AS \$\$
    BEGIN
      EXECUTE sql;
    END;
    \$\$;
  `
  
  try {
    const { error } = await supabase.rpc('exec_ddl', { sql: createFunc })
    if (error) console.log('Create function error:', error)
    else console.log('Function created')
  } catch (e) {
    console.log('Function creation failed:', e.message)
  }
  
  // Now try executing each statement
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue
    try {
      const { data, error } = await supabase.rpc('exec_ddl', { sql: stmt })
      if (error) console.log(`Statement ${i+1}: ERROR - ${error.message}`)
      else console.log(`Statement ${i+1}: OK`)
    } catch (e) {
      console.log(`Statement ${i+1}: EXCEPTION - ${e.message}`)
    }
  }
}

runMigration()
