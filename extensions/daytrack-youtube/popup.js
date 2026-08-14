// popup.js — login Supabase + simpan video terpilih ke tabel playlist DayTrack
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DAYTRACK_CONFIG } from "./config.js";

const { SUPABASE_URL, ANON_KEY, TABLE } = window.DAYTRACK_CONFIG;
const sb = createClient(SUPABASE_URL, ANON_KEY);

const $ = (id) => document.getElementById(id);
const statusEl = $("status");

function setStatus(msg, isErr = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isErr ? "#c00" : "#1a73e8";
}

async function refreshUI() {
  const { items = [] } = await chrome.storage.local.get("items");
  const list = $("list");
  list.innerHTML = "";
  if (items.length === 0) {
    list.innerHTML = '<p class="muted">Belum ada video dicentang.</p>';
  } else {
    items.forEach((it) => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<a href="${it.url}" target="_blank" rel="noopener">${it.title || it.url}</a>`;
      list.appendChild(div);
    });
  }
  // cek session
  const { data } = await sb.auth.getUser();
  if (data.user) {
    setStatus("Login: " + (data.user.email || data.user.id));
    $("save").disabled = false;
  } else {
    setStatus("Belum login — masukkan email lalu klik Login.");
    $("save").disabled = true;
  }
}

$("login").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) return setStatus("Isi email dulu.", true);
  setStatus("Mengirim magic link...");
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: "https://www.youtube.com" } });
  if (error) return setStatus("Gagal: " + error.message, true);
  setStatus("Cek email kamu, klik link magic-nya. Lalu buka extension lagi.");
});

$("save").addEventListener("click", async () => {
  const { items = [] } = await chrome.storage.local.get("items");
  if (items.length === 0) return setStatus("Tidak ada video.", true);
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return setStatus("Login dulu.", true);
  setStatus(`Menyimpan ${items.length} video...`);
  let ok = 0;
  for (const it of items) {
    const { error } = await sb.from(TABLE).insert({
      user_id: auth.user.id,
      tanggal: new Date().toISOString().slice(0, 10),
      hari: "",
      kesenangan: it.title || it.url,
      status: "belum",
    });
    if (!error) ok++;
  }
  setStatus(`Berhasil simpan ${ok}/${items.length} ke Playlist.`);
  await chrome.storage.local.set({ items: [] });
  refreshUI();
});

$("clear").addEventListener("click", async () => {
  await chrome.storage.local.set({ items: [] });
  refreshUI();
  setStatus("Dibersihkan.");
});

// Cek session saat popup dibuka (magic link bisa auto-confirm kalau sudah login sebelumnya)
sb.auth.getSession().then(({ data }) => {
  if (data.session) refreshUI();
  else refreshUI();
});
refreshUI();
