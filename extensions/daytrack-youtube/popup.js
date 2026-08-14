// popup.js — classic script (no ESM). Supabase global dari vendor/supabase.min.js
(function () {
  const cfg = window.DAYTRACK_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.ANON_KEY);
  const $ = (id) => document.getElementById(id);
  const statusEl = $("status");

  function setStatus(msg, isErr) {
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
        const a = document.createElement("a");
        a.href = it.url; a.target = "_blank"; a.rel = "noopener";
        a.textContent = it.title || it.url;
        div.appendChild(a);
        list.appendChild(div);
      });
    }
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
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: chrome.runtime.getURL("callback.html") },
    });
    if (error) return setStatus("Gagal: " + error.message, true);
    setStatus("Cek email kamu, klik link magic-nya. Lalu buka extension lagi.");
  });

  $("save").addEventListener("click", async () => {
    const { items = [] } = await chrome.storage.local.get("items");
    if (items.length === 0) return setStatus("Tidak ada video.", true);
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return setStatus("Login dulu.", true);
    setStatus("Menyimpan " + items.length + " video...");
    let ok = 0;
    for (const it of items) {
      const { error } = await sb.from(cfg.TABLE).insert({
        user_id: auth.user.id,
        tanggal: new Date().toISOString().slice(0, 10),
        hari: "",
        kesenangan: it.title || it.url,
        status: "belum",
      });
      if (!error) ok++;
    }
    setStatus("Berhasil simpan " + ok + "/" + items.length + " ke Playlist.");
    await chrome.storage.local.set({ items: [] });
    refreshUI();
  });

  $("clear").addEventListener("click", async () => {
    await chrome.storage.local.set({ items: [] });
    refreshUI();
    setStatus("Dibersihkan.");
  });

  // auto-refresh session saat popup dibuka
  sb.auth.getSession().then(({ data }) => {
    if (data.session) refreshUI();
    else refreshUI();
  });
  refreshUI();
})();
