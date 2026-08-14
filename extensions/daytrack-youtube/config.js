// Konfigurasi DayTrack Supabase.
// SUPABASE_URL sudah diisi. ANON_KEY harus diisi dengan anon key asli DayTrack
// (ambil dari DayTrack .env.local NEXT_PUBLIC_SUPABASE_ANON_KEY, atau Settings).
// Anon key adalah public key — aman dipakai di client/extension.
window.DAYTRACK_CONFIG = {
  SUPABASE_URL: "https://ftskhfwlhfbmettbgecp.supabase.co",
  ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0c2toZndsaGZibWV0dGJnZWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4OTQwNjQsImV4cCI6MjEwMDQ3MDA2NH0.W87rtmTyWcvljqGkVGfypRpNQxH8y22Q5HdSgS4wabo",
  // Nama tabel playlist (ex: senang) — sudah di-rename ke 'playlist'
  TABLE: "playlist",
};
