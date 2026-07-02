// content.js — Form Filler
// so.n11.com uzerinde document_idle'da enjekte edilir.
// popup, window.__formFiller_run(data, site) fonksiyonunu cagirir.

(function () {
  // Yardimcilar ---------------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  const isEmpty = (v) => v === null || v === undefined || v === "";

  // Bir custom dropdown'i ac -> ara -> secenek tikla.
  // dropdown: .dropdownSelectable elemani, searchTerm: yazilacak metin,
  // matchText: eslesme icin tam metin (opsiyonel, yoksa searchTerm kullanilir).
  async function fillDropdown(dropdowns, index, searchTerm, matchText, log, label) {
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

    const wantFull = (matchText || "").toLocaleLowerCase("tr");
    const wantTerm = (searchTerm || "").toLocaleLowerCase("tr");
    const items = dd.querySelectorAll(".dropdownSelectable-content-list li, .dropdownSelectable-content-list span");

    let picked = null;
    for (const it of items) {
      const txt = (it.textContent || "").trim().toLocaleLowerCase("tr");
      if (!txt) continue;
      if ((wantFull && txt.includes(wantFull)) || txt.endsWith(wantTerm) || txt.includes(wantTerm)) {
        picked = it; break;
      }
    }
    // Tam eslesme yoksa ilk sonucu al.
    if (!picked && items.length) picked = items[0];

    if (picked) {
      picked.click();
      log.push(`✅ ${label}: ${picked.textContent.trim()}`);
      return true;
    }
    log.push(`❌ ${label}: "${searchTerm}" icin sonuc bulunamadi`);
    return false;
  }

  // Tek input alani doldur.
  function fillInput(selector, value, log, label, root = document) {
    if (isEmpty(value)) { log.push(`↷ ${label}: bos, atlandi`); return; }
    const el = typeof selector === "function" ? selector(root) : root.querySelector(selector);
    if (!el) { log.push(`❌ ${label}: alan bulunamadi`); return; }
    setNativeValue(el, String(value));
    log.push(`✅ ${label}: ${value}`);
  }

  // n11 doldurma ----------------------------------------------------------------
  async function fillFormN11(data) {
    const log = [];
    const bilgi = data.urun_bilgileri || {};
    const ozellik = data.urun_ozellikleri || {};
    const satis = data.satis || {};

    // 1) Urun Adi
    fillInput("#productName", bilgi.urun_adi, log, "Urun Adi");

    // Kategori/marka gibi custom dropdown'lar
    const getDropdowns = () => document.querySelectorAll(".dropdownSelectable");

    // 2) Kategori (index 0) — son segment ile ara
    if (!isEmpty(bilgi.kategori)) {
      const segs = String(bilgi.kategori).split(">").map((s) => s.trim());
      const last = segs[segs.length - 1];
      await fillDropdown(getDropdowns(), 0, last, bilgi.kategori, log, "Kategori");
      await sleep(1000); // kategori sonrasi "Urun Ozellikleri" yeniden render olur
    } else {
      log.push("↷ Kategori: bos, atlandi");
    }

    // 3) Marka (index 1)
    if (!isEmpty(bilgi.marka)) {
      await fillDropdown(getDropdowns(), 1, bilgi.marka, bilgi.marka, log, "Marka");
      await sleep(500);
    } else {
      log.push("↷ Marka: bos, atlandi");
    }

    // 4) Uyumlu Marka (index 2) — kategori yuklendikten sonra gelir
    if (!isEmpty(ozellik.uyumlu_marka)) {
      await fillDropdown(getDropdowns(), 2, ozellik.uyumlu_marka, ozellik.uyumlu_marka, log, "Uyumlu Marka");
      await sleep(400);
    } else {
      log.push("↷ Uyumlu Marka: bos, atlandi");
    }

    // 5) Pil Gucu (index 3, opsiyonel)
    if (!isEmpty(ozellik.pil_gucu)) {
      await fillDropdown(getDropdowns(), 3, ozellik.pil_gucu, ozellik.pil_gucu, log, "Pil Gucu");
      await sleep(400);
    } else {
      log.push("↷ Pil Gucu: bos, atlandi");
    }

    // 6) Secenek (index 4, opsiyonel)
    if (!isEmpty(ozellik.secenek)) {
      await fillDropdown(getDropdowns(), 4, ozellik.secenek, ozellik.secenek, log, "Secenek");
      await sleep(400);
    } else {
      log.push("↷ Secenek: bos, atlandi");
    }

    // 7-12) Prefixli input alanlari
    fillInput('[id^="gtin-"]', satis.barkod, log, "Barkod");
    fillInput('[id^="stockCode-"]', satis.stok_kodu, log, "Stok Kodu");
    fillInput('[id^="listPrice-"]', satis.piyasa_fiyati, log, "Piyasa Fiyati");
    fillInput('[id^="salePrice-"]', satis.n11_fiyati, log, "n11 Fiyati");
    // Stok adet: stockCode- disindaki stock- alani
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
      } else {
        log.push("❌ KDV Orani: select bulunamadi");
      }
    } else {
      log.push("↷ KDV Orani: bos, atlandi");
    }

    // 14) Aciklama (contenteditable editor)
    if (!isEmpty(data.aciklama)) {
      const editor = document.querySelector(".ql-editor") ||
                     document.querySelector('[contenteditable="true"]');
      if (editor) {
        const paras = String(data.aciklama)
          .split("\n")
          .map((line) => `<p>${line.trim() === "" ? "<br>" : line}</p>`)
          .join("");
        editor.innerHTML = paras;
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        log.push("✅ Aciklama dolduruldu");
      } else {
        log.push("❌ Aciklama: editor bulunamadi");
      }
    } else {
      log.push("↷ Aciklama: bos, atlandi");
    }

    log.push("— Tamamlandi. 'Onaya Gonder' butonuna basilmadi.");
    return log.join("\n");
  }

  // Site yonlendirme ------------------------------------------------------------
  const FILLERS = {
    n11: fillFormN11
    // yeni site: siteX: fillFormSiteX
  };

  window.__formFiller_run = async function (data, site) {
    const key = (site || data.site || "").toLowerCase();
    const filler = FILLERS[key];
    if (!filler) return `❌ Desteklenmeyen site: ${key || "(bilinmiyor)"}`;
    try {
      return await filler(data);
    } catch (err) {
      return `❌ Doldurma sirasinda hata: ${err.message}`;
    }
  };
})();
