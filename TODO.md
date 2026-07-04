# Form Filler — Durum & Yapılacaklar (Devir Notu)

Devralan agent için: mimari `NASIL-CALISIYOR.md`'de. Bu dosya "nerede kaldık,
nereye gidiyoruz" listesidir.

## Şu anki durum (özet)

Uzantı çalışır durumda; **mantık ile eşleştirme ayrıldı** (mapping.js = harita,
content.js = motor). Trendyol selector'ları sağlam `cy-id`'ye taşındı. Yeni
uyumluluk alanları (üretici/ithalatçı/CE) eklendi. **Canlı test bekliyor.**

---

## ✅ Yapılanlar

- [x] Uzantı temel iskeleti: manifest (MV3), popup UI, log + geçmiş (`chrome.storage`, son 50).
- [x] n11 doldurma (dropdown, input, KDV select, Jodit iframe açıklama).
- [x] Trendyol doldurma (bl-input, bl-select, kategori ağacı, satış tablosu, contenteditable).
- [x] Site tespiti URL'den (JSON'da tutulmuyor).
- [x] **Mimari refactor:** `mapping.js` (harita) + `content.js` (motor) ayrıldı.
      Site değişince artık sadece harita düzeltilecek.
- [x] Trendyol selector'ları placeholder → **cy-id** (title, modelCode, categoryInput, brandInput).
- [x] Trendyol canlı formu incelendi (`outer` dökümü): Baklava web component'leri doğrulandı.
- [x] Yeni alanlar eklendi (mapping + urun.json):
      üretici/ithalatçı (ortak), Cep Telefonu Modeli, CE Uygunluk, Diğer Özellikler, Kullanım Talimatı.
- [x] Tüm dosyalar söz dizimi doğrulandı (node --check / JSON.parse).

---

## 🔜 Sıradaki adım (HEMEN yapılacak)

- [ ] **CANLI TEST — Trendyol.** Uzantıyı yeniden yükle, sayfayı yenile, urun.json
      yapıştır, doldur. Popup log'unun tamamını al.
- [ ] Log'daki `❌` alanları için `mapping.js` selector/index düzeltmesi.
- [ ] **Satış tablosu hücre indekslerini doğrula** (Barkod=1, Fiyat=2, Stok=3, KDV=4,
      StokKodu=6, Parti=7). Yanlışsa `mapping.js`'te `index` düzelt.
- [ ] **Üretici/ithalatçı bilgilerini gerçek değerlerle doldur** (urun.json'da şu an
      "BURAYA..." placeholder). Kullanıcıdan alınacak.
- [ ] n11 için de canlı test (n11 formu değişmiş olabilir, cy-id benzeri sabit
      kimlik var mı bak — Trendyol'daki gibi sağlamlaştır).

---

## 🎯 Orta vade — hedefler

- [ ] **Excel/Google Sheets → JSON dönüştürücü.** Programcı olmayan kullanıcı JSON
      görmemeli. `excel-json.html` yarım; geliştirilecek VEYA Google Sheets tabanlı
      bir akış kurulacak. Kullanıcı satır seçer → urun.json formatı üretilir → kopyala.
- [ ] **Ürün / Takip ayrımı.** Sabit ürün bilgisi (ad, açıklama, kategori) ile değişken
      takip bilgisi (fiyat, stok, siteye özel farklar) ayrı tutulacak. Sheets'te iki
      sekme veya ileride SQLite'ta iki tablo (ürün_id foreign key ile bağlı).
- [ ] **Siteye özel fiyat/stok farkları** için veri modeli. Şu an urun.json tek fiyat
      tutuyor; her site için farklı fiyat/stok gerekebilir (örn n11_fiyat, trendyol_fiyat).
- [ ] Daha fazla site (n11, Trendyol'dan sonra gelecek). Her biri için:
      mapping.js'e blok + urun.json siteye özel blok + site tespiti (content.js & popup.js).

---

## 🧭 Uzun vade / karar bekleyenler

- [ ] **Depolama katmanı kararı.** Öneri: başlangıçta Google Sheets (kullanıcı dostu,
      çok kullanıcı, versiyon geçmişi). Büyüyünce SQLite. CSV denendi, kullanıcı
      beğenmedi. JSON depolama İÇİN uygun değil (kullanıcı elle bozar) — sadece
      transfer formatı olarak kalmalı.
- [ ] **Payload teşhisi (opsiyonel).** Simülasyon bir alanı sürekli yanlış seçerse:
      sitenin kaydet isteğini yakalayıp gerçek beklediği ID/formatı öğren, sonra
      mapping'i ona göre düzelt. Doldurma yöntemi olarak DEĞİL, sadece teşhis için.
- [ ] **İş akışı sadeleştirme.** Geliştirme (VSCode/Claude Code) + tarayıcı (Chrome,
      site login) AYNI makinede olmalı; uzaktan mekik dokumak süreci yavaşlatıyor.
      Not: Claude Desktop kod geliştiremez; gereken = Node.js + Claude Code.

---

## ⚠️ Bilinen kırılganlıklar

- Satış tablosu indeksleri ve n11 dropdown index'leri DOM sırasına bağlı → panel
  değişince kayabilir. cy-id benzeri sabit kimlik bulunursa oraya geçilmeli.
- Trendyol yeni zorunlu alanlar ekleyebilir (uyumluluk mevzuatı gereği). Kaydet
  engellenirse formda yıldızlı yeni alan var mı bak → mapping'e ekle.
- `cy-id` değerleri Türkçe karakter içeriyor (örn `Menşei`, `Kullanım Talimatı/Uyarıları`);
  seçicilerde birebir eşleşmeli.

---

## Hızlı referans — dosyalar

| İşlem | Dosya |
|---|---|
| Selector / alan eşleştirme değiştir | `mapping.js` |
| Doldurma mantığı / yeni tip ekle | `content.js` → `doldur()` switch |
| Ürün verisi | `urun.json` (şablon: `urun.sablon.json`) |
| Yeni site izinleri | `manifest.json` + `popup.js` SITE_PATTERNS + `content.js` detectSiteFromUrl |
| Canlı DOM referansı (Trendyol) | `outer` |
