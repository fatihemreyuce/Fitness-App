# FitLens — "AI ile Yemek Tara" (Camera Food Scan) Design

**Date:** 2026-06-13
**Status:** Approved (design), pending implementation plan
**Branch base:** `main`

## Goal

Kullanıcı bir yemek fotoğrafı çeker/seçer; Gemini 2.0-flash görseli analiz edip kalori ve makroları tahmin eder; sonuç bir "Yemek Onay Kartı"nda gösterilir; kullanıcı öğünü seçip onaylayınca kayıt **mevcut nutrition sistemine** (`foods` + `food_entries`) düşer ve günlük/istatistik/hedef ekranlarında otomatik görünür.

## Decisions (locked)

| Karar | Seçim | Gerekçe |
|-------|-------|---------|
| Veri modeli | Mevcut `foods` + `food_entries` | Tek tutarlı sistem; Stats/GoalsInline/hedef otomatik görür. Ayrı `gunluk_kaloriler` tablosu YOK. |
| Resim transferi | Base64 doğrudan Edge Function'a | Storage yok → 0 byte depolama, silme/race yok, 1GB derdi biter. |
| AI model | `gemini-2.0-flash` | 1.5-flash'tan hızlı/ucuz/iyi vision, aynı free tier. |
| API key | Edge Function secret (`GEMINI_API_KEY`) | Güvenlik şartı: anahtar mobilde DEĞİL. |
| Freemium | v1'de YOK | Kota/subscription/RPC yok. Sadece kamera+analiz+kayıt. (Gelecek faz.) |
| Öğün seçimi | Kullanıcı onay kartında seçer | Tahmin yok; 4 öğün chip'i. |
| Build | Native APK rebuild gerekli | Kamera/picker native modül → OTA yetmez (tek seferlik EAS build). |

## Architecture

İki parça. **Yeni DB tablosu yok**, **Storage yok**.

### 1. Edge Function `yemek-analiz-et` (Deno / TypeScript)

Tek sorumluluk: güvenli Gemini proxy. DB'ye ve Storage'a dokunmaz.

```
Request body:  { imageBase64: string, mimeType: string }   // mimeType örn "image/jpeg"
Flow:          base64 → Gemini 2.0-flash (vision + strict-JSON prompt) → parse → validate
Response 200:  { yemek_adi: string, porsiyon_gram: number, kalori: number,
                 protein: number, karbonhidrat: number, yag: number }
Response 200:  { yemek_adi: null }                          // görselde yemek yoksa
Response 4xx/5xx: { error: string }                          // parse/Gemini/network hatası
```

- `GEMINI_API_KEY` Edge secret'tan okunur.
- Auth: invoke kullanıcının JWT'siyle gelir; fonksiyon yalnız analiz yapar (DB yazımı client'ta).
- Gemini prompt (Türkçe, katı JSON, markdown YOK):
  > "Resimdeki yemeği analiz et. Tahmini porsiyonu gram cinsinden ver. Bana SADECE şu JSON formatında cevap dön, markdown veya açıklama ekleme: {\"yemek_adi\": \"...\", \"porsiyon_gram\": 0, \"kalori\": 0, \"protein\": 0, \"karbonhidrat\": 0, \"yag\": 0}. Görselde yemek yoksa yemek_adi'ni null yap."
- Edge tarafında savunmacı parse: markdown fence sıyır, JSON.parse, alan/tip doğrula. Geçersizse 502 + log.

### 2. React Native akışı — `ScanFood` ekranı + Onay Kartı

```
expo-image-picker (launchCameraAsync / launchImageLibraryAsync)
  → expo-image-manipulator: resize maxWidth 1024 + jpeg quality 0.5 → ~50-100KB + base64:true
  → supabase.functions.invoke('yemek-analiz-et', { body: { imageBase64, mimeType:'image/jpeg' } })
  → Onay Kartı (Modal): yemek_adi, porsiyon_gram (düzenlenebilir), kalori + makrolar,
       4 öğün chip'i (Kahvaltı/Öğle/Akşam/Atıştırma — kullanıcı seçer)
  → "Onayla ve Günlüğüme Ekle":
       1) foods kaydı: owner_id=user, name=yemek_adi, per-100g'a çevrilmiş değerler
       2) food_entries kaydı: quantity_g=porsiyon_gram, seçilen meal_type, aktif tarih
  → mevcut nutrition + Stats + hedef otomatik gösterir
```

### Veri dönüşümü (per-portion → per-100g)

Gemini porsiyon başına döner; `foods` tablosu 100g başına saklar:

```
calories_per_100g = kalori        / porsiyon_gram * 100
protein_g         = protein       / porsiyon_gram * 100
carb_g            = karbonhidrat  / porsiyon_gram * 100
fat_g             = yag           / porsiyon_gram * 100
food_entries.quantity_g = porsiyon_gram
```

Sağlama: porsiyon_gram=120, kalori=180 → calories_per_100g=150; entry quantity_g=120 → gösterilen kalori = 150*120/100 = 180 ✓ (taranan değere eşit).

`porsiyon_gram <= 0` ise dönüşüm bölme hatası → client guard: minimum 1g, kullanıcı düzeltebilir.

### Giriş noktası

Nutrition ekranının üstünde **"📷 AI ile Tara"** butonu. Aktif tarih bağlamını taşır; öğün onay kartında seçilir.

## Components / Files (tahmini)

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `supabase/functions/yemek-analiz-et/index.ts` | Gemini proxy Edge Function | Create |
| `mobile/src/app/(app)/scan-food.tsx` | Tara ekranı (picker/loading/error state) | Create |
| `mobile/src/components/nutrition/FoodConfirmCard.tsx` | Onay kartı (Modal) | Create |
| `mobile/src/lib/queries.ts` | `useAnalyzeFood` (invoke) + `useCreateFood` (varsa reuse) | Modify |
| `mobile/src/lib/foodScan.ts` | saf `portionToPer100g` dönüşüm helper'ı (tip-kontrollü, izole) | Create |
| `mobile/src/app/(app)/nutrition.tsx` | "📷 AI ile Tara" giriş butonu | Modify |
| `mobile/package.json` | `expo-image-picker`, `expo-image-manipulator` (SDK 54 uyumlu) | Modify |

## Error Handling

| Durum | Davranış |
|-------|----------|
| Görselde yemek yok (`yemek_adi: null`) | Kart yerine "Yemek bulunamadı, tekrar dene" |
| Gemini/network hatası | Friendly mesaj + retry butonu |
| Edge JSON parse hatası | 502 + log; mobilde genel hata mesajı |
| Kullanıcı izni reddeder (kamera/galeri) | Ayarlara yönlendiren açıklama |
| Kullanıcı vazgeçer | Kart kapanır, hiçbir yazım olmaz |
| porsiyon_gram <= 0 | Client guard min 1g; kullanıcı düzeltir |

## Testing / Verification

- Test runner yok (projede jest/vitest kurulu değil). Doğrulama kapısı: `npx tsc --noEmit`.
- Saf helper `portionToPer100g` izole, React/Supabase'siz; spec'te manuel akıl-yürütme örnekleriyle.
- Edge Function lokal deploy + gerçek fotoğrafla cihaz doğrulaması (yeni APK build sonrası).

## Out of Scope (v1)

- Freemium kota / subscription tablosu / ödeme entegrasyonu (gelecek faz).
- Resim saklama / geçmiş tarama galerisi (base64 atılır, saklanmaz).
- Çoklu yemek tek karede (tek yemek varsayımı; gelecekte çoklu tespit).

## Execution Plan (agent split)

3 paralel iş kolu — response contract bu spec'te sabit olduğu için bağımsız:
- **Agent A:** `yemek-analiz-et` Edge Function (Deno/TS + Gemini 2.0-flash + savunmacı parse)
- **Agent B:** RN `scan-food.tsx` + `FoodConfirmCard.tsx` + image-picker/compress akışı
- **Agent C:** `queries.ts` hook'ları + `foodScan.ts` helper + nutrition giriş noktası + deps

Entegrasyon: A'nın response şekli ↔ B/C'nin beklediği şekil bu spec'teki contract'a kilitli.
