# Antrenman Şablonları (Routines) — Tasarım

**Tarih:** 2026-06-10
**Durum:** Onaylandı, plana geçiliyor
**Proje:** fitness-app / mobile (Expo SDK 54)

## Amaç

Her antrenmanı sıfırdan girmek yorucu. Şablonlar, sık yapılan antrenmanları
(örn. "Push Day") kaydedip tek dokunuşla ön-dolu olarak yeniden başlatmayı sağlar.

## Kararlar (brainstorm + görsel companion çıktısı)

- **İçerik:** Şablon = egzersiz iskeleti + setler. Her şablon seti kaydedildiği
  andaki tekrar/kilo değerini "yedek" (baseline) olarak saklar.
- **İlerleme modeli — B (akıllı):** Şablonu açınca her egzersiz için **son
  antrenmandaki kilo** ön-dolu gelir; o egzersizin geçmişi yoksa şablon yedeği
  kullanılır. (A=donuk ve C=hibrit elendi.)
  - **Tam kural:** her set için → **tekrar** = şablonun hedef tekrarı; **kilo** =
    o egzersizi en son yaptığın antrenmandaki kilo (o egzersizin tüm setlerine
    aynı uygulanır); geçmiş yoksa → şablonun kayıtlı yedek kilosu.
- **Oluşturma:** Antrenman **detay** ekranında "Şablon olarak kaydet" → isim sor
  → o antrenmanın setlerini şablona kopyala. (Sıfırdan editör v1 dışı.)
- **Erişim:** Antrenman ana ekranında (`index.tsx`) üstte "⚡ Şablonlarım" yatay
  şeridi. Kart: lime sol kenar, isim, egzersiz çipleri, "N egzersiz · M set",
  "Başla" butonu. Karttan silme.
- **Başlatma:** "Başla" → `new-workout` **doğrudan ön-dolu** açılır (araya detay
  ekranı yok) → kullanıcı düzeltir → mevcut "Kaydet" akışıyla normal antrenman
  olarak kaydedilir (kayıt mantığı değişmez).

## Mimari / Akış

```
Oluştur:  [Antrenman detay] "Şablon olarak kaydet" → isim → kopyala
          workout_sets → workout_template_sets (reps→target_reps, weight→target_weight_kg)

Başlat:   [Ana ekran] "Şablonlarım" şeridi → kart "Başla"
          → router.push(`/new-workout?templateId=...`)
          → new-workout: şablon setlerini yükle + her egzersiz için son kiloyu çek
          → draft setleri ön-doldur → kullanıcı düzeltir → useCreateWorkout (mevcut)
```

`auth.tsx`, `supabase.ts` ve `useCreateWorkout` değişmez. Kayıt akışı aynı kalır;
şablon yalnızca draft'ı ön-dolduran yeni bir giriş noktasıdır.

## Veri Modeli (2 yeni tablo)

`workouts`/`workout_sets` desenini birebir izler, per-user RLS. Yeni migration:
`supabase/migrations/<ts>_create_workout_templates.sql`.

```sql
create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
-- RLS: select/insert/update/delete where user_id = auth.uid()

create table public.workout_template_sets (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number int not null check (set_number > 0),
  target_reps int not null check (target_reps >= 0),
  target_weight_kg numeric not null default 0 check (target_weight_kg >= 0),
  created_at timestamptz not null default now()
);
-- RLS: sahiplik ilgili template üzerinden (workout_sets'in workout üzerinden
-- kontrolüyle aynı desen); exercise_id insert'te public-or-own kontrolü.
-- index: workout_template_sets(template_id), workout_templates(user_id)
```

## Bileşenler / Kod Değişiklikleri

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `supabase/migrations/<ts>_create_workout_templates.sql` | 2 tablo + RLS + index | Create |
| `mobile/src/lib/queries.ts` | `useTemplates()`, `useCreateTemplateFromWorkout()`, `useDeleteTemplate()`, `useTemplateDraft(id)` (şablon setleri + son-kilo çözümlemesi → DraftSet[]) | Modify |
| `mobile/src/components/workouts/TemplateCard.tsx` | Tek şablon kartı (saf View, lime kenar) | Create |
| `mobile/src/components/workouts/TemplatesSection.tsx` | Yatay "Şablonlarım" şeridi (boşsa gizli/placeholder) | Create |
| `mobile/src/app/(app)/index.tsx` | `TemplatesSection` ekle | Modify |
| `mobile/src/app/(app)/workout/[id].tsx` (antrenman detay) | "Şablon olarak kaydet" butonu + isim sorma (basit modal — `Alert.prompt` iOS-only olduğundan platform-bağımsız bir Input'lu modal/Sheet) | Modify |
| `mobile/src/app/(app)/new-workout.tsx` | opsiyonel `templateId` param → draft ön-doldur | Modify |

Tüm yeni bileşenler saf `<View>` (mevcut WorkoutCard/StatChip deseni), OTA-safe.

### B modeli "son kilo" çözümlemesi (queries.ts)

`useTemplateDraft(templateId)`:
1. `workout_template_sets` çek (exercise_id, set_number, target_reps, target_weight_kg + exercise adı).
2. Şablondaki benzersiz egzersizler için, o egzersizi içeren **en son** workout'un
   set kilolarını bul (workout_sets ⋈ workouts, started_at desc, ilk eşleşme).
3. Her şablon setini DraftSet'e çevir: `reps = target_reps`,
   `weight_kg = sonKilo[exercise_id] ?? target_weight_kg`.
4. `exercise_name` join'den; egzersiz silinmişse o seti atla.

## Edge Case'ler

- **Geçmiş yok:** yeni egzersiz → yedek (target_weight_kg) kullanılır.
- **Egzersiz silinmiş:** join null → o set atlanır (nadir; egzersizler public/own).
- **Boş isim:** varsayılan ("Antrenman" / tarih).
- **Şablon yok:** "Şablonlarım" şeridi gizli ya da "Henüz şablon yok" notu.
- **Yükleme durumu:** ön-dolu hesaplanırken kısa loading.

## Kapsam Dışı (YAGNI / v1)

- Şablon yeniden adlandırma / düzenleme (sadece oluştur + sil).
- Sıfırdan şablon editörü.
- Şablon sıralama / favoriler.
- Hedefe ulaşma takibi ("12 set planladın, 10 yaptın").

## Doğrulama

- `npx tsc --noEmit` yeşil + `npx expo-doctor` temiz (18/18).
- Migration'ı Supabase'e uygula (`supabase db push` veya dashboard).
- Görsel kabul:
  1. Antrenman yap → detayda "Şablon olarak kaydet" → isim ver.
  2. Ana ekranda "Şablonlarım"da kart görünür (isim, çipler, sayılar).
  3. "Başla" → new-workout ön-dolu; ağırlıklar son antrenmandan gelir.
  4. Düzelt → Kaydet → normal antrenman olarak listede.
  5. Şablonu sil → karttan kaybolur.

## OTA Notu

Native bağımlılık YOK. Yalnız JS (ekran/bileşen/sorgu) + Supabase migration
(sunucu tarafı). Yeni APK gerekmez — `eas update --branch preview --platform android`
ile OTA dağıtılır. (Migration'ın önce Supabase'e uygulanması şart.)
