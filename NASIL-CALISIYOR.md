# Form Filler — Nasıl Çalışıyor (Mimari / Devir Notu)

Bu belge, projeyi devralan agent'ın hiç bağlam olmadan sistemi anlaması içindir.

## Amaç

E-ticaret satıcı panellerinde (şu an **n11** ve **Trendyol**) ürün ekleme
formlarını, tek bir `urun.json` dosyasından **otomatik doldurmak**. Uzantı formu
doldurur; **"Kaydet"e kullanıcı basar** (son kontrol insanda kalır).

Yaklaşım: **arayüz simülasyonu.** Sayfanın DOM'una gerçek bir kullanıcı gibi
değer yazılır / seçim yapılır. API taklidi veya doğrudan istek YOK (bilinçli
karar — sağlamlık ve kullanıcı kontrolü için). Detay: bkz. "Alternatifler".

## Dosya haritası

| Dosya | Rol |
|---|---|
| `manifest.json` | MV3 tanımı. Content script sırası: **`mapping.js` → `content.js`** (sıra önemli). |
| `mapping.js` | **ALAN HARİTASI.** "Ne, nereye, nasıl" bilgisi. `window.__ALAN_HARITASI`. |
| `content.js` | **MOTOR.** Haritayı okur, sırayla uygular. Tüm doldurma mantığı burada. |
| `popup.html` / `popup.js` | Kullanıcı arayüzü. JSON yapıştır → Doldur. Log gösterir + `chrome.storage`'a kaydeder. |
| `urun.json` | Örnek/aktif ürün verisi. Doldurulacak bilgi. |
| `urun.sablon.json` | Boş şablon. |
| `excel-json.html` | (Yarım) Excel→JSON dönüştürücü fikri. Henüz entegre değil. |
| `outer` | Trendyol formunun canlı outerHTML dökümü (1MB). Selector doğrulama için referans. |

## Çalışma akışı (adım adım)

```
1. Kullanıcı n11/Trendyol ürün ekleme sayfasında.
2. manifest, sayfaya document_idle'da mapping.js + content.js enjekte eder.
   → mapping.js:  window.__ALAN_HARITASI tanımlanır
   → content.js:  window.__formFiller_run(data) tanımlanır
3. Kullanıcı popup'ı açar, urun.json içeriğini yapıştırır, "Formu Doldur"a basar.
4. popup.js:
   - JSON.parse eder
   - aktif sekmenin URL'inden siteyi tespit eder (n11 / trendyol)
   - chrome.scripting.executeScript ile window.__formFiller_run(data) çağırır
5. content.js MOTORU:
   - URL'den site anahtarını çözer (detectSiteFromUrl)
   - __ALAN_HARITASI[site] üzerinde YAZILDIĞI SIRAYLA gezer
   - her alanı "tip"ine göre doldurur, log satırı üretir
   - log string'ini popup'a döndürür
6. popup.js log'u ekranda gösterir + chrome.storage.local'e kaydeder (son 50 kayıt).
7. Kullanıcı gözle kontrol eder, "Kaydet"e kendisi basar.
```

## mapping.js — harita formatı

Her alan bir config objesi:

```js
alan_adi: { tip, sec, index, kaynak, para, eslesme }
```

| Anahtar | Anlamı |
|---|---|
| `tip` | Alan nasıl doldurulacak (aşağıdaki tablo) |
| `sec` | CSS seçici. **cy-id tercih edilir** (placeholder'dan sağlam) |
| `index` | Satış tablosu hücre sırası (tip `tablo-*` ve `n11-dropdown` için) |
| `kaynak` | `urun.json` içindeki yol. Örn `"satis.barkod"`, `"trendyol.model_kodu"` |
| `para` | `true` → fiyat biçimi (999.00 → 999) |
| `eslesme` | (n11 dropdown) tam yol ile eşleştirme metni |

**SIRA ÖNEMLİ:** Harita objesindeki yazım sırası = doldurma sırası.
Trendyol'da kategori EN BAŞTA olmalı (önce ürün adı girilirse akış bozulur).

### Desteklenen `tip` değerleri (motor bunları tanır)

| tip | Nerede | Ne yapar |
|---|---|---|
| `bl-input` | Trendyol | Baklava `<bl-input>` shadow input'una yazar |
| `bl-select` | Trendyol | `<bl-select>` açar, metne göre seçenek seçer |
| `bl-select-ara` | Trendyol | Arayarak seçer (Marka: yaz → API sonucu → seç) |
| `editor` | Trendyol | contenteditable zengin editör (innerHTML) |
| `kategori-agaci` | Trendyol | Kategori ağacını adım adım tıklar (kaynak = dizi) |
| `tablo-bl-input` | Trendyol | Satış tablosu hücresindeki `<bl-input>` |
| `tablo-input` | Trendyol | Satış tablosu hücresindeki düz `<input>` |
| `tablo-bl-select` | Trendyol | Satış tablosu hücresindeki `<bl-select>` |
| `input` | n11 | Düz `<input>` |
| `select-value` | n11 | Düz `<select>` — value atar (KDV) |
| `n11-dropdown` | n11 | `.dropdownSelectable` bileşeni (index ile) |
| `n11-stok` | n11 | Özel stok alanı (`stock-` başlar, `stockCode-` hariç) |
| `jodit` | n11 | Jodit iframe editörü |

Yeni bir alan tipi gerekirse: `content.js` içindeki `doldur()` fonksiyonunun
`switch (cfg.tip)` bloğuna yeni `case` eklenir.

## Site tespiti

Site **DAİMA URL'den** çözülür, JSON'da tutulmaz:
- `partner.trendyol.com` → `trendyol`
- `so.n11.com` → `n11`

İki yerde tanımlı: `content.js > detectSiteFromUrl()` ve `popup.js > SITE_PATTERNS`.
Yeni site eklerken **ikisini de** güncelle + `manifest.json` matches + content_scripts.

## urun.json yapısı (ortak vs. siteye özel)

```jsonc
{
  // ORTAK ALANLAR (tüm siteler kullanır)
  "urun_adi", "marka", "aciklama",
  "ozellikler": { "uyumlu_marka", "pil_gucu" },
  "uretici":   { "ad", "adres", "mail" },      // AB/GPSR uyumluluk — ortak
  "ithalatci": { "ad", "adres", "mail" },      // ortak
  "satis":     { "barkod", "stok_kodu", "parti_kodu", "piyasa_fiyati",
                 "satis_fiyati", "stok_adet", "hazirlik_suresi", "kdv_orani" },

  // SİTEYE ÖZEL BLOKLAR
  "n11":      { "kategori_yolu", "kategori_arama", "secenek" },
  "trendyol": { "model_kodu", "kategori_agaci", "mensei", "garanti_suresi",
                "garanti_tipi", "pil_gucu_mah", "uyumlu_marka",
                "tamir_edilebilirlik", "cep_telefonu_modeli", "ce_uygunluk",
                "diger_ozellikler", "kullanim_talimati" }
}
```

Tasarım ilkesi: **her sitede tekrar eden şey ortak bloğa, siteye özgü olan kendi
bloğuna.** Yeni site geldikçe ortak alanlar yeniden kullanılır.

## Selector keşif yöntemi (bir alan bozulunca)

1. İlgili site formunu aç, DevTools (F12) > Elements.
2. **Ctrl+F** ile alan etiketini arat (örn "Ürün Adı") → elemana git.
3. Öncelik: `cy-id` attribute'u > `id` > `placeholder`. En sabit olanı seç.
4. `mapping.js`'te ilgili alanın `sec` değerini güncelle. **content.js'e dokunma.**
5. Uzantıyı yeniden yükle + sayfayı yenile + test et, log'a bak.

Referans: `outer` dosyası Trendyol formunun tam DOM dökümüdür; grep ile selector
doğrulanabilir.

## Test döngüsü

```
1. chrome://extensions → uzantıyı "Yeniden Yükle"
2. Hedef sayfayı F5 ile yenile (yeni content script yüklensin)
3. popup > urun.json yapıştır > Formu Doldur
4. Log'u oku:  ✅ = başarı,  ↷ = boş/atlandı,  ❌ = bulunamadı/hata
5. ❌ olan alanların selector'ını mapping.js'ten düzelt, tekrar dene.
```

## Alternatifler (neden şu an simülasyon?)

Değerlendirilip ERTELENEN yaklaşımlar:
- **Payload / API taklidi:** Çok hızlı ama token/format kırılgan, panel değişince
  komple bozulur, kullanıcı kontrolü kaybolur. → Sadece TEŞHİS için (sitenin
  gerçek beklediği ID/formatı öğrenmek) kullanılabilir, doldurma yöntemi olarak değil.
- **XHR/fetch yakalama, iç component API'si (React state / Baklava setter):**
  Simülasyondan sağlam ama keşif maliyeti yüksek. İleride tek tek alanlar için
  seçici olarak uygulanabilir.

Karar: arayüz simülasyonunda kalındı; sağlamlık için placeholder yerine `cy-id`.

## Dikkat / tuzaklar

- **Shadow DOM:** Baklava bileşenlerinin gerçek `<input>`'u `shadowRoot` içindedir.
  Canlıda erişilir; ama "Copy outerHTML" shadow içeriğini YAKALAMAZ (statik `outer`
  dosyasında iç input görünmez, bu normal).
- **Satış tablosu indeksleri** varsayıma dayanır:
  `[Görsel=0, Barkod=1, Fiyat=2, Stok=3, KDV=4, ÖTV=5, StokKodu=6, Parti=7]`.
  Canlı testte doğrulanmalı; yanlışsa `mapping.js`'te `index` düzeltilir.
- **n11 dropdown index'leri** DOM sırasına bağlı — kırılgan. Panel değişirse kayar.
- Uzantı MV3; content script + `chrome.scripting` kullanır. Ek izin: `activeTab`,
  `scripting`, `storage`.
