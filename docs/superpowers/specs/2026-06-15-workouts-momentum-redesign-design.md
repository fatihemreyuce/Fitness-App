# Antrenmanlar — Momentum Hero + Timeline Redesign (Design Spec)

**Tarih:** 2026-06-15
**Durum:** Onaylandı (brainstorming — görsel companion ile)

## Amaç

Mevcut **Antrenmanlar** ekranı (`index.tsx`) sıkışık/yorucu: dev "+ Yeni Antrenman" butonu, büyük şablon kartı ve tekrar eden büyük geçmiş kartları üst üste, accent yeşil her yerde, nefes alanı yok. Ekranı **momentum** diline taşı: üstte "bu hafta" ilerleme özeti (hero) + sade başlat + geçmiş bir **zaman çizelgesi**. Daha özgün, ferah, motive edici.

## Brainstorming Kararları

- **Yön:** Direction A (kompakt/ferah) → **Momentum Hero + Timeline** (3 yön arasından seçildi).
- **Hero "BU HAFTA":** 7 gün noktası (antrenman günü lime dolu, bugün çerçeveli) + antrenman sayısı + toplam hacim + **🔥 haftalık seri**.
- **Seri tanımı:** Haftalık seri (kesintisiz, ≥1 antrenmanlı ardışık hafta sayısı). "Günlük seri" DEĞİL — dinlenme günleri günlük seriyi sürekli kırar, anlamsız olur.
- **Geçmiş:** Kart yığını yerine **zaman çizelgesi** (sol dikey çizgi + tarih düğümleri).
- **Başlat:** Tek birincil "Antrenmana Başla" butonu (header'da ayrı + butonu yok — tekrarı önler).

## Mimari

### Ekran düzeni (yukarıdan aşağı, `index.tsx`)
1. **Başlık** — `<Text variant="title">Antrenmanlar</Text>` (tek başlık).
2. **`WeekMomentumHero`** — BU HAFTA kartı: 7 gün noktası + `X antrenman` + `Y t hacim` + `🔥 Z hafta`.
3. **"Antrenmana Başla"** — birincil `Button` → `router.push('/(app)/new-workout')`.
4. **`TemplatesSection`** (mevcut, korunur) — yatay şablon şeridi; hafif sadeleştirme opsiyonel.
5. **`WorkoutTimeline`** — "GEÇMİŞ" başlığı + zaman çizelgesi; her düğüm tarih + `set · hacim`, dokun → `router.push('/(app)/workout/[id]')`.

### Bileşenler
- **`components/workouts/WeekMomentumHero.tsx`** (yeni) — props: `dayDots: boolean[]` (7, Pzt–Paz), `todayIndex: number`, `count: number`, `volumeKg: number`, `streakWeeks: number`. Gradient'li kart (mevcut `LinearGradient` kullanılabilir — runtime 1.0.1'de mevcut — VEYA düz `colors.card`; banding riski yok çünkü blok düz). 7 nokta satırı + özet satırı.
- **`components/workouts/WorkoutTimeline.tsx`** (yeni) — props: `items: { id, date: Date, setCount, volumeKg }[]`, `onPress(id)`. Sol `borderLeft` çizgi + her satırda mutlak konumlu düğüm noktası + tarih + `set · hacim`.
- **`TemplatesSection.tsx`** — korunur (içerik aynı). İsteğe bağlı: başlık stili eyebrow'a çevrilir.
- **`WorkoutCard.tsx`** — artık kullanılmıyor → **silinir**.

### Veri katmanı
- **`lib/stats.ts`** (Modify) — saf `weekMomentum(workouts, nowMs)` eklenir:
  - Girdi: `useWorkouts` dönen antrenman dizisi (her biri `started_at` + `workout_sets`), referans `nowMs`.
  - Çıktı: `{ count: number; volumeKg: number; dayDots: boolean[7]; todayIndex: number; streakWeeks: number }`.
  - `count`/`volumeKg`: bu hafta (Pazartesi başlangıç, mevcut `weekStartISO` mantığıyla tutarlı) antrenman sayısı + `workoutVolume` toplamı.
  - `dayDots`: bu haftanın 7 gününde (Pzt–Paz) antrenman var mı.
  - `streakWeeks`: bugünden geriye kesintisiz ≥1 antrenmanlı hafta sayısı.
  - Saf, React/Supabase'siz; manuel akıl-yürütme örnekleriyle doğrulanır.
- Hero + timeline ikisi de mevcut **`useWorkouts`** (set'ler gömülü) + **`workoutSummary`** kullanır. Yeni sorgu/tablo yok.

## Veri Akışı
1. `index.tsx` → `useWorkouts()` → `weekMomentum(workouts, Date.now())` → `WeekMomentumHero`.
2. Aynı `workouts` → her biri için `workoutSummary(workout_sets)` → `WorkoutTimeline` item'ları.

## Hata / Boş / Yükleme
- Yükleme: mevcut "Yükleniyor..." deseni.
- Hiç antrenman yok: hero sıfır değerlerle ("0 antrenman", noktalar boş) + timeline yerine mevcut `EmptyState` ("Henüz antrenman yok").

## OTA
Yeni native modül yok (pure-View; `LinearGradient` zaten 1.0.1 APK'da gömülü). `eas update --branch preview --platform android` ile **runtime 1.0.1**'e yayınlanır, build gerekmez.

## Kapsam Dışı (YAGNI)
- Takvim/aylık görünüm (Direction 2 elendi).
- Antrenman filtreleme/arama.
- Hero'da düzenlenebilir hedefler.

## Başarı Kriterleri
- Ekran ferahladı: hero + sade başlat + şablon şeridi + timeline; tekrar eden büyük kartlar gitti.
- Hero "bu hafta" doğru gösterir: gün noktaları, antrenman sayısı, hacim, haftalık seri.
- Geçmiş timeline taranabilir; düğüme dokun → antrenman detayı açılır.
- Şablon başlat/sil ve detay navigasyonu eskisi gibi çalışır.
- `tsc` temiz; OTA ile yayınlanır.
