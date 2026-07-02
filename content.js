// content.js — Form Filler
// so.n11.com ve partner.trendyol.com uzerinde document_idle'da enjekte edilir.
// popup, window.__formFiller_run(data, site) fonksiyonunu cagirir.

(function () {
  // --- Ortak yardimcilar -----------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isEmpty = (v) => v === null || v === undefined || v === "";
  const lc = (s) => String(s || "").toLocaleLowerCase("tr");

  // Vanilla JS formlarda deger set etmek icin native setter + event.
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

  // Aciklama metnini <p> etiketli HTML'e cevir.
  function toParagraphs(text) {
    return String(text)
      .split("\n")
      .map((line) => `<p>${line.trim() === "" ? "<br>" : line}</p>`)
      .join("");
  }

  // ==========================================================================
  //  n11 (custom .dropdownSelectable bilesenleri)
  // ==========================================================================
  async function n11FillDropdown(dropdowns, index, searchTerm, matchText, log, label) {
    const dd = dropdowns[index];
    if (!dd) { log.push(`❌ ${label}: dropdown (index ${index}) bulunamadi`); return false; }

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
    log.push(`❌ ${label}: "${searchTerm}" icin sonuc bulunamadi`);
    return false;
  }

  function fillInput(selector, value, log, label, root = document) {
    if (isEmpty(value)) { log.push(`↷ ${label}: bos, atlandi`); return; }
    const el = typeof selector === "function" ? selector(root) : root.querySelector(selector);
    if (!el) { log.push(`❌ ${label}: alan bulunamadi`); return; }
    setNativeValue(el, String(value));
    log.push(`✅ ${label}: ${value}`);
  }

  async function fillFormN11(data) {
    const log = [];
    const satis = data.satis || {};
    const ozellik = data.ozellikler || {};
    const getDropdowns = () => document.querySelectorAll(".dropdownSelectable");

    // Kategori arama terimi: n11 bloku > kategori yolunun son segmenti
    const lastSegment = data.n11?.kategori_arama_terimi ||
      (data.kategori ? String(data.kategori).split(">").pop().trim() : "");

    // 1) Urun Adi (= baslik)
    fillInput("#productName", data.urun_adi, log, "Urun Adi");

    // 2) Kategori (index 0)
    if (!isEmpty(lastSegment)) {
      await n11FillDropdown(getDropdowns(), 0, lastSegment, data.kategori, log, "Kategori");
      await sleep(1000);
    } else { log.push("↷ Kategori: bos, atlandi"); }

    // 3) Marka (index 1)
    if (!isEmpty(data.marka)) {
      await n11FillDropdown(getDropdowns(), 1, data.marka, data.marka, log, "Marka");
      await sleep(500);
    } else { log.push("↷ Marka: bos, atlandi"); }

    // 4) Uyumlu Marka (index 2)
    if (!isEmpty(ozellik.uyumlu_marka)) {
      await n11FillDropdown(getDropdowns(), 2, ozellik.uyumlu_marka, ozellik.uyumlu_marka, log, "Uyumlu Marka");
      await sleep(400);
    } else { log.push("↷ Uyumlu Marka: bos, atlandi"); }

    // 5) Pil Gucu (index 3)
    if (!isEmpty(ozellik.pil_gucu)) {
      await n11FillDropdown(getDropdowns(), 3, ozellik.pil_gucu, ozellik.pil_gucu, log, "Pil Gucu");
      await sleep(400);
    } else { log.push("↷ Pil Gucu: bos, atlandi"); }

    // 6) Secenek (index 4)
    if (!isEmpty(ozellik.secenek)) {
      await n11FillDropdown(getDropdowns(), 4, ozellik.secenek, ozellik.secenek, log, "Secenek");
      await sleep(400);
    } else { log.push("↷ Secenek: bos, atlandi"); }

    // 7-12) Input alanlari
    fillInput('[id^="gtin-"]', satis.barkod, log, "Barkod");
    fillInput('[id^="stockCode-"]', satis.stok_kodu, log, "Stok Kodu");
    fillInput('[id^="listPrice-"]', satis.piyasa_fiyati, log, "Piyasa Fiyati");
    fillInput('[id^="salePrice-"]', satis.satis_fiyati, log, "n11 Fiyati");
    fillInput((root) => {
      const els = root.querySelectorAll('[id^="stock-"]');
      for (const e of els) if (!e.id.startsWith("stockCode-")) return e;
      return null;
    }, satis.stok_adet, log, "Stok Adet");
    fillInput('[id^="duration-"]', satis.hazirlik_suresi, log, "Hazirlik Suresi");

    // 13) KDV Orani (select)
    if (!isEmpty(satis.kdv_orani)) {
      const sel = document.querySelector("select.operations-input");
      if (sel) {
        sel.value = String(satis.kdv_orani);
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        log.push("✅ KDV Orani: " + satis.kdv_orani);
      } else { log.push("❌ KDV Orani: select bulunamadi"); }
    } else { log.push("↷ KDV Orani: bos, atlandi"); }

    // 14) Aciklama (contenteditable)
    if (!isEmpty(data.aciklama)) {
      const editor = document.querySelector(".ql-editor") ||
                     document.querySelector('[contenteditable="true"]');
      if (editor) {
        editor.innerHTML = toParagraphs(data.aciklama);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        log.push("✅ Aciklama dolduruldu");
      } else { log.push("❌ Aciklama: editor bulunamadi"); }
    } else { log.push("↷ Aciklama: bos, atlandi"); }

    log.push("— n11 tamamlandi. 'Onaya Gonder' butonuna basilmadi.");
    return log.join("\n");
  }

  // ==========================================================================
  //  Trendyol (Baklava Web Components: <bl-input>, <bl-select>, ...)
  // ==========================================================================
  const getBlInput = (label) => document.querySelector(`bl-input[label="${label}"]`);
  const getBlSelect = (label) => document.querySelector(`bl-select[label="${label}"]`);

  function setBlInput(blEl, value) {
    if (!blEl) return false;
    const inner = blEl.shadowRoot?.querySelector("input") ||
                  blEl.shadowRoot?.querySelector("textarea");
    if (inner) setNativeValue(inner, value);
    try { blEl.value = value; } catch (_) {}
    blEl.dispatchEvent(new CustomEvent("bl-input", { bubbles: true, detail: value }));
    blEl.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  async function setBlSelect(blSelectEl, matchText, log, label) {
    if (!blSelectEl) { log.push(`❌ ${label}: bl-select bulunamadi`); return false; }
    blSelectEl.click();
    await sleep(400);
    const options = blSelectEl.querySelectorAll("bl-select-option");
    let picked = null;
    for (const opt of options) {
      if (lc(opt.textContent).includes(lc(matchText))) { picked = opt; break; }
    }
    if (!picked && options.length) picked = options[0];
    if (picked) { picked.click(); log.push(`✅ ${label}: ${picked.textContent.trim()}`); }
    else log.push(`❌ ${label}: "${matchText}" bulunamadi`);
    await sleep(300);
    return !!picked;
  }

  function fillBlInputByLabel(label, value, log) {
    if (isEmpty(value)) { log.push(`↷ ${label}: bos, atlandi`); return; }
    const el = getBlInput(label);
    if (!el) { log.push(`❌ ${label}: alan bulunamadi`); return; }
    setBlInput(el, String(value));
    log.push(`✅ ${label}: ${value}`);
  }

  async function fillBlSelectByLabel(label, value, log) {
    if (isEmpty(value)) { log.push(`↷ ${label}: bos, atlandi`); return; }
    await setBlSelect(getBlSelect(label), value, log, label);
  }

  // Satis tablosu: kolon indeksine gore hucre bul.
  function tyTableCell(colIndex) {
    const row = document.querySelector("bl-table-row");
    if (!row) return null;
    const cells = row.querySelectorAll("bl-table-cell");
    return cells[colIndex] || null;
  }

  async function fillFormTrendyol(data) {
    const log = [];
    const satis = data.satis || {};
    const ty = data.trendyol || {};

    // 1) Urun Adi
    fillBlInputByLabel("Ürün Adı", data.urun_adi, log);
    // 2) Model Kodu
    fillBlInputByLabel("Model Kodu", ty.model_kodu, log);

    // 3) Kategori (yaz -> oneri sec)
    if (!isEmpty(ty.kategori_arama_terimi || data.kategori)) {
      const term = ty.kategori_arama_terimi || String(data.kategori).split(">").pop().trim();
      const catEl = getBlInput("Kategori");
      if (catEl) {
        setBlInput(catEl, term);
        await sleep(800);
        const sugg = document.querySelector(
          '.ty-multi-level-category-select__item, [class*="category"] [class*="item"]'
        );
        if (sugg) { sugg.click(); log.push(`✅ Kategori: ${sugg.textContent.trim()}`); }
        else log.push(`❌ Kategori: "${term}" icin oneri bulunamadi`);
        await sleep(600);
      } else { log.push("❌ Kategori: alan bulunamadi"); }
    } else { log.push("↷ Kategori: bos, atlandi"); }

    // 4) Marka
    await fillBlSelectByLabel("Ürün Markası", data.marka, log);

    // 5) Aciklama (contenteditable)
    if (!isEmpty(data.aciklama)) {
      const editor = document.querySelector(".description-editor [contenteditable='true']") ||
                     document.querySelector('[contenteditable="true"]');
      if (editor) {
        editor.innerHTML = toParagraphs(data.aciklama);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        log.push("✅ Aciklama dolduruldu");
      } else { log.push("❌ Aciklama: editor bulunamadi"); }
    } else { log.push("↷ Aciklama: bos, atlandi"); }

    // 6) Satis tablosu (kolon indeksleri)
    // [Gorsel=0, Barkod=1, Satis Fiyati=2, Stok=3, KDV=4, OTV=5, Stok Kodu=6, Parti/Lot=7]
    const setCellBl = (col, value, label) => {
      if (isEmpty(value)) { log.push(`↷ ${label}: bos, atlandi`); return; }
      const cell = tyTableCell(col);
      const bl = cell?.querySelector("bl-input");
      if (bl) { setBlInput(bl, String(value)); log.push(`✅ ${label}: ${value}`); }
      else log.push(`❌ ${label}: hucre bulunamadi (kolon ${col})`);
    };
    const setCellNative = (col, value, label) => {
      if (isEmpty(value)) { log.push(`↷ ${label}: bos, atlandi`); return; }
      const cell = tyTableCell(col);
      const inp = cell?.querySelector('input[type="text"], input');
      if (inp) { setNativeValue(inp, String(value)); log.push(`✅ ${label}: ${value}`); }
      else log.push(`❌ ${label}: hucre bulunamadi (kolon ${col})`);
    };

    setCellBl(1, satis.barkod, "Barkod");
    setCellNative(2, satis.satis_fiyati, "Trendyol Satis Fiyati");
    setCellNative(3, satis.stok_adet, "Stok");
    if (!isEmpty(satis.kdv_orani)) {
      const cell = tyTableCell(4);
      await setBlSelect(cell?.querySelector("bl-select"), String(satis.kdv_orani), log, "KDV");
    } else { log.push("↷ KDV: bos, atlandi"); }
    setCellBl(6, satis.stok_kodu, "Stok Kodu");
    setCellBl(7, satis.parti_kodu, "Parti/Lot/SKT");

    // 7-12) Ozellik dropdown'lari
    await fillBlSelectByLabel("Menşei", ty.mensei, log);
    await fillBlSelectByLabel("Garanti Süresi", ty.garanti_suresi, log);
    await fillBlSelectByLabel("Pil Gücü (mAh)", ty.pil_gucu_mah, log);
    await fillBlSelectByLabel("Uyumlu Marka", ty.uyumlu_marka, log);
    await fillBlSelectByLabel("Garanti Tipi", ty.garanti_tipi, log);
    await fillBlSelectByLabel("Tamir Edilebilirlik", ty.tamir_edilebilirlik, log);

    log.push("— Trendyol tamamlandi. Kaydet/Onayla butonuna basilmadi.");
    return log.join("\n");
  }

  // ==========================================================================
  //  Site yonlendirme
  // ==========================================================================
  const FILLERS = {
    n11: fillFormN11,
    trendyol: fillFormTrendyol
  };

  window.__formFiller_run = async function (data, site) {
    let key = lc(site || data.site);
    if (key === "auto" || !key) {
      // "auto" -> URL'den tespit
      if (/partner\.trendyol\.com/.test(location.href)) key = "trendyol";
      else if (/so\.n11\.com/.test(location.href)) key = "n11";
    }
    const filler = FILLERS[key];
    if (!filler) return `❌ Desteklenmeyen site: ${key || "(bilinmiyor)"}`;
    try {
      return await filler(data);
    } catch (err) {
      return `❌ Doldurma sirasinda hata: ${err.message}`;
    }
  };
})();
