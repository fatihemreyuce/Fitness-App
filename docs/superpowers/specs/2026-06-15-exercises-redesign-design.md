# Egzersizler — Profesyonel Yeniden Tasarım (Design Spec)

**Tarih:** 2026-06-15
**Durum:** Onaylandı (brainstorming — görsel companion ile)

## Amaç

Mevcut **Egzersizler** sekmesi (`exercises.tsx`) ilkel: tepede kalabalık bir inline ekleme formu, arama/filtre yok, düz kartlar, egzersize dokununca hiçbir şey olmuyor. Bunu profesyonel bir **hibrit** ekrana dönüştür: **ara + filtrele + yönet + dokun→zengin detay (geçmiş/PR/trend)**.

Tüm değişiklikler **pure-View + JS** → yeni native modül yok → **OTA ile yayınlanabilir** (APK build gerekmez).

## Kapsam Kararları (brainstorming çıktısı)

- **Ekranın işi:** D — Hibrit (ara + yönet + detay).
- **Liste düzeni:** A — Arama + yatay kas-grubu filtre çipleri + düz liste; her satırda sağda "son kaldırılan ağırlık".
- **Detay:** Zengin — PR + tahmini 1RM + son ne zaman + ağırlık trend grafiği + geçmiş listesi.
- **Taksonomi:** A — önceden tanımlı kas grupları + ekipman presetleri. **DB migration yok**; mevcut serbest-metin değerler okuma anında normalize edilir.
- **Favori (★):** v1 **kapsam dışı** (yeni DB kolonu gerektirir). Liste ⭐ = "senin eklediğin egzersiz" (mevcut `owner_id`). Sonra eklenebilir.

## Mimari

Üç ekran + ayrıştırılmış parçalar. Yeni DB tablosu/kolonu yok, yeni native bağımlılık yok.

### Ekran 1 — `exercises.tsx` (yeniden yazılır): Liste
- **Arama** kutusu (ada göre, case-insensitive).
- Yatay **kas-grubu filtre çipleri**: `Tümü` + kanonik gruplar. Sadece veride karşılığı olan gruplar gösterilir (boş çip yok); `Tümü` her zaman var.
- **FlatList** — her satır = `ExerciseRow`:
  - Sol: `ad` (custom ise yanında ⭐) / altında `kas · ekipman`
  - Sağ: **son kaldırılan ağırlık** (örn. `60 kg`) + `›` chevron. Geçmiş yoksa ağırlık yerine `—`.
  - Dokun → `exercise/[id]` detayına gider.
- Başlıkta/üstte **"+ Egzersiz"** aksiyonu → `new-exercise`. (Kalabalık inline form kaldırılır.)
- Boş liste: mevcut `EmptyState` primitive'i.

### Ekran 2 — `exercise/[id].tsx` (yeni): Zengin Detay
- **Başlık:** ad, `kas · ekipman`. Custom (`owner_id` = aktif kullanıcı) ise **Düzenle** (→ `new-exercise?id=`) ve **Sil** aksiyonları.
- **3 istatistik chip'i** (mevcut `StatChip`):
  - **Rekor (PR):** geçmişteki en ağır set ağırlığı.
  - **Tahmini 1RM:** en iyi setin Epley tahmini `w*(1+reps/30)`, yuvarlanmış.
  - **Son:** en son yapıldığı tarihten "X gün önce".
- **Ağırlık trend grafiği:** mevcut `WeightLineChart` yeniden kullanılır (`points = seans başına en ağır set ağırlığı`, kronolojik).
- **Geçmiş listesi:** seansa göre gruplu — tarih + set sayısı + toplam hacim + `ağırlık×tekrar` satırları (örn. `60×8 · 60×6 · 55×8`).
- **Boş durum:** hiç geçmiş yoksa PR/1RM/grafik yerine tek bir `EmptyState`: "Henüz bu egzersizle antrenman yok."

### Ekran 3 — `new-exercise.tsx` (yeni): Ekle / Düzenle
- `?id=` paramı yoksa **ekle**, varsa **düzenle** modu (mevcut değerleri doldurur).
- Alanlar: `ad` input + **kas grubu preset picker** (çip seçimi) + **ekipman preset picker** (çip seçimi, opsiyonel — "Belirtilmemiş" seçilebilir).
- `new-food`/`new-workout` ekran pattern'iyle tutarlı. `(app)/_layout.tsx`'e `href: null` ile eklenir.
- Düzenleme yalnızca custom (kullanıcının kendi) egzersizlerinde; global egzersizler salt-okunur.

## Veri Katmanı

### Tipler (mevcut)
`Exercise = { id, name, muscle_group: string, equipment: string | null, owner_id: string | null }`
`WorkoutSet = { id, workout_id, exercise_id, set_number, reps, weight_kg }` (+ tabloda `created_at`).

### `lib/exercises.ts` (yeni — saf, React/Supabase'siz, test edilebilir)
- `MUSCLE_GROUPS`: kanonik liste — `Göğüs, Sırt, Bacak, Omuz, Kol, Karın, Kalça, Kardiyo` (+ `Diğer` fallback).
- `EQUIPMENT`: `Barbell, Dumbbell, Makine, Kablo, Vücut Ağırlığı, Kettlebell, Bant, Diğer`.
- `normalizeMuscle(text): string` — serbest metni kanonik gruba eşler (tr/en + büyük-küçük harf duyarsız; örn. `"chest"|"göğüs"|"GÖĞÜS" → "Göğüs"`). Eşleşmezse `"Diğer"`.
- `normalizeEquipment(text|null): string` — benzeri.
- **Saf hesaplama fonksiyonları** (girdi: bir egzersizin set geçmişi):
  - `personalRecord(sets): number` — `max(weight_kg)`.
  - `estimate1RM(sets): number` — en iyi setin Epley'i `round(w*(1+reps/30))`. Boş → 0.
  - `groupBySession(history): Session[]` — `started_at` (gün) bazında grupla; her seans `{ date, sets, topWeight, volume }`. `volume = Σ(weight×reps)`.
  - `trendPoints(sessions): number[]` — kronolojik `topWeight` dizisi (grafik girdisi).
  - Tüm fonksiyonlar boş/negatif/`NaN` girdilere guard'lı (mevcut kod stiliyle uyumlu).

### `lib/queries.ts` (eklenir)
- `useExercisesWithLastWeight()` — `exercises` + her egzersiz için **son** `weight_kg`. Tek ekstra sorgu: `workout_sets` `.in('exercise_id', ids).order('created_at', desc)` → ilk görülen ağırlık (mevcut `queries.ts:400` pattern'i). `Map<exercise_id, number>` döner.
- `useExerciseHistory(exerciseId)` — `workout_sets.select('reps, weight_kg, set_number, workout:workouts(started_at)').eq('exercise_id', id)` → seans tarihiyle birlikte ham set listesi. Detay ekranı saf helper'larla işler.
- `useUpdateExercise()` — custom egzersizi günceller (`name/muscle_group/equipment`), `['exercises']` invalidate.
- `useDeleteExercise()` — custom egzersizi siler; `['exercises']` invalidate. Silmeden önce onay (`Alert`).

### Bileşenler
- `components/exercises/ExerciseRow.tsx` — liste satırı (ad/kas·ekipman + son ağırlık + chevron).
- `components/exercises/MuscleFilter.tsx` — yatay kas-grubu çipleri (seçili durum).
- `components/exercises/ExerciseHistoryList.tsx` — seans-gruplu geçmiş.
- Grafik: mevcut `WeightLineChart` doğrudan kullanılır (yeni bileşen gerekmez).

## Veri Akışı
1. **Liste:** `useExercisesWithLastWeight()` → arama+çip filtresi (client-side, `normalizeMuscle` ile) → `ExerciseRow`.
2. **Detay:** `useExerciseHistory(id)` → `groupBySession` → `personalRecord`/`estimate1RM`/`trendPoints` → chip'ler + grafik + geçmiş.

## Hata / Boş / Yükleme Durumları
- Yükleme: mevcut "Yükleniyor..." deseni.
- Liste boş / arama sonucu yok: `EmptyState`.
- Detay geçmişi yok: `EmptyState` (grafik/PR gizli).
- Mutation hatası: mevcut `Alert.alert('Hata', …)` deseni.

## OTA
Yeni native modül yok; her şey JS + pure-View. `eas update --platform android` ile yayınlanır (proje notu: env `mobile/.env`'den okunur).

## Agent Team (uygulama aşaması — paralel)
Dosyalar çakışmıyor; orchestrator entegrasyonda tek `tsc` + commit yapar (agent'lar commit etmez):
- **Agent A:** `lib/exercises.ts` (saf helper'lar + taksonomi + hesaplamalar + manuel akıl-yürütme doğrulaması).
- **Agent B:** `lib/queries.ts` hook'ları (history, last-weight, update, delete).
- **Agent C:** `exercises.tsx` liste + `ExerciseRow` + `MuscleFilter`.
- **Agent D:** `exercise/[id].tsx` detay + `ExerciseHistoryList` (WeightLineChart reuse).
- **Agent E:** `new-exercise.tsx` ekle/düzenle + `_layout.tsx`'e `href:null` route.

Interface bu spec'te kilitli: B, A'nın saf tiplerine ve hook imzalarına göre kodlar; C/D/E B'nin hook'larını tüketir.

## Doğrulama Kapısı
Projede test runner yok → `cd mobile && npx tsc --noEmit` + cihaz doğrulaması (OTA sonrası). Saf helper'lar (`lib/exercises.ts`) manuel akıl-yürütme örnekleriyle doğrulanır.

## Kapsam Dışı (YAGNI)
- ★ Favori (DB kolonu gerektirir).
- Egzersiz görselleri / nasıl-yapılır videoları.
- Global egzersiz kataloğu genişletme / tohum verisi.
- Kas grubu serbest-metin DB migration'ı (okuma anında normalize ediyoruz).

## Başarı Kriterleri
- Egzersizler sekmesi: arama + kas-grubu filtresi çalışır; satırlar son ağırlığı gösterir.
- Egzersize dokun → detay: PR, tahmini 1RM, son tarih, trend grafiği, seans-gruplu geçmiş doğru.
- Geçmişi olmayan egzersiz boş-durumla çökmeden açılır.
- Custom egzersiz ekle/düzenle/sil çalışır; preset kas grubu + ekipman seçilir.
- `tsc` temiz; OTA ile yayınlanır.
