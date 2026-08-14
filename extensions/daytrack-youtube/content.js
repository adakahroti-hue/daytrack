// content.js — inject checkbox "Tambah ke DayTrack" di tiap video YouTube
const CHECKED_ATTR = "data-daytrack-checked";

function getVideoInfo(el) {
  // Coba ambil dari elemen video (watch page, search, home)
  let title = "";
  let url = "";
  const link = el.querySelector("a#video-title, a#title, a.yt-simple-endpoint#video-title, a[title]");
  if (link) {
    title = link.getAttribute("title") || link.textContent?.trim() || "";
    url = link.href || "";
  }
  // Watch page: ambil dari title dokumen / ytInitialData
  if (!url && location.pathname === "/watch") {
    const wt = document.querySelector("h1.title, h1.ytd-watch-metadata");
    title = wt?.textContent?.trim() || document.title.replace(" - YouTube", "");
    url = location.href;
  }
  if (!url) return null;
  // hanya youtube watch url
  const u = new URL(url);
  if (!u.searchParams.get("v")) return null;
  return { videoId: u.searchParams.get("v"), url, title };
}

function injectCheckboxes() {
  // Selector umum untuk tiap kartu video
  const cards = document.querySelectorAll("ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer");
  cards.forEach((card) => {
    if (card.querySelector(".daytrack-check")) return;
    const info = getVideoInfo(card);
    if (!info) return;

    const wrap = document.createElement("div");
    wrap.className = "daytrack-check";
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px;margin-top:4px;font-size:12px;color:#1a73e8;cursor:pointer;";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.style.cssText = "cursor:pointer;";

    const label = document.createElement("span");
    label.textContent = "DayTrack";

    wrap.appendChild(cb);
    wrap.appendChild(label);

    cb.addEventListener("change", async () => {
      const { items = [] } = await chrome.storage.local.get("items");
      if (cb.checked) {
        if (!items.find((i) => i.videoId === info.videoId)) {
          items.push(info);
          await chrome.storage.local.set({ items });
        }
      } else {
        const filtered = items.filter((i) => i.videoId !== info.videoId);
        await chrome.storage.local.set({ items: filtered });
      }
    });

    // taruh di bawah metadata video
    const meta = card.querySelector("#meta, #details, .details");
    if (meta) meta.appendChild(wrap);
    else card.appendChild(wrap);
  });
}

// Watch page: inject satu checkbox besar di bawah judul
function injectWatchPage() {
  if (document.querySelector(".daytrack-watch-check")) return;
  const info = getVideoInfo(document);
  if (!info) return;
  const titleEl = document.querySelector("h1.title, h1.ytd-watch-metadata");
  if (!titleEl) return;
  const wrap = document.createElement("div");
  wrap.className = "daytrack-watch-check";
  wrap.style.cssText = "display:inline-flex;align-items:center;gap:6px;margin:8px 0;font-size:13px;color:#1a73e8;cursor:pointer;";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.style.cssText = "cursor:pointer;width:16px;height:16px;";
  const label = document.createElement("span");
  label.textContent = "Tambah ke Playlist DayTrack";
  wrap.appendChild(cb);
  wrap.appendChild(label);
  cb.addEventListener("change", async () => {
    const { items = [] } = await chrome.storage.local.get("items");
    if (cb.checked) {
      if (!items.find((i) => i.videoId === info.videoId)) {
        items.push(info);
        await chrome.storage.local.set({ items });
      }
    } else {
      await chrome.storage.local.set({ items: items.filter((i) => i.videoId !== info.videoId) });
    }
  });
  titleEl.parentElement?.insertBefore(wrap, titleEl.nextSibling);
}

// Observe perubahan halaman (SPA YouTube)
const observer = new MutationObserver(() => {
  injectCheckboxes();
  if (location.pathname === "/watch") injectWatchPage();
});
observer.observe(document.body, { childList: true, subtree: true });

injectCheckboxes();
if (location.pathname === "/watch") injectWatchPage();
