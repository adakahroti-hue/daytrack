import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@daytrack.local',
    password: 'admin123'
  })
  
  if (error) {
    console.error('Auth error:', error)
    return
  }
  
  console.log('User:', data.user?.id)
  
  const { data: sholat, error: sholatError } = await supabase
    .from('sholat')
    .select('*')
    .eq('user_id', data.user.id)
    .eq('tanggal', '2026-07-27')
    .single()
  
  console.log('Sholat data:', sholat)
  console.log('Sholat error:', sholatError)
}

test()
