// popup.js — Form Filler
// Site JSON'da TUTULMAZ; her zaman aktif sekmenin URL'inden tespit edilir.
// Yeni site eklemek icin SITE_PATTERNS'e bir satir ekleyin.
const SITE_PATTERNS = [
  { site: "n11", match: /^https:\/\/so\.n11\.com\// },
  { site: "trendyol", match: /^https:\/\/partner\.trendyol\.com\// }
];

const jsonInput = document.getElementById("jsonInput");
const statusEl = document.getElementById("status");
const siteBadge = document.getElementById("siteBadge");
const fileInput = document.getElementById("fileInput");

// Ekrandaki tum log satirlarinin ham metnini tutar (kopyala/indir icin).
let logLines = [];

// --- Durum / log alani -----------------------------------------------------
function clearStatus() {
  statusEl.innerHTML = "";
  logLines = [];
}
function log(line, type = "info") {
  const div = document.createElement("div");
  div.className = "log-" + type;
  div.textContent = line;
  statusEl.appendChild(div);
  statusEl.scrollTop = statusEl.scrollHeight;
  logLines.push(line);
}

// --- Aktif sekmeden siteyi tespit et ---------------------------------------
function detectSite(url) {
  if (!url) return null;
  for (const p of SITE_PATTERNS) {
    if (p.match.test(url)) return p.site;
  }
  return null;
}

async function refreshSiteBadge() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const site = detectSite(tab?.url);
  siteBadge.classList.remove("unknown", "site-n11", "site-trendyol");
  if (site) {
    siteBadge.textContent = site;
    siteBadge.classList.add("site-" + site);
  } else {
    siteBadge.textContent = "?";
    siteBadge.classList.add("unknown");
  }
  return { tab, site };
}
refreshSiteBadge();

// --- Kalici log gecmisi (chrome.storage.local) -----------------------------
// Her calisma "ff_logs" altinda zaman damgasiyla saklanir; son 50 kayit tutulur.
async function saveLog(site, lines) {
  const entry = {
    ts: new Date().toISOString(),
    site: site || "?",
    url: (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.url || "",
    lines
  };
  const { ff_logs = [] } = await chrome.storage.local.get("ff_logs");
  ff_logs.unshift(entry);
  await chrome.storage.local.set({ ff_logs: ff_logs.slice(0, 50) });
}

// Tum gecmisi tek metne cevirir (indirilecek log dosyasi icerigi).
async function buildLogFile() {
  const { ff_logs = [] } = await chrome.storage.local.get("ff_logs");
  const blocks = ff_logs.map((e) => {
    const head = `===== ${e.ts} | site: ${e.site} =====\n${e.url}`;
    return head + "\n" + e.lines.join("\n");
  });
  return "FORM FILLER LOG\nUretim: " + new Date().toISOString() + "\n\n" +
    (blocks.length ? blocks.join("\n\n") : "(kayit yok)") + "\n";
}

// --- Dosya acma ------------------------------------------------------------
document.getElementById("openBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    jsonInput.value = reader.result;
    clearStatus();
    log("📂 Dosya yuklendi: " + file.name, "info");
  };
  reader.onerror = () => log("❌ Dosya okunamadi.", "err");
  reader.readAsText(file);
  fileInput.value = "";
});

// --- Temizle ---------------------------------------------------------------
document.getElementById("clearBtn").addEventListener("click", () => {
  jsonInput.value = "";
  clearStatus();
  log("Temizlendi.", "info");
});

// --- Log kopyala -----------------------------------------------------------
document.getElementById("copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(logLines.join("\n"));
    const btn = document.getElementById("copyBtn");
    const old = btn.textContent;
    btn.textContent = "✅ Kopyalandi";
    setTimeout(() => (btn.textContent = old), 1200);
  } catch (err) {
    log("❌ Kopyalanamadi: " + err.message, "err");
  }
});

// --- Log dosyasi indir (tum gecmis) ----------------------------------------
document.getElementById("dlBtn").addEventListener("click", async () => {
  const text = await buildLogFile();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.download = "form-filler-log-" + stamp + ".txt";
  a.click();
  URL.revokeObjectURL(a.href);
});

// --- Formu Doldur ----------------------------------------------------------
document.getElementById("fillBtn").addEventListener("click", async () => {
  clearStatus();

  // 1) JSON parse
  let data;
  try {
    data = JSON.parse(jsonInput.value);
  } catch (err) {
    log("❌ Gecersiz JSON: " + err.message, "err");
    await saveLog("?", logLines);
    return;
  }

  // 2) Aktif sekme + site tespiti (yalnizca URL'den)
  const { tab, site } = await refreshSiteBadge();
  if (!tab?.id) {
    log("❌ Aktif sekme bulunamadi.", "err");
    await saveLog("?", logLines);
    return;
  }
  if (!site) {
    log("❌ Desteklenmeyen sayfa. n11 veya Trendyol urun ekleme sayfasinda olun.", "err");
    await saveLog("?", logLines);
    return;
  }

  log("▶ Form dolduruluyor (" + site + ")...", "info");

  // 3) Icerik betigindeki fillForm cagrilir — site URL'den gelen degerdir
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (payload, siteName) => window.__formFiller_run(payload, siteName),
      args: [data, site]
    });
    const lines = (result?.result || "").split("\n").filter(Boolean);
    if (!lines.length) {
      log("⚠ Icerik betiginden yanit alinamadi. Sayfayi yenileyip tekrar deneyin.", "err");
    } else {
      for (const ln of lines) {
        const t = ln.startsWith("✅") ? "ok" : ln.startsWith("❌") ? "err" : "info";
        log(ln, t);
      }
    }
  } catch (err) {
    log("❌ Calistirma hatasi: " + err.message, "err");
  }

  await saveLog(site, logLines);
});
