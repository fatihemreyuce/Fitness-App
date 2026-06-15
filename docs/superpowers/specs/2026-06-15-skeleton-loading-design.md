# Skeleton Loading + Smooth Auth Geçişi (Design Spec)

**Tarih:** 2026-06-15
**Durum:** Onaylandı (brainstorming — görsel companion ile)

## Amaç

İki UX iyileştirmesi:
1. **Loading durumları:** Şu an 5 ekranda yükleme sırasında yalnız sol-üstte "Yükleniyor..." yazısı çıkıyor (boş ekran, kötü his). Bunları ekranın gerçek düzenini taklit eden **skeleton (iskelet) placeholder**'larla değiştir.
2. **Auth geçişi:** Welcome → Kayıt/Giriş geçişi sert slide; hero foto zıplıyor. **Fade** geçişiyle yumuşat.

İkisi de **OTA-safe** (pure-JS `Animated` + Stack config; yeni native modül yok) → runtime 1.0.2'ye OTA, build gerekmez.

## Brainstorming Kararları

- **Loading stili:** B · Skeleton shimmer (spinner yerine — premium, "içerik geliyor" hissi).
- **Animasyon:** Opaklık nabzı (0.4↔1 döngü) — basit, OTA-safe, layout ölçümü gerektirmez (gradient sweep yerine).
- **Auth geçişi:** Stack `animation: 'fade'`.
- **Kapsam:** 5 ana ekran + auth. `StatsSection` iskeleti kapsam dışı (sonra).

## Mimari

### Shimmer primitive
**`components/ui/Skeleton.tsx`** — animasyonlu placeholder kutusu.
- Props: `width: number | string`, `height: number`, `radius?: number` (varsayılan 8).
- RN `Animated.Value` + `Animated.loop(Animated.sequence([timing→0.4, timing→1]))` ile opaklık nabzı (~900ms). `useNativeDriver: true` (opacity native-driver uyumlu).
- Renk: `colors.cardAlt` zemin. `useEffect` ile mount'ta başlar, unmount'ta durur.

### Ekran-bazlı iskeletler (`components/skeletons/`)
Her biri ilgili ekranın düzenini `Skeleton` kutularıyla taklit eder; hepsi `<Screen>` içinde döner.
- **`WorkoutsSkeleton.tsx`** — başlık çubuğu + hero bloğu (büyük kutu) + buton kutusu + 4 timeline satırı (nokta + çizgi hizası).
- **`ExercisesSkeleton.tsx`** — başlık + arama kutusu + yatay çip şeridi (3-4 pill) + 6 liste satırı.
- **`NutritionSkeleton.tsx`** — tarih çubuğu + ortada dairesel **halka placeholder** (yuvarlak kutu) + 3 makro çubuğu + 2-3 öğün bloğu.
- **`DetailSkeleton.tsx`** — başlık + istatistik satırı (3 kutu) + 4-5 satır. Antrenman & egzersiz detay ekranlarında ortak.

### Ekran bağlama (Modify)
`if (isLoading) return <Screen><Text>Yükleniyor...</Text></Screen>` → ilgili skeleton:
- `app/(app)/index.tsx` → `WorkoutsSkeleton`
- `app/(app)/exercises.tsx` → `ExercisesSkeleton`
- `app/(app)/nutrition.tsx` → `NutritionSkeleton`
- `app/(app)/workout/[id].tsx` → `DetailSkeleton`
- `app/(app)/exercise/[id].tsx` → yükleme (`isLoading && !exercise`) durumunda `DetailSkeleton`; "Egzersiz bulunamadı." hali korunur.

### Auth geçişi (Modify)
`app/(auth)/_layout.tsx`:
```tsx
<Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
```
Welcome ↔ Giriş/Kayıt cross-fade → hero zıplamaz. `animation` react-native-screens üstünden (mevcut bağımlılık), OTA-safe.

## Veri Akışı
Değişmez. Sadece `isLoading === true` dalındaki sunum değişir. Yüklenince mevcut içerik render edilir (bağlama aynı).

## Hata / Boş Durumları
- İskeletler yalnız `isLoading` sırasında. Hata/boş durumlar (EmptyState, "bulunamadı") değişmez.
- Skeleton animasyonu unmount'ta durdurulur (sızıntı yok).

## OTA
Yeni native modül yok → **runtime 1.0.2**'ye `eas update --branch preview --platform android` ile yayınlanır, build gerekmez. (Kullanıcı v1.0.2 APK'sını kurmuş olmalı.)

## Kapsam Dışı (YAGNI)
- `StatsSection` (Profil/Aktivite) iskeleti.
- Kayan parıltı (gradient sweep) animasyonu.
- Kök boot spinner / scan-food analiz kartı / Button spinner'ları (zaten uygun).
- add-food "Aranıyor…" (uygun inline pattern).

## Başarı Kriterleri
- 5 ekran yüklenirken ekranın düzenini taklit eden, nabız atan iskeletler görünür (düz "Yükleniyor..." yazısı gitti).
- Welcome → Kayıt/Giriş geçişi fade; hero foto zıplamaz.
- Yüklenince içerik sorunsuz gelir; animasyon sızıntısı yok.
- `tsc` temiz; OTA ile yayınlanır (build gerekmez).
