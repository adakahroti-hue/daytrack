const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://ftskhfwlhfbmettbgecp.supabase.co'
const keyLine = fs.readFileSync('.env.local', 'utf8').split('\n').find(l => l.includes('SERVICE_ROLE_KEY'))
const supabaseKey = keyLine.split('=')[1].trim()
const supabase = createClient(supabaseUrl, supabaseKey)

;(async () => {
  const { data, error } = await supabase
    .from('makan')
    .select('*')
    .eq('tanggal', '2026-09-10')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('QUERY_ERROR', JSON.stringify(error))
    process.exit(1)
  }
  console.log('ROW_COUNT', data?.length ?? 0)
  console.log('ROWS', JSON.stringify(data, null, 2))
})()
