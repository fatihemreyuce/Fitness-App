# Fitness App — Kod İnceleme Raporu (Agent Team)

**Tarih:** 2026-06-11
**Yöntem:** Claude Code Agent Teams — `fitness-review` takımı, 3 paralel read-only inceleyici (security-auth, frontend, datalayer)
**Durum:** İnceleme tamamlandı, düzeltmeler BEKLİYOR (yarın devam)

---

## 🔴 Kritik / Hemen Yapılmalı

### 1. Gömülü Supabase ANON_KEY (Güvenlik) — ✅ KAPATILDI (by design, false positive)
- **Dosya:** `mobile/eas.json:17-19,28-30` ve `mobile/.env`
- **Sorun (iddia):** Supabase ANON_KEY ve URL build config'e gömülü → APK içine ve git geçmişine sızabilir.
- **2026-06-12 değerlendirme:** Gerçek açık DEĞİL. JWT payload `"role":"anon"` → Supabase'in public/anonim anahtarı; client'a gömülmesi tasarım gereği güvenli. Güvenlik RLS'ten gelir (tüm tablolarda açık, doğrulandı). `service_role` client'ta yok. Ayrıca `EXPO_PUBLIC_` prefix'i değeri zaten bundle'a inline eder → EAS Secrets'a taşımak güvenliği değiştirmez. `mobile/.env` git'te takip edilmiyor.
- **Karar:** Düzeltme yapılmadı. Opsiyonel modernizasyon: yeni `sb_publishable_...` anahtar formatı (güvenlik değil).

### 2. `userData.user!.id` non-null assertion (Veri) — ✅ DÜZELTİLDİ (2026-06-12)
- **Dosya:** `mobile/src/lib/queries.ts` (10 çağrı yeri)
- **Sorun:** `getUser()` `{ user: null }` dönebilir; null kontrolü yok → oturum yoksa çöker.
- **Yapılan:** Tek `requireUserId()` helper'ı eklendi (null ise "Oturum bulunamadı" hatası fırlatır). 10 çağrı yerinin tamamı `await requireUserId()` kullanacak şekilde güncellendi. `tsc --noEmit` temiz.

### 3. React Query cache invalidation hatası (Frontend) — ✅ KAPATILDI (by design, false positive)
- **Dosya:** `mobile/src/lib/queries.ts` (useFoods / useAddCustomFood)
- **Sorun (iddia):** Arama `['foods', search]` key'iyle cache'leniyor ama `useAddCustomFood` sadece `['foods']` invalidate ediyor → yeni eklenen yemek aramada görünmüyor.
- **2026-06-12 değerlendirme:** Gerçek bug DEĞİL. React Query v5.101.0'da `invalidateQueries({ queryKey: ['foods'] })` varsayılan **prefix eşleşmesi** yapar → `['foods', search]` key'lerini de kapsar ve aktif sorguyu otomatik refetch eder. Mevcut kod doğru çalışıyor.
- **Karar:** Kod değişmedi; davranışı belgeleyen açıklama yorumu eklendi.

---

## 🟠 Yüksek / Orta

### 4. `parseISODate()` geçersiz tarihi sessizce kabul (Veri)
- **Dosya:** `mobile/src/lib/stats.ts:18-20`
- **Sorun:** `'2024-13-45'` hata vermeden sonraki aya kayıyor.
- **Düzeltme:** Date kurmadan önce ay 1-12, gün 1-31 doğrula.

### 5. Güvensiz tip cast'leri (Veri)
- **Dosya:** `mobile/src/lib/queries.ts:71,97,189,265,282,307,361`
- **Sorun:** `as unknown as Type` — Supabase yanıtı runtime'da doğrulanmıyor; nested ilişkiler null/bozuk olabilir.
- **Düzeltme:** Zod/io-ts şema doğrulaması ekle.

### 6. Nutrition tarih state donuyor (Frontend)
- **Dosya:** `mobile/src/app/(app)/nutrition.tsx:23`
- **Sorun:** `useState(todayISO())` mount'ta bir kez set ediliyor, navigasyon/gün değişiminde güncellenmiyor.
- **Düzeltme:** `useFocusEffect` veya `useLocalSearchParams` ile focus'ta yenile.

### 7. Profile ekranı race condition (Frontend)
- **Dosya:** `mobile/src/app/(app)/profile.tsx:19-23`
- **Sorun:** `display_name` React Query dışında doğrudan `supabase.from()` ile çekiliyor → cache bypass + mutation ile race.
- **Düzeltme:** `queries.ts`'e `useDisplayName` hook'u ekle.

### 8. Profiles DELETE politikası yok (Güvenlik)
- **Dosya:** `supabase/migrations/...create_initial_schema.sql`, `cloud-setup.sql`
- **Sorun:** SELECT/INSERT/UPDATE var, DELETE yok → kullanıcı kendi profilini silemiyor (KVKK).
- **Düzeltme:** `create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);` ekle ya da tasarım gereği olduğunu belgele.

### 9. E-posta doğrulaması yok (Güvenlik)
- **Dosya:** `mobile/src/app/(auth)/signup.tsx:14-19`
- **Düzeltme:** Supabase auth ayarlarında e-posta onayını zorunlu kıl.

---

## 🟡 Düşük / Cila

- **`workoutVolume()` NaN/negatif koruması yok** — `stats.ts:41,49,73` → `reps>0 && weight_kg>0 && isFinite()` kontrolü ekle.
- **`weightSummary()` NaN guard yok** — `stats.ts:187` → UI'a yayılıyor (`WeightSection:92`); çıkarmadan önce `isFinite()`.
- **Kalori hesabı `quantity_g` doğrulaması yok** — `queries.ts:282-284`.
- **Timezone/DST ele alınmamış** — `queries.ts:175,195` → UTC kullan.
- **`StatsSection` memoize değil** — `heatmap()`/`volumeTrend()` her render'da çalışıyor; `useMemo` ekle.
- **Accessibility label yok** — `src/components/ui/*` → ekran okuyucu için `accessibilityLabel` ekle.
- **Signup şifre ipucu** — "en az 6 karakter" yazıyor, Supabase varsayılanı 8; mesajı düzelt.

---

## ✅ İyi Olanlar (dokunma)
- Tüm tablolarda RLS açık, `auth.uid()` ile tutarlı izolasyon.
- `service_role` anahtarı client'ta yok.
- Google OAuth güvenli ID-token akışı.
- Theme/tasarım token'ları merkezi (`src/theme/index.ts`), expo-router yapısı düzgün.

---

## Yarın için öneri
Sıra: **Kritik 1-2-3** → 4-5 (veri güvenliği) → 6-7 (frontend state) → cila.
İstersen yazma yetkili bir "fix" agent team kur: her teammate ayrı dosya seti sahibi olsun (datalayer / frontend / supabase) → dosya çakışması olmaz.
