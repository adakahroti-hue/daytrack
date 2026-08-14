// background.js — tangkap magic-link token dari YouTube hash lalu set session
// MV3 service worker: pakai global supabase dari vendor (di-load lewat importScripts)
self.importScripts("vendor/supabase.min.js", "config.js");

const cfg = self.DAYTRACK_CONFIG;
const sb = self.supabase.createClient(cfg.SUPABASE_URL, cfg.ANON_KEY);

function extractToken(hash) {
  if (!hash || !hash.includes("access_token")) return null;
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const access = p.get("access_token");
  const refresh = p.get("refresh_token");
  const expiresIn = p.get("expires_in");
  if (!access) return null;
  return { access_token: access, refresh_token: refresh, expires_in: expiresIn ? Number(expiresIn) : 3600 };
}

async function handleYoutubeTab(tabId, url) {
  try {
    const u = new URL(url);
    if (u.hostname !== "www.youtube.com" && u.hostname !== "youtube.com") return;
    if (!u.hash.includes("access_token")) return;
    const sess = extractToken(u.hash);
    if (!sess) return;
    await sb.auth.setSession(sess);
    // bersihkan hash biar YouTube load normal
    chrome.tabs.update(tabId, { url: "https://www.youtube.com" });
  } catch (e) {
    console.error("daytrack ext:", e);
  }
}

if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && changeInfo.url.includes("access_token")) {
      handleYoutubeTab(tabId, changeInfo.url);
    }
  });
}
