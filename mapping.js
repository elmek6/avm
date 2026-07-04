// mapping.js — ALAN HARİTASI (ne, neye karşılık geliyor)
// ---------------------------------------------------------------------------
// Bu dosya SADECE "hangi veri, sayfada hangi alana, nasıl yazılacak" bilgisini tutar.
// KOD MANTIĞI content.js'te. Site arayüzü değişince BURAYI düzeltmek yeterli.
//
// Her alan şu formda tanımlanır:
//   alan_adi: { tip: "...", sec: "...", index: N, kaynak: "...", para: true, eslesme: "..." }
//
//   tip     : alan nasıl doldurulacak (aşağıdaki tablo)
//   sec     : CSS seçici (cy-id tercih edilir; placeholder'dan sağlamdır)
//   index   : satış tablosu hücre sırası (tip tablo-* için)
//   kaynak  : urun.json içindeki yol. Örn "satis.barkod", "trendyol.model_kodu"
//   para    : true ise fiyat biçimi uygulanır (999.00 -> 999)
//   eslesme : (n11 dropdown) tam yol ile eşleştirme metni; kaynak arama terimi
//
// tip değerleri:
//   bl-input        : Baklava <bl-input> (shadow input'a yaz)
//   bl-select       : Baklava <bl-select> — metne göre seçenek seç
//   bl-select-ara   : Baklava <bl-select> — önce yaz/ara, gelen sonuçtan seç (Marka)
//   editor          : contenteditable zengin metin editörü (innerHTML)
//   kategori-agaci  : Trendyol kategori ağacı — adım adım tıkla (kaynak = dizi)
//   tablo-bl-input  : satış tablosu hücresindeki <bl-input>
//   tablo-input     : satış tablosu hücresindeki düz <input>
//   tablo-bl-select : satış tablosu hücresindeki <bl-select>
//   input           : düz <input> (n11)
//   select-value    : düz <select> — value ata (n11 KDV)
//   n11-dropdown    : n11 .dropdownSelectable bileşeni (index ile)
//   jodit           : n11 Jodit iframe editörü
//
// SIRA ÖNEMLİ: alanlar burada yazıldığı sırayla doldurulur.
// (Trendyol'da kategori EN BAŞTA olmalı; n11'de de kategori önce gelir.)

window.__ALAN_HARITASI = {

  // ==========================================================================
  //  TRENDYOL  (partner.trendyol.com) — Baklava web component'leri
  // ==========================================================================
  trendyol: {
    // 1) Kategori EN BAŞTA — önce ürün adı girilirse akış bozuluyor.
    kategori:       { tip: "kategori-agaci", sec: 'bl-input[cy-id="categoryInput"]', kaynak: "trendyol.kategori_agaci" },

    // 2) Temel bilgiler
    urun_adi:       { tip: "bl-input",     sec: 'bl-input[cy-id="title"]',      kaynak: "urun_adi" },
    model_kodu:     { tip: "bl-input",     sec: 'bl-input[cy-id="modelCode"]',  kaynak: "trendyol.model_kodu" },
    marka:          { tip: "bl-select-ara", sec: 'bl-select[cy-id="brandInput"]', kaynak: "marka" },
    aciklama:       { tip: "editor",       sec: '#rich-content-wrapper',        kaynak: "aciklama" },

    // 3) Satış tablosu (bl-table-cell indeksleri)
    //    [Görsel=0, Barkod=1, Satış Fiyatı=2, Stok=3, KDV=4, ÖTV=5, Stok Kodu=6, Parti/Lot=7]
    barkod:         { tip: "tablo-bl-input",  index: 1, kaynak: "satis.barkod" },
    satis_fiyati:   { tip: "tablo-input",     index: 2, kaynak: "satis.satis_fiyati", para: true },
    stok_adet:      { tip: "tablo-input",     index: 3, kaynak: "satis.stok_adet" },
    kdv:            { tip: "tablo-bl-select", index: 4, kaynak: "satis.kdv_orani" },
    stok_kodu:      { tip: "tablo-bl-input",  index: 6, kaynak: "satis.stok_kodu" },
    parti_kodu:     { tip: "tablo-bl-input",  index: 7, kaynak: "satis.parti_kodu" },

    // 4) Ürün özellikleri (bl-select, cy-id = Türkçe etiket)
    mensei:              { tip: "bl-select", sec: 'bl-select[cy-id="Menşei"]',             kaynak: "trendyol.mensei" },
    garanti_suresi:      { tip: "bl-select", sec: 'bl-select[cy-id="Garanti Süresi"]',     kaynak: "trendyol.garanti_suresi" },
    garanti_tipi:        { tip: "bl-select", sec: 'bl-select[cy-id="Garanti Tipi"]',       kaynak: "trendyol.garanti_tipi" },
    pil_gucu:            { tip: "bl-select", sec: 'bl-select[cy-id="Pil Gücü (mAh)"]',      kaynak: "trendyol.pil_gucu_mah" },
    uyumlu_marka:        { tip: "bl-select", sec: 'bl-select[cy-id="Uyumlu Marka"]',       kaynak: "trendyol.uyumlu_marka" },
    tamir_edilebilirlik: { tip: "bl-select", sec: 'bl-select[cy-id="Tamir Edilebilirlik"]', kaynak: "trendyol.tamir_edilebilirlik" },
    cep_telefonu_modeli: { tip: "bl-select", sec: 'bl-select[cy-id="Cep Telefonu Modeli"]', kaynak: "trendyol.cep_telefonu_modeli" },
    ce_uygunluk:         { tip: "bl-select", sec: 'bl-select[cy-id="CE Uygunluk Sembolu"]', kaynak: "trendyol.ce_uygunluk" },
    diger_ozellikler:    { tip: "bl-input",  sec: 'bl-input[cy-id="Diğer Özellikler"]',     kaynak: "trendyol.diger_ozellikler" },
    kullanim_talimati:   { tip: "bl-input",  sec: 'bl-input[cy-id="Kullanım Talimatı/Uyarıları"]', kaynak: "trendyol.kullanim_talimati" },

    // 5) Üretici / İthalatçı bilgileri (ORTAK alan — üst seviye "uretici"/"ithalatci")
    uretici_ad:     { tip: "bl-input", sec: 'bl-input[cy-id="Üretici Adı"]',                 kaynak: "uretici.ad" },
    uretici_adres:  { tip: "bl-input", sec: 'bl-input[cy-id="Üretici Adres Bilgisi"]',        kaynak: "uretici.adres" },
    uretici_mail:   { tip: "bl-input", sec: 'bl-input[cy-id="Üretici Mail Adresi"]',          kaynak: "uretici.mail" },
    ithalatci_ad:   { tip: "bl-input", sec: 'bl-input[cy-id="Birincil İthalatçı Adı"]',       kaynak: "ithalatci.ad" },
    ithalatci_adres:{ tip: "bl-input", sec: 'bl-input[cy-id="Birincil İthalatçı Adres Bilgisi"]', kaynak: "ithalatci.adres" },
    ithalatci_mail: { tip: "bl-input", sec: 'bl-input[cy-id="Birincil İthalatçı Mail Adresi"]',   kaynak: "ithalatci.mail" }
  },

  // ==========================================================================
  //  N11  (so.n11.com) — özel .dropdownSelectable + Jodit editör
  // ==========================================================================
  n11: {
    // 1) Ürün Adı
    urun_adi:     { tip: "input", sec: "#productName", kaynak: "urun_adi" },

    // 2) Kategori (dropdown index 0) — arama terimi kaynak, eşleşme tam yol
    kategori:     { tip: "n11-dropdown", index: 0, kaynak: "n11.kategori_arama", eslesme: "n11.kategori_yolu" },
    // 3) Marka (index 1)
    marka:        { tip: "n11-dropdown", index: 1, kaynak: "marka" },
    // 4) Uyumlu Marka (index 2)
    uyumlu_marka: { tip: "n11-dropdown", index: 2, kaynak: "ozellikler.uyumlu_marka" },
    // 5) Pil Gücü (index 3)
    pil_gucu:     { tip: "n11-dropdown", index: 3, kaynak: "ozellikler.pil_gucu" },
    // 6) Seçenek (index 4)
    secenek:      { tip: "n11-dropdown", index: 4, kaynak: "n11.secenek" },

    // 7) Input alanları
    barkod:         { tip: "input", sec: '[id^="gtin-"]',      kaynak: "satis.barkod" },
    stok_kodu:      { tip: "input", sec: '[id^="stockCode-"]', kaynak: "satis.stok_kodu" },
    piyasa_fiyati:  { tip: "input", sec: '[id^="listPrice-"]', kaynak: "satis.piyasa_fiyati", para: true },
    satis_fiyati:   { tip: "input", sec: '[id^="salePrice-"]', kaynak: "satis.satis_fiyati",  para: true },
    stok_adet:      { tip: "n11-stok",                          kaynak: "satis.stok_adet" },
    hazirlik_suresi:{ tip: "input", sec: '[id^="duration-"]',  kaynak: "satis.hazirlik_suresi" },

    // 8) KDV (düz select)
    kdv:          { tip: "select-value", sec: "select.operations-input", kaynak: "satis.kdv_orani" },

    // 9) Açıklama (Jodit iframe)
    aciklama:     { tip: "jodit", sec: ".jodit-wysiwyg_iframe", kaynak: "aciklama" }
  }
};
