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

### 4. `parseISODate()` geçersiz tarihi sessizce kabul (Veri) — ⏸️ ERTELENDİ (düşük risk)
- **Dosya:** `mobile/src/lib/stats.ts:18-20`
- **Sorun:** `'2024-13-45'` hata vermeden sonraki aya kayıyor.
- **2026-06-12 değerlendirme:** Bu fonksiyona giden tüm tarihler makine üretimi (`todayISO()`, `weekStartISO()`, DB `entry_date` kolonu — hep geçerli YYYY-MM-DD). Geçersiz girdi hiçbir çağırandan ulaşamıyor. Savunma amaçlı; öncelik düşük. Değişiklik yapılmadı.

### 5. Güvensiz tip cast'leri (Veri) — ❎ YAPILMAYACAK (bu bağlamda over-engineering)
- **Dosya:** `mobile/src/lib/queries.ts` (nested select cast'leri)
- **Sorun:** `as unknown as Type` — Supabase yanıtı runtime'da doğrulanmıyor.
- **2026-06-12 değerlendirme:** `as unknown as` Supabase nested ilişkilerde standart pratik (üretilen tipler nested select'i tam modellemiyor). Gerçek null riski olan yerlerde zaten guard var (`entryMacros` `!e.food`, `useNutritionWeek` `r.food ?`). Kişisel app + kontrollü şema için her yere Zod eklemek ağır. Yapılmadı.

### 6. Nutrition tarih state donuyor (Frontend) — ✅ DÜZELTİLDİ (2026-06-12)
- **Dosya:** `mobile/src/app/(app)/nutrition.tsx`
- **Sorun:** `useState(todayISO())` mount'ta bir kez set ediliyor; gece yarısını geçince "Bugün" eski günde donuyor.
- **Yapılan:** `useFocusEffect(useCallback(() => setDate(todayISO()), []))` — ekran her odaklandığında tarih tazeleniyor.

### 7. Profile ekranı race condition (Frontend) — ✅ DÜZELTİLDİ (2026-06-12)
- **Dosya:** `mobile/src/app/(app)/profile.tsx`, `mobile/src/lib/queries.ts`
- **Sorun:** `display_name` React Query dışında doğrudan `supabase.from()` ile çekiliyor → cache bypass.
- **Not:** "Mutation race" abartılıydı (display_name hiç mutate edilmiyor) ama bypass tutarsızdı.
- **Yapılan:** `useDisplayName()` hook'u eklendi; component artık doğrudan supabase çağırmıyor, `useEffect`+local state kaldırıldı.

### 8. Profiles DELETE politikası yok (Güvenlik) — ⏸️ ERTELENDİ
- **Dosya:** `supabase/migrations/...create_initial_schema.sql`, `cloud-setup.sql`
- **Sorun:** SELECT/INSERT/UPDATE var, DELETE yok.
- **2026-06-12 değerlendirme:** Uygulamada **hesap silme özelliği yok** → politikayı kullanacak akış yok. Migration açmak erken. Hesap silme özelliği eklenince birlikte yapılacak.

### 9. E-posta doğrulaması yok (Güvenlik) — ✅ KISMEN DÜZELTİLDİ (kod tarafı)
- **Dosya:** `mobile/src/app/(auth)/signup.tsx`
- **Sorun:** Onay açık olsa bile mesaj "Giriş yapabilirsin" diyordu (yanlış).
- **Yapılan:** `signUp` `data.session` null dönerse (onay gerekiyor) "E-postanı doğrula" mesajı gösteriliyor; aksi halde başarı. Onayın zorunlu kılınması Supabase dashboard ayarı (kod dışı) — kullanıcı kontrol etmeli.

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
