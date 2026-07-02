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

  // Para/fiyat bicimi: gereksiz ondalik sifirlari at (999.00 -> "999", 999.50 -> "999.5").
  // Sitelerin fiyat alani sondaki sifirlari yanlis yorumladigi icin tam sayida ondalik yazilmaz.
  function formatMoney(v) {
    if (v === null || v === undefined || v === "") return "";
    const n = Number(String(v).replace(",", "."));
    if (isNaN(n)) return String(v);
    return String(n); // JS Number sondaki sifirlari zaten atar: 999.00 -> 999
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

    // n11 kategori: n11.kategori_arama (arama terimi) + n11.kategori_yolu (tam yol, eslesme icin)
    const n11 = data.n11 || {};
    const katYolu = n11.kategori_yolu || "";
    const katArama = n11.kategori_arama ||
      (katYolu ? String(katYolu).split(">").pop().trim() : "");

    // 1) Urun Adi (= baslik)
    fillInput("#productName", data.urun_adi, log, "Urun Adi");

    // 2) Kategori (index 0)
    if (!isEmpty(katArama)) {
      await n11FillDropdown(getDropdowns(), 0, katArama, katYolu, log, "Kategori");
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

    // 6) Secenek (index 4) — n11 blogunda
    if (!isEmpty(n11.secenek)) {
      await n11FillDropdown(getDropdowns(), 4, n11.secenek, n11.secenek, log, "Secenek");
      await sleep(400);
    } else { log.push("↷ Secenek: bos, atlandi"); }

    // 7-12) Input alanlari
    fillInput('[id^="gtin-"]', satis.barkod, log, "Barkod");
    fillInput('[id^="stockCode-"]', satis.stok_kodu, log, "Stok Kodu");
    fillInput('[id^="listPrice-"]', formatMoney(satis.piyasa_fiyati), log, "Piyasa Fiyati");
    fillInput('[id^="salePrice-"]', formatMoney(satis.satis_fiyati), log, "n11 Fiyati");
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

    // 14) Aciklama — n11 editoru Jodit'tir, <iframe class="jodit-wysiwyg_iframe"> icindedir.
    if (!isEmpty(data.aciklama)) {
      const joditIframe = document.querySelector(".jodit-wysiwyg_iframe");
      if (joditIframe) {
        const iDoc = joditIframe.contentDocument || joditIframe.contentWindow?.document;
        const iBody = iDoc?.body; // contentEditable="true", class="jodit-wysiwyg"
        if (iBody) {
          iBody.focus();
          iBody.innerHTML = toParagraphs(data.aciklama);
          iBody.dispatchEvent(new Event("input", { bubbles: true }));
          log.push("✅ Aciklama dolduruldu (Jodit iframe)");
        } else { log.push("❌ Aciklama: Jodit iframe body bulunamadi"); }
      } else { log.push("❌ Aciklama: jodit-wysiwyg_iframe bulunamadi"); }
    } else { log.push("↷ Aciklama: bos, atlandi"); }

    log.push("— n11 tamamlandi.");
    return log.join("\n");
  }

  // ==========================================================================
  //  Trendyol (Baklava Web Components: <bl-input>, <bl-select>, ...)
  // ==========================================================================
  // Placeholder'a gore bl-input / bl-select bul.
  const getBlInp = (ph) => Array.from(document.querySelectorAll("bl-input"))
    .find((el) => (el.getAttribute("placeholder") || "").includes(ph));
  const getBlSel = (ph) => Array.from(document.querySelectorAll("bl-select"))
    .find((el) => (el.getAttribute("placeholder") || "").includes(ph));

  // bl-input: shadow DOM icindeki gercek <input>'a yaz.
  function setBlInput(blEl, value) {
    if (!blEl) return false;
    const inner = blEl.shadowRoot?.querySelector("input") ||
                  blEl.shadowRoot?.querySelector("textarea");
    if (!inner) return false;
    setNativeValue(inner, String(value));
    return true;
  }

  // bl-select: shadow .select-input ile ac, metne gore bl-select-option sec.
  async function openAndSelectBlOption(blSelectEl, matchText, log, label) {
    if (isEmpty(matchText)) { log.push(`↷ ${label}: bos, atlandi`); return; }
    if (!blSelectEl) { log.push(`❌ ${label}: bl-select bulunamadi`); return; }
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
      log.push(`❌ ${label}: "${matchText}" secenegi bulunamadi`);
    }
  }

  // Kategori agacini adim adim tiklayarak gez (Trendyol'da arama yok).
  async function selectCategoryTree(categoryPath, log) {
    const blInputs = document.querySelectorAll("bl-input");
    const katBlInput = Array.from(blInputs)
      .find((el) => el.getAttribute("placeholder") === "Kategori") || blInputs[2];
    if (!katBlInput) { log.push("❌ Kategori: bl-input bulunamadi"); return; }
    katBlInput.click();
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
        log.push(`✅ Kategori adimi: ${step}`);
      } else {
        log.push(`❌ Kategori adimi bulunamadi: "${step}"`);
        return;
      }
    }
  }

  async function fillFormTrendyol(data) {
    const log = [];
    const satis = data.satis || {};
    const ty = data.trendyol || {};

    // 1) KATEGORI — EN BASTA. Once "Ürün Adı" girilirse kategori akisini bozuyor.
    if (ty.kategori_agaci?.length) {
      await selectCategoryTree(ty.kategori_agaci, log);
      await sleep(800); // ozellikler bolumunun yuklenmesini bekle
    } else { log.push("↷ Kategori: bos, atlandi"); }

    // 2) Urun Adi
    if (!isEmpty(data.urun_adi)) {
      setBlInput(getBlInp("Ürün Adı"), data.urun_adi);
      log.push("✅ Urun Adi: " + data.urun_adi);
    } else { log.push("↷ Urun Adi: bos, atlandi"); }

    // 3) Model Kodu
    if (!isEmpty(ty.model_kodu)) {
      setBlInput(getBlInp("Model Kodu"), ty.model_kodu);
      log.push("✅ Model Kodu: " + ty.model_kodu);
    } else { log.push("↷ Model Kodu: bos, atlandi"); }

    // 4) Urun Markasi — arayarak secilen bl-select
    if (!isEmpty(data.marka)) {
      const markaSel = getBlSel("Ürün Markası");
      if (markaSel) {
        markaSel.shadowRoot?.querySelector(".select-input")?.click();
        await sleep(300);
        const searchInp = markaSel.shadowRoot?.querySelector("input");
        if (searchInp) {
          setNativeValue(searchInp, data.marka);
          searchInp.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
        }
        await sleep(800); // API sonuclarini bekle
        const opts = markaSel.querySelectorAll("bl-select-option");
        let picked = null;
        for (const opt of opts) {
          if (lc(opt.textContent.trim()).includes(lc(data.marka))) { picked = opt; break; }
        }
        if (!picked && opts.length) picked = opts[0];
        if (picked) {
          (picked.shadowRoot?.firstElementChild || picked).click();
          log.push("✅ Marka: " + picked.textContent.trim());
        } else { log.push("❌ Marka: secenegi bulunamadi"); }
        await sleep(300);
      } else { log.push("❌ Marka: bl-select bulunamadi"); }
    } else { log.push("↷ Marka: bos, atlandi"); }

    // 5) Aciklama — contenteditable #rich-content-wrapper
    if (!isEmpty(data.aciklama)) {
      const editor = document.querySelector("#rich-content-wrapper") ||
                     document.querySelector('[contenteditable="true"]');
      if (editor) {
        editor.focus();
        editor.innerHTML = toParagraphs(data.aciklama);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        log.push("✅ Aciklama dolduruldu");
      } else { log.push("❌ Aciklama: #rich-content-wrapper bulunamadi"); }
    } else { log.push("↷ Aciklama: bos, atlandi"); }

    // 6) Satis tablosu — bl-table-cell indeksleri
    // [Gorsel=0, Barkod=1, Satis Fiyati=2, Stok=3, KDV=4, OTV=5, Stok Kodu=6, Parti/Lot=7]
    const cells = document.querySelectorAll("bl-table-cell");
    const cellBl = (i, value, label) => {
      if (isEmpty(value)) { log.push(`↷ ${label}: bos, atlandi`); return; }
      if (!cells[i]) { log.push(`❌ ${label}: hucre yok (${i})`); return; }
      setBlInput(cells[i].querySelector("bl-input"), String(value));
      log.push(`✅ ${label}: ${value}`);
    };
    const cellNative = (i, value, label) => {
      if (isEmpty(value)) { log.push(`↷ ${label}: bos, atlandi`); return; }
      const inp = cells[i]?.querySelector("input");
      if (inp) { setNativeValue(inp, String(value)); log.push(`✅ ${label}: ${value}`); }
      else log.push(`❌ ${label}: hucre yok (${i})`);
    };

    cellBl(1, satis.barkod, "Barkod");
    cellNative(2, formatMoney(satis.satis_fiyati), "Satis Fiyati");
    cellNative(3, satis.stok_adet, "Stok");
    if (!isEmpty(satis.kdv_orani)) {
      await openAndSelectBlOption(cells[4]?.querySelector("bl-select"), String(satis.kdv_orani), log, "KDV");
    } else { log.push("↷ KDV: bos, atlandi"); }
    cellBl(6, satis.stok_kodu, "Stok Kodu");
    cellBl(7, satis.parti_kodu, "Parti/Lot/SKT");

    // 7) Urun ozellikleri — placeholder ile bulunan bl-select'ler
    await openAndSelectBlOption(getBlSel("Menşei"), ty.mensei, log, "Mensei");
    await openAndSelectBlOption(getBlSel("Garanti Süresi"), ty.garanti_suresi, log, "Garanti Suresi");
    await openAndSelectBlOption(getBlSel("Pil Gücü"), ty.pil_gucu_mah, log, "Pil Gucu");
    await openAndSelectBlOption(getBlSel("Uyumlu Marka"), ty.uyumlu_marka, log, "Uyumlu Marka");
    await openAndSelectBlOption(getBlSel("Garanti Tipi"), ty.garanti_tipi, log, "Garanti Tipi");
    await openAndSelectBlOption(getBlSel("Tamir Edilebilirlik"), ty.tamir_edilebilirlik, log, "Tamir Edilebilirlik");

    log.push("— Trendyol tamamlandi.");
    return log.join("\n");
  }

  // ==========================================================================
  //  Site yonlendirme
  // ==========================================================================
  const FILLERS = {
    n11: fillFormN11,
    trendyol: fillFormTrendyol
  };

  // Site DAIMA sayfanin URL'inden cozulur (JSON'da site bilgisi tutulmaz).
  function detectSiteFromUrl() {
    if (/^https:\/\/partner\.trendyol\.com\//.test(location.href)) return "trendyol";
    if (/^https:\/\/so\.n11\.com\//.test(location.href)) return "n11";
    return null;
  }

  window.__formFiller_run = async function (data /*, site (yok sayilir) */) {
    const key = detectSiteFromUrl();
    const filler = key && FILLERS[key];
    if (!filler) return `❌ Desteklenmeyen sayfa: ${location.hostname}`;
    try {
      return await filler(data);
    } catch (err) {
      return `❌ Doldurma sirasinda hata: ${err.message}`;
    }
  };
})();
