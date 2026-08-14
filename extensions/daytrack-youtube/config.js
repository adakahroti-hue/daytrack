// Konfigurasi DayTrack Supabase.
// SUPABASE_URL sudah diisi. ANON_KEY harus diisi dengan anon key asli DayTrack
// (ambil dari DayTrack .env.local NEXT_PUBLIC_SUPABASE_ANON_KEY, atau Settings).
// Anon key adalah public key — aman dipakai di client/extension.
window.DAYTRACK_CONFIG = {
  SUPABASE_URL: "https://ftskhfwlhfbmettbgecp.supabase.co",
  ANON_KEY: "MASUKKAN_ANON_KEY_DISINI",
  // Nama tabel playlist (ex: senang) — sudah di-rename ke 'playlist'
  TABLE: "playlist",
};
