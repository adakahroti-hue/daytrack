import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
  
  const { data: quran, error: quranError } = await supabase
    .from('quran')
    .select('*')
    .eq('user_id', data.user.id)
    .eq('tanggal', '2026-07-27')
    .single()
  
  console.log('Quran data:', quran)
  console.log('Quran error:', quranError)
}

test()
