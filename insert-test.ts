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
  
  // Insert sholat data
  const { data: sholat, error: sholatError } = await supabase
    .from('sholat')
    .upsert({
      user_id: data.user.id,
      tanggal: '2026-07-27',
      hari: 'Senin',
      subuh: true,
      dhuha: false,
      dzuhur: true,
      ashar: true,
      maghrib: true,
      isya: true,
      alasan_dhuha: 'sibuk',
    })
    .select()
    .single()
  
  console.log('Sholat inserted:', sholat)
  console.log('Sholat error:', sholatError)
  
  // Insert quran data
  const { data: quran, error: quranError } = await supabase
    .from('quran')
    .upsert({
      user_id: data.user.id,
      tanggal: '2026-07-27',
      hari: 'Senin',
      setelah_subuh: true,
      setelah_dzuhur: true,
      setelah_ashar: false,
      setelah_maghrib: true,
      setelah_isya: true,
      alasan_setelah_ashar: 'sibuk',
    })
    .select()
    .single()
  
  console.log('Quran inserted:', quran)
  console.log('Quran error:', quranError)
}

test()
