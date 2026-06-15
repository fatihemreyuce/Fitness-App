# Beslenme — Kalori Halkası Redesign (Design Spec)

**Tarih:** 2026-06-15
**Durum:** Onaylandı (brainstorming — görsel companion ile)

## Amaç

Mevcut **Beslenme** ekranı (`nutrition.tsx`) işlevsel ama düz: kalori özeti tek bir kart (sayı + ince bar + 3 küçük makro chip), öğünler tekrar eden kartlar. Ekranı **kalori halkası** diline taşı: üstte büyük dairesel kalori ilerlemesi (ortada "kalan" vurgusu) + makro satırı + sadeleştirilmiş öğünler. Daha özgün, görsel, "premium" (Apple/Fitbod dili).

## Brainstorming Kararları

- **Hero yönü:** A · Kalori halkası (3 yön arasından seçildi: halka / çubuk / 3-makro-halka).
- **Halka yöntemi:** `react-native-svg` (kullanıcı seçti) — keskin/garantili. Native modül → bir kerelik APK build. Bonus: ileride diğer grafikler de svg'ye geçebilir (bu işte değil).
- **Hedefler:** Yalnız kalori + protein hedefi var (`daily_calorie_goal`, `daily_protein_goal`). Halka kaloriye, protein çubuğu hedefe göre dolar; karb/yağ gram gösterilir (hedef yok).
- **Günler arası gezinme:** v1 **kapsam dışı** — ekran "Bugün" odaklı kalır (mevcut davranış: odakta bugüne tazelenir).

## Mimari

### Ekran düzeni (`nutrition.tsx`, yukarıdan aşağı)
1. **Başlık** — tarih etiketi (haftagünü, gün ay) + "Bugün" + **AI ile Tara** pill (mevcut, korunur).
2. **`CalorieRing` hero** — dairesel kalori ilerlemesi (`alınan / hedef`). Ortada: kalori sayısı (büyük) + `/ hedef kcal` + **kalan X** (accent). Hedef aşılırsa kalan negatif/0 gösterilir, halka %100'de dolu kalır.
3. **Makro satırı** — 3 öğe: **Protein** (gram + `daily_protein_goal`'a göre dolan ince çubuk), **Karb** (gram), **Yağ** (gram). Renk kodu: protein `colors.protein`, karb `colors.carb`, yağ `colors.fat`.
4. **Öğünler** — 4 `MealSection` (Kahvaltı/Öğle/Akşam/Ara): ikon + ad + toplam kcal + "+ Ekle" başlığı; altında temiz besin satırları (`ad · gram` ... `kcal`). Boşsa hafif "Henüz eklenmedi" satırı. Navigasyon `add-food?meal=&date=` ve AI Tara `scan-food?date=` **değişmez**.

### Bileşenler
- **`components/charts/CalorieRing.tsx`** (yeni, react-native-svg) — props: `progress: number` (0–1, clamp'lı), `size?`, `stroke?`, `color?`, `trackColor?`, `children?` (ortadaki içerik). İki `Circle`: track + ilerleme (`strokeDasharray`/`strokeDashoffset`, `rotate(-90)` ile tepeden başlar, `strokeLinecap="round"`). Yeniden kullanılabilir.
- **`components/nutrition/NutritionHero.tsx`** (yeni) — tarih + "Bugün" + AI Tara pill + `CalorieRing` (içinde kalori/kalan metni) + makro satırı. Props: `dateLabel`, `calories`, `calGoal`, `protein`, `proteinGoal`, `carb`, `fat`, `onScan`.
- **`components/nutrition/MealSection.tsx`** (yeni) — props: `label`, `icon`, `items: {id,name,quantity_g,calories}[]`, `totalCal`, `onAdd`. Başlık + satırlar + boş durum.
- Küçük makro çubuğu: `NutritionHero` içinde basit `View` (track + dolu); ayrı bileşene gerek yok.

### Veri katmanı
- Mevcut **`useDayEntries(date)`** + **`useGoals`** + **`entryMacros`** kullanılır — yeni sorgu/tablo/hook yok.
- `nutrition.tsx` totals'ı (kalori + protein + karb + yağ) zaten hesaplıyor (mevcut `useMemo`); hero bunları alır.
- Ring `progress = totals.calories / calGoal` (calGoal = `daily_calorie_goal` > 0 ? : 2400, mevcut mantık). Protein çubuğu `protein / (daily_protein_goal > 0 ? : 150)`.

## Veri Akışı
1. `nutrition.tsx` → `useDayEntries(today)` + `useGoals()` → totals (mevcut) → `NutritionHero` (ring + makrolar).
2. Aynı entries → öğün başına filtre + `entryMacros` → her `MealSection`.

## Hata / Boş / Yükleme
- Yükleme: mevcut "Yükleniyor..." deseni.
- Boş gün: ring %0 (0 kcal), öğünler "Henüz eklenmedi" — çökme yok.
- Negatif/NaN miktar: `entryMacros` zaten 0'a indiriyor (mevcut guard).

## Native & OTA
- **`react-native-svg`** eklenir (`npx expo install`) → native modül.
- **app version 1.0.1 → 1.0.2** (runtimeVersion policy `appVersion` → runtime ayrışır; eski 1.0.1 installler bu svg bundle'ını ALMAZ = çökmez).
- **Yeni APK build** gerekir (`eas build -p android --profile preview`). Build kurulduktan sonra JS değişiklikleri **runtime 1.0.2**'ye OTA gider.

## Kapsam Dışı (YAGNI)
- Günler arası gezinme (◀ ▶ / swipe) — ayrı feature.
- Karb/yağ hedefleri (DB'de yok).
- Mevcut grafiklerin (WeightLineChart, BarChart, Heatmap) svg'ye migrasyonu — ayrı iş.
- Öğün düzenleme/silme akışında değişiklik (mevcut korunur).

## Başarı Kriterleri
- Hero: kalori halkası alınan/hedef'i doğru gösterir; ortada kalori + kalan; makro satırı protein (çubuk)/karb/yağ doğru.
- Halka keskin (svg), accent renkte, tepeden saat yönünde dolar.
- Öğünler sadeleşti; ekle/AI Tara navigasyonu eskisi gibi çalışır.
- Boş gün çökmeden açılır.
- `tsc` temiz; yeni APK build kurulunca halka görünür; sonraki değişiklikler OTA (1.0.2).
