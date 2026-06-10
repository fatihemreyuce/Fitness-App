# Kilo Takibi (Body Weight Tracking) — Tasarım

**Tarih:** 2026-06-10
**Durum:** Onaylandı, plana geçiliyor
**Proje:** fitness-app / mobile (Expo SDK 54)

## Amaç

Kullanıcının vücut kilosunu günlük kaydedip trendini ve hedefe ilerlemesini
görmesini sağlamak. Profil ekranına bir "Kilo Takibi" kartı eklenir.

## Kararlar (brainstorm + görsel companion çıktısı)

- **Granülerlik:** Günde bir değer. Aynı güne tekrar girilirse üstüne yazılır
  (upsert; sabah-tartısı mantığı). `body_weights` tablosunda `(user_id, entry_date)`
  benzersiz.
- **Grafik:** Çizgi grafiği, **saf View ile yaklaşık** (nokta + aralarına açıyla
  döndürülmüş ince View segmentleri). `react-native-svg` KULLANILMAZ (native =
  OTA'yı bozar). Kilo az değiştiği için ölçek penceredeki min–max arasına
  yakınlaştırılır (sıfırdan değil). → **OTA-safe.**
- **Hedef kilo:** `profiles.target_weight_kg` (nullable). Kartta "Hedef X kg ·
  Y kg kaldı" + grafikte ince yatay hedef çizgisi. Kart içinden ayarlanır.
- **Düzenlenebilir geçmiş:** Grafiğin altında son kayıtlar listesi + her satırda
  silme. (Upsert aynı günü düzeltir; bu liste geçmiş günleri silmek için.)
- **Yerleşim:** Profil ekranında (`profile.tsx`) tek bir "Kilo Takibi" kartı
  (mevcut Hedefler kartı + StatsSection ile aynı `<Screen scroll>` içinde).

## Mimari / Akış

```
Ekle:   kart içi input "Bugünkü kilo" → upsert body_weights(user_id, bugün, kg)
Sil:    son kayıtlar listesinde 🗑 → delete by id (onay)
Hedef:  kart içi "🎯 Hedef kilo" input → profiles.target_weight_kg güncelle
Göster: useBodyWeights() (artan tarih) → saf helper'lar current/değişim + grafik
        serisi; useTargetWeight() → hedef satırı + grafik hedef çizgisi
```

`useCreateWorkout`, auth, mevcut hiçbir şey değişmez. Yeni, izole bir bölüm.

## Veri Modeli

`food_entries` desenini izler (per-user, `entry_date date`), per-user RLS.
Yeni migration: `supabase/migrations/<ts>_create_body_weights.sql`.

```sql
create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)            -- upsert anahtarı
);
-- RLS: select/insert/update/delete where user_id = auth.uid()
-- index: body_weights(user_id, entry_date)

alter table public.profiles add column target_weight_kg numeric;  -- nullable, hedef kilo
```

## Bileşenler / Kod Değişiklikleri

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `supabase/migrations/<ts>_create_body_weights.sql` | tablo + RLS + index + profiles kolonu | Create |
| `mobile/src/lib/stats.ts` | saf `weightSummary` (current + 7-gün değişim) + `weightChartPoints` | Modify |
| `mobile/src/lib/queries.ts` | `useBodyWeights`, `useUpsertBodyWeight`, `useDeleteBodyWeight`, `useTargetWeight`, `useUpdateTargetWeight` | Modify |
| `mobile/src/components/charts/WeightLineChart.tsx` | saf-View çizgi grafiği (nokta + döndürülmüş segment + hedef çizgisi) | Create |
| `mobile/src/components/WeightSection.tsx` | "Kilo Takibi" kartı (tüm parçaları birleştirir) | Create |
| `mobile/src/app/(app)/profile.tsx` | `WeightSection` ekle | Modify |

### Saf-View çizgi grafiği (WeightLineChart) yaklaşımı
- Props: `points: number[]` (kronolojik), `goal?: number`, `height` (≈96).
- Genişlik `onLayout` ile alınır (W). Ölçek: `min/max = points (+goal) min–max`,
  küçük bir tampon eklenir; `y(v) = H − ((v−min)/(max−min))·H`, `x(i)=(i/(n−1))·W`.
- Her nokta: küçük daire (absolute View, borderRadius).
- Her ardışık çift: bir segment View — `width=mesafe`, `height≈2`, orta noktaya
  konumlanır, `transform:[{rotate: atan2(dy,dx)}]`.
- Hedef çizgisi: `goal` varsa `y(goal)`'de ince yatay (kesik görünümlü) View.
- Tek nokta / boş seri → sadece nokta veya "yeterli veri yok" durumu.

### Hooks
- `useBodyWeights()`: `body_weights` artan `entry_date`. List ekranı son→eski
  için `.reverse()` alır; grafik kronolojik kullanır.
- `useUpsertBodyWeight()`: `upsert({...}, { onConflict: 'user_id,entry_date' })`,
  invalidate `['body_weights']`.
- `useDeleteBodyWeight()`: delete by id, invalidate `['body_weights']`.
- `useTargetWeight()`: `profiles.target_weight_kg` okur.
- `useUpdateTargetWeight()`: yalnız `target_weight_kg` günceller (mevcut
  `useUpdateGoals`'a dokunmaz — kalori/protein hedefleri ayrı kalır), invalidate
  `['target_weight']`.

### Saf helper'lar (stats.ts)
- `weightSummary(entries)` → `{ current: number | null, change7d: number | null }`
  (current = en yeni; change7d = current − ~7 gün önceki en yakın kayıt).
- `weightChartPoints(entries, days)` → son `days` günün kronolojik `number[]`'i
  (grafik için). Saf, React/Supabase yok.

## Edge Case'ler
- **Kayıt yok:** kart "Henüz kilo kaydı yok — bugünkü kilonu ekle" + boş grafik.
- **Tek kayıt:** grafik tek nokta (segment yok); değişim gösterilmez.
- **Hedef yok:** "Hedef" satırı ve hedef çizgisi gizli; sadece ekleme + grafik.
- **Geçersiz giriş:** boş/0/negatif kilo → uyarı, kayıt yok.
- **Aynı gün tekrar:** upsert üstüne yazar (yeni satır oluşmaz).
- **Geçmiş silme:** onay Alert'i sonrası silinir.

## Kapsam Dışı (YAGNI / v1)
- Birim seçimi (lb/kg) — sadece kg.
- Gün-içi çoklu tartı / saatli log.
- Geçmiş bir günün tarihini değiştirme (sadece bugünü ekle + sil; düzeltme=sil+ekle).
- Kilo bazlı bildirim/hatırlatma.

## Doğrulama
- `npx tsc --noEmit` yeşil + `npx expo-doctor` 18/18.
- Migration'ı Supabase'e uygula.
- Görsel kabul:
  1. Profil → Kilo Takibi kartı görünür.
  2. Bugünkü kilo ekle → güncel kilo + grafik güncellenir; aynı gün tekrar ekle →
     üstüne yazar (yeni satır yok).
  3. Birkaç gün ekle → çizgi grafik trendi gösterir; hedef ayarla → "X kg kaldı" +
     hedef çizgisi görünür.
  4. Son kayıtlar listesinden sil → kart güncellenir.

## OTA Notu
Native bağımlılık YOK (grafik saf View). Yalnız JS + Supabase migration.
`eas update --branch preview --platform android` ile OTA. **DİKKAT:** `eas update`
env'i `mobile/.env`'den okur; o dosyada `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` dahil
3 anahtar bulunmalı (Google login kodu main'de). Migration önce uygulanmalı.
