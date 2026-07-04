// content.js — Form Filler MOTORU
// ---------------------------------------------------------------------------
// Bu dosya MANTIĞI tutar. "Ne neye karşılık geliyor" bilgisi mapping.js'te
// (window.__ALAN_HARITASI). Motor, harita üzerinde SIRAYLA gezip her alanı
// tipine göre doldurur. Site arayüzü değişirse mapping.js düzeltilir; burası değil.
//
// popup, window.__formFiller_run(data) fonksiyonunu çağırır.

(function () {
  // --- Ortak yardımcılar -----------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isEmpty = (v) => v === null || v === undefined || v === "";
  const lc = (s) => String(s || "").toLocaleLowerCase("tr");

  // urun.json içinde "satis.barkod" gibi bir yola göre değeri getir.
  function getByPath(obj, path) {
    if (!path) return undefined;
    return String(path).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }

  // Vanilla JS formlarda değer set etmek için native setter + event.
  function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Para/fiyat biçimi: gereksiz ondalık sıfırları at (999.00 -> "999", 999.50 -> "999.5").
  function formatMoney(v) {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(String(v).replace(",", "."));
    if (isNaN(n)) return String(v);
    return String(n);
  }

  // Açıklama metnini <p> etiketli HTML'e çevir.
  function toParagraphs(text) {
    return String(text)
      .split("\n")
      .map((line) => `<p>${line.trim() === "" ? "<br>" : line}</p>`)
      .join("");
  }

  // bl-input: shadow DOM içindeki gerçek <input>/<textarea>'ya yaz.
  function setBlInput(blEl, value) {
    if (!blEl) return false;
    const inner = blEl.shadowRoot?.querySelector("input") ||
                  blEl.shadowRoot?.querySelector("textarea");
    if (!inner) return false;
    setNativeValue(inner, String(value));
    return true;
  }

  // bl-select: shadow .select-input ile aç, metne göre bl-select-option seç.
  async function openAndSelectBlOption(blSelectEl, matchText, log, label) {
    if (isEmpty(matchText)) { log.push(`↷ ${label}: boş, atlandı`); return; }
    if (!blSelectEl) { log.push(`❌ ${label}: bl-select bulunamadı`); return; }
    const trigger = blSelectEl.shadowRoot?.querySelector(".select-input");
    (trigger || blSelectEl).click();
    await sleep(500);
    const options = blSelectEl.querySelectorAll("bl-select-option");
    let picked = null;
    for (const opt of options) {
      if (lc(opt.textContent.trim()).includes(lc(matchText))) { picked = opt; break; }
    }
    if (!picked && options.length) picked = options[0];
    if (picked) {
      const innerOpt = picked.shadowRoot?.firstElementChild ||
                       picked.shadowRoot?.querySelector("li, div");
      (innerOpt || picked).click();
      await sleep(300);
      log.push(`✅ ${label}: ${picked.textContent.trim()}`);
    } else {
      log.push(`❌ ${label}: "${matchText}" seçeneği bulunamadı`);
    }
  }

  // bl-select (arayarak): önce yaz/ara, gelen sonuçtan seç (Marka gibi).
  async function searchAndSelectBl(blSelectEl, value, log, label) {
    if (isEmpty(value)) { log.push(`↷ ${label}: boş, atlandı`); return; }
    if (!blSelectEl) { log.push(`❌ ${label}: bl-select bulunamadı`); return; }
    blSelectEl.shadowRoot?.querySelector(".select-input")?.click();
    await sleep(300);
    const searchInp = blSelectEl.shadowRoot?.querySelector("input");
    if (searchInp) {
      setNativeValue(searchInp, value);
      searchInp.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    }
    await sleep(800); // API sonuçlarını bekle
    const opts = blSelectEl.querySelectorAll("bl-select-option");
    let picked = null;
    for (const opt of opts) {
      if (lc(opt.textContent.trim()).includes(lc(value))) { picked = opt; break; }
    }
    if (!picked && opts.length) picked = opts[0];
    if (picked) {
      (picked.shadowRoot?.firstElementChild || picked).click();
      await sleep(300);
      log.push(`✅ ${label}: ${picked.textContent.trim()}`);
    } else { log.push(`❌ ${label}: seçeneği bulunamadı`); }
  }

  // Trendyol kategori ağacını adım adım tıklayarak gez.
  async function selectCategoryTree(katInputSel, categoryPath, log) {
    const katInput = document.querySelector(katInputSel);
    if (!katInput) { log.push("❌ Kategori: input bulunamadı"); return; }
    katInput.click();
    await sleep(400);
    for (const step of categoryPath) {
      const items = document.querySelectorAll(".dropdown-item.tree-item");
      let target = null;
      for (const item of items) {
        const text = item.querySelector(".tree-item-content")?.textContent?.trim();
        if (text === step) { target = item; break; }
      }
      if (target) {
        target.click();
        await sleep(500);
        log.push(`✅ Kategori adımı: ${step}`);
      } else {
        log.push(`❌ Kategori adımı bulunamadı: "${step}"`);
        return;
      }
    }
  }

  // n11 .dropdownSelectable bileşeni (index ile).
  async function n11FillDropdown(index, searchTerm, matchText, log, label) {
    const dropdowns = document.querySelectorAll(".dropdownSelectable");
    const dd = dropdowns[index];
    if (!dd) { log.push(`❌ ${label}: dropdown (index ${index}) bulunamadı`); return false; }

    const btn = dd.querySelector(".dropdownSelectable-btn") || dd;
    btn.click();
    await sleep(400);

    const search = dd.querySelector("#selectable-search") ||
                   dd.querySelector('input[type="text"]');
    if (search) {
      setNativeValue(search, searchTerm);
      search.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    }
    await sleep(700);

    const wantFull = lc(matchText);
    const wantTerm = lc(searchTerm);
    const items = dd.querySelectorAll(".dropdownSelectable-content-list li, .dropdownSelectable-content-list span");

    let picked = null;
    for (const it of items) {
      const txt = lc((it.textContent || "").trim());
      if (!txt) continue;
      if ((wantFull && txt.includes(wantFull)) || txt.endsWith(wantTerm) || txt.includes(wantTerm)) {
        picked = it; break;
      }
    }
    if (!picked && items.length) picked = items[0];

    if (picked) {
      picked.click();
      log.push(`✅ ${label}: ${picked.textContent.trim()}`);
      return true;
    }
    log.push(`❌ ${label}: "${searchTerm}" için sonuç bulunamadı`);
    return false;
  }

  // ==========================================================================
  //  MOTOR — harita üzerinde sırayla gez, her alanı tipine göre doldur.
  // ==========================================================================
  async function doldur(siteKey, data) {
    const harita = (window.__ALAN_HARITASI || {})[siteKey];
    if (!harita) return `❌ Harita bulunamadı: ${siteKey} (mapping.js yüklü mü?)`;

    const log = [];
    const cells = () => document.querySelectorAll("bl-table-cell");

    for (const [alan, cfg] of Object.entries(harita)) {
      const label = cfg.etiket || alan;
      let deger = getByPath(data, cfg.kaynak);
      if (cfg.para) deger = formatMoney(deger);

      try {
        switch (cfg.tip) {
          // --- Trendyol ---
          case "kategori-agaci":
            if (Array.isArray(deger) && deger.length) {
              await selectCategoryTree(cfg.sec, deger, log);
              await sleep(800); // özellikler bölümünün yüklenmesini bekle
            } else { log.push(`↷ ${label}: boş, atlandı`); }
            break;

          case "bl-input":
            if (isEmpty(deger)) { log.push(`↷ ${label}: boş, atlandı`); break; }
            if (setBlInput(document.querySelector(cfg.sec), String(deger)))
              log.push(`✅ ${label}: ${deger}`);
            else log.push(`❌ ${label}: alan bulunamadı (${cfg.sec})`);
            break;

          case "bl-select":
            await openAndSelectBlOption(document.querySelector(cfg.sec), deger, log, label);
            break;

          case "bl-select-ara":
            await searchAndSelectBl(document.querySelector(cfg.sec), deger, log, label);
            break;

          case "editor": {
            if (isEmpty(deger)) { log.push(`↷ ${label}: boş, atlandı`); break; }
            const editor = document.querySelector(cfg.sec) ||
                           document.querySelector('[contenteditable="true"]');
            if (editor) {
              editor.focus();
              editor.innerHTML = toParagraphs(deger);
              editor.dispatchEvent(new Event("input", { bubbles: true }));
              log.push(`✅ ${label} dolduruldu`);
            } else { log.push(`❌ ${label}: editör bulunamadı (${cfg.sec})`); }
            break;
          }

          case "tablo-bl-input":
            if (isEmpty(deger)) { log.push(`↷ ${label}: boş, atlandı`); break; }
            if (!cells()[cfg.index]) { log.push(`❌ ${label}: hücre yok (${cfg.index})`); break; }
            setBlInput(cells()[cfg.index].querySelector("bl-input"), String(deger));
            log.push(`✅ ${label}: ${deger}`);
            break;

          case "tablo-input": {
            if (isEmpty(deger)) { log.push(`↷ ${label}: boş, atlandı`); break; }
            const inp = cells()[cfg.index]?.querySelector("input");
            if (inp) { setNativeValue(inp, String(deger)); log.push(`✅ ${label}: ${deger}`); }
            else log.push(`❌ ${label}: hücre yok (${cfg.index})`);
            break;
          }

          case "tablo-bl-select":
            await openAndSelectBlOption(cells()[cfg.index]?.querySelector("bl-select"),
              isEmpty(deger) ? "" : String(deger), log, label);
            break;

          // --- n11 ---
          case "input":
            if (isEmpty(deger)) { log.push(`↷ ${label}: boş, atlandı`); break; }
            {
              const el = document.querySelector(cfg.sec);
              if (el) { setNativeValue(el, String(deger)); log.push(`✅ ${label}: ${deger}`); }
              else log.push(`❌ ${label}: alan bulunamadı (${cfg.sec})`);
            }
            break;

          case "select-value": {
            if (isEmpty(deger)) { log.push(`↷ ${label}: boş, atlandı`); break; }
            const sel = document.querySelector(cfg.sec);
            if (sel) {
              sel.value = String(deger);
              sel.dispatchEvent(new Event("change", { bubbles: true }));
              log.push(`✅ ${label}: ${deger}`);
            } else { log.push(`❌ ${label}: select bulunamadı (${cfg.sec})`); }
            break;
          }

          case "n11-dropdown": {
            if (isEmpty(deger)) { log.push(`↷ ${label}: boş, atlandı`); break; }
            const arama = String(deger);
            const eslesmeYol = cfg.eslesme ? getByPath(data, cfg.eslesme) : "";
            const eslesme = eslesmeYol || arama;
            await n11FillDropdown(cfg.index, arama, eslesme, log, label);
            await sleep(cfg.index === 0 ? 1000 : 400); // kategori sonrası biraz daha bekle
            break;
          }

          case "n11-stok": {
            // n11 stok alanı: id "stock-" ile başlar ama "stockCode-" hariç.
            if (isEmpty(deger)) { log.push(`↷ ${label}: boş, atlandı`); break; }
            const els = document.querySelectorAll('[id^="stock-"]');
            let stokEl = null;
            for (const e of els) if (!e.id.startsWith("stockCode-")) { stokEl = e; break; }
            if (stokEl) { setNativeValue(stokEl, String(deger)); log.push(`✅ ${label}: ${deger}`); }
            else log.push(`❌ ${label}: stok alanı bulunamadı`);
            break;
          }

          case "jodit": {
            if (isEmpty(deger)) { log.push(`↷ ${label}: boş, atlandı`); break; }
            const joditIframe = document.querySelector(cfg.sec);
            if (joditIframe) {
              const iDoc = joditIframe.contentDocument || joditIframe.contentWindow?.document;
              const iBody = iDoc?.body;
              if (iBody) {
                iBody.focus();
                iBody.innerHTML = toParagraphs(deger);
                iBody.dispatchEvent(new Event("input", { bubbles: true }));
                log.push(`✅ ${label} dolduruldu (Jodit)`);
              } else { log.push(`❌ ${label}: Jodit iframe body bulunamadı`); }
            } else { log.push(`❌ ${label}: Jodit iframe bulunamadı`); }
            break;
          }

          default:
            log.push(`⚠️ ${label}: bilinmeyen tip "${cfg.tip}"`);
        }
      } catch (err) {
        log.push(`❌ ${label}: hata — ${err.message}`);
      }
    }

    log.push(`— ${siteKey} tamamlandı.`);
    return log.join("\n");
  }

  // ==========================================================================
  //  Site yönlendirme — DAİMA URL'den çözülür.
  // ==========================================================================
  function detectSiteFromUrl() {
    if (/^https:\/\/partner\.trendyol\.com\//.test(location.href)) return "trendyol";
    if (/^https:\/\/so\.n11\.com\//.test(location.href)) return "n11";
    return null;
  }

  window.__formFiller_run = async function (data /*, site (yok sayılır) */) {
    const key = detectSiteFromUrl();
    if (!key) return `❌ Desteklenmeyen sayfa: ${location.hostname}`;
    try {
      return await doldur(key, data);
    } catch (err) {
      return `❌ Doldurma sırasında hata: ${err.message}`;
    }
  };
})();
