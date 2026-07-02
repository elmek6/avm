// popup.js — Form Filler
// Bilinen site kaliplari. Yeni site eklemek icin buraya ekleyin.
const SITE_PATTERNS = [
  { site: "n11", match: /^https:\/\/so\.n11\.com\// }
];

const jsonInput = document.getElementById("jsonInput");
const statusEl = document.getElementById("status");
const siteBadge = document.getElementById("siteBadge");
const fileInput = document.getElementById("fileInput");

// --- Durum / log alani ---
function clearStatus() {
  statusEl.innerHTML = "";
}
function log(line, type = "info") {
  const div = document.createElement("div");
  div.className = "log-" + type;
  div.textContent = line;
  statusEl.appendChild(div);
}

// --- Aktif sekmeden siteyi tespit et ---
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
  if (site) {
    siteBadge.textContent = site;
    siteBadge.classList.remove("unknown");
  } else {
    siteBadge.textContent = "?";
    siteBadge.classList.add("unknown");
  }
  return { tab, site };
}
refreshSiteBadge();

// --- Dosya acma ---
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
  fileInput.value = ""; // ayni dosya tekrar secilebilsin
});

// --- Temizle ---
document.getElementById("clearBtn").addEventListener("click", () => {
  jsonInput.value = "";
  clearStatus();
  log("Temizlendi.", "info");
});

// --- Formu Doldur ---
document.getElementById("fillBtn").addEventListener("click", async () => {
  clearStatus();

  // 1) JSON parse
  let data;
  try {
    data = JSON.parse(jsonInput.value);
  } catch (err) {
    log("❌ Gecersiz JSON: " + err.message, "err");
    return;
  }

  // 2) Aktif sekme + site kontrolu
  const { tab, site } = await refreshSiteBadge();
  if (!tab?.id) {
    log("❌ Aktif sekme bulunamadi.", "err");
    return;
  }
  const targetSite = data.site || site;
  if (!site) {
    log("❌ Bu site desteklenmiyor. n11 satici paneli sayfasinda olun.", "err");
    return;
  }
  if (data.site && data.site !== site) {
    log(`⚠ JSON site="${data.site}" fakat sekme "${site}". Sekmeye gore devam ediliyor.`, "info");
  }

  log("▶ Form dolduruluyor (" + site + ")...", "info");

  // 3) Icerik betigindeki fillForm cagrilir
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (payload, siteName) => window.__formFiller_run(payload, siteName),
      args: [data, site]
    });
    const lines = (result?.result || "").split("\n").filter(Boolean);
    if (!lines.length) {
      log("⚠ Icerik betiginden yanit alinamadi. Sayfayi yenileyip tekrar deneyin.", "err");
      return;
    }
    for (const ln of lines) {
      const t = ln.startsWith("✅") ? "ok" : ln.startsWith("❌") ? "err" : "info";
      log(ln, t);
    }
  } catch (err) {
    log("❌ Calistirma hatasi: " + err.message, "err");
  }
});
