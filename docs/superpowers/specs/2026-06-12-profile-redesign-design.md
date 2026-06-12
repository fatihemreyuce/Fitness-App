# Profil Ekranı Yeniden Tasarımı (Birleşik) — Tasarım Spec'i

**Tarih:** 2026-06-12
**Durum:** Tasarım onaylandı (kullanıcı), Faz 1 implementasyona hazır
**Bağlam:** 4 paralel agent konsepti (Pano / Sessiz Sayfa / Momentum / Kontrol Paneli) → kullanıcı "hepsi" dedi → tek tutarlı hibride sentezlendi. Kaynak: `DESIGN-AUDIT-2026-06-12.md` + 4 konsept.

---

## Amaç

Profil ekranını 5+ eşit-ağırlıklı kart yığınından, **ilerlemeyi hissettiren + hızlı yönetilen** tek tutarlı bir ekrana çevirmek. Üst yarı "hisset" (kilo ilerlemesi, motivasyon), alt yarı "yönet" (hedefler, hesap). Görsel dil tüm app'e temel olacak bir tasarım sistemiyle kurulur.

**Tasarım tezi:** Hiyerarşi renk/kutu yerine **tipografi + boşluk + hairline** ile; en önemli kişisel metrik (kilo) **kahraman**; motivasyon **accent renginin ödül anları**yla; düzenleme **sürtünmesiz inline**.

---

## Tasarım Sistemi Eklemeleri (tüm app'e temel)

Bunlar `theme` ve `ui` katmanına eklenir, profilden başlayıp app geneline yayılır:

1. **`eyebrow` Text variant** — bölüm başlıkları için overline.
   `{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: colors.textFaint }` + `textTransform: 'uppercase'`. (DESIGN-AUDIT #7'deki "label override salgını"nı çözer.)
2. **Hairline ritim** — `<View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />`. Bölümleri kart yerine ayraçla böler. İsteğe bağlı küçük `Hairline` bileşeni.
3. **Yeni token'lar** (`theme/index.ts`):
   - `accentSoft: '#c8ff0015'` (düşük-opacity accent dolgu)
   - `accentBorder: '#c8ff0033'` (accent kenarlık)
   - `dangerSoft: '#ff6b6b10'` (danger tint)
   (DESIGN-AUDIT #4 — inline hex'leri tek kaynağa indirir.)
4. **Animated fill** — `ProgressBar`'a core `Animated.Value` + `Animated.timing` (400ms easeOut, `useNativeDriver: false` çünkü width %). OTA-safe dopamin anı (DESIGN-AUDIT #8). `reanimated@4.1.1` zaten native build'de var ama core `Animated` tercih edilir.

---

## Ekran Yapısı (yukarıdan aşağı)

Her bölüm **[ÇEKİRDEK]** (Faz 1) veya **[FAZ 2]** etiketli. Veri kaynakları mevcut hook'lardan (yeni tablo yok).

### 1. Kimlik şeridi **[ÇEKİRDEK]**
Kart YOK. Tek satır: 38px daire avatar (cardAlt bg, `displayName` baş harfi accent 800) + ad (`subtitle` 14/700) + e-posta (`label` textMuted). Altında hairline. (Settings ikonu Faz 1'de YOK — YAGNI; hedefler zaten alt grupta inline.)
*Veri:* `useDisplayName()`, `session.user.email`.

### 2. İlerleme Hero **[ÇEKİRDEK]** — ekranın duygusal merkezi
- `eyebrow` "GÜNCEL KİLO"
- Dev sayı: `current` kilo, inline `fontSize: 42`, `fontWeight: 800`, color text (#fff); yanında "kg" 15px textMuted.
- Delta pill (sağ): `change7d` → `accentSoft` dolgu + `radius.sm`; düşüş/0 (`≤0`) accent, artış (`>0`) fat (#e0a05d); "↓ 0.8 / 7g". `change7d` null ise pill gizli.
- Hedef ilerleme: kalın `ProgressBar` (height 12), `current→target` oranı (animated). Altında satır: "🎯 Hedef 72 kg · 2.2 kg kaldı" (textMuted) + sağda yön microcopy ("yarı yoldasın" / "ulaştın!" accent). Target yoksa bar+satır gizli, yerine "Hedef belirle" ghost.
- Inline ekle: "Bugünkü kilonu gir" Input + "＋ Ekle" Button aynı satır.
*Veri:* `weightSummary(useBodyWeights().data)` → `{current, change7d}`; `useTargetWeight()`; `useUpsertBodyWeight()`. Hedefe ilerleme yüzdesi: başlangıç = ilk kayıt veya makul taban; `|current−target|`/`|start−target|`. Tek kayıt varsa yüzde anlamsız → bar gizli, sadece "X kg kaldı".

### 3. Streak şeridi **[FAZ 2]**
Card (`accentSoft` bg, `accentBorder`): 🔥 (Ionicons "flame" accent) + gün sayısı (stat 18) + "günlük seri" + sağda son 7 gün nokta dizisi (dolu=accent, boş=cardAlt).
*Veri:* yeni pure helper `workoutStreak(workouts)` (stats.ts) — ardışık antrenman günleri; heatmap verisinden türetilir. Yeni tablo yok.

### 4. KPI şeridi **[ÇEKİRDEK]**
3 sütun, kartsız, aralarında dikey hairline: Toplam (s.total) · Bu hafta (s.thisWeek) · Hacim (s.totalVolumeKg/1000 "t"). Değer stat 19 accent, etiket `eyebrow`.
*Veri:* `summary(useWorkoutStats().data)`.

### 5. 30-gün kilo grafiği **[ÇEKİRDEK]**
`eyebrow` "SON 30 GÜN" + mevcut `WeightLineChart` (pure-View). Borderless, sessiz (B dili). Tek kayıt/boşsa gizli.
*Veri:* `weightChartPoints(useBodyWeights().data, 30)`.

### 6. Hedef halkaları **[FAZ 2]**
2 yan yana kart: Kalori + Protein. Büyük değer (bugün tüketilen) + "/hedef" + kalın ProgressBar (animated). Hedef tutunca accent + checkmark; aşınca danger + "üzerinde". (Kayıtlı ama hiç görselleşmeyen protein hedefini görünür kılar — DESIGN-AUDIT #9.)
*Veri:* `useGoals()` (hedef) + bugünün tüketimi: `useDayEntries(todayISO())` + `entryMacros` toplamı (kalori + protein).

### 7. Rozetler **[FAZ 2]**
Yatay scroll rozet şeridi (ScrollView horizontal). Açık: `accentSoft`+`accentBorder`+dolu ikon; kilitli: border + textFaint + 🔒. Örnekler: "İlk 10 antrenman", "İlk 5 kg", "7 günlük seri", "1 ton hacim".
*Veri:* yeni pure helper `milestones(summary, streak, weightDelta)` — türetilmiş, yeni tablo yok.

### 8. Aktivite (istatistikler) **[ÇEKİRDEK]**
Mevcut `StatsSection`'ın grafikleri (haftalık sıklık, hacim trendi, 7-gün kalori, heatmap) **collapsible** "Aktivite" başlığı altına alınır (DESIGN-AUDIT progressive disclosure). `eyebrow` başlık + chevron; `LayoutAnimation.easeInEaseOut` ile aç/kapa. SummaryCard üçlüsü buradan çıkıp KPI şeridine (4) taşındı. Boş durum: `EmptyState` (ikon + metin) — dashed kart yerine.
*Veri:* `useWorkoutStats`, `useNutritionWeek` (mevcut).

### 9. Günlük Hedefler — inline auto-save **[ÇEKİRDEK]**
`grp` "GÜNLÜK HEDEFLER". Card içinde 2 satır (divider'lı): Kalori / Protein, sağda inline `TextInput` (sağa hizalı, kcal/g suffix). **Ayrı Kaydet butonu ve Alert YOK** — `onBlur`'da `updateGoals.mutate`; başarıda 1.2s accent "✓" mikro-durum (Animated fade). Input focus'ta border accent 1.5px (DESIGN-AUDIT #3). Boş/0 validasyonu: geçersizse kaydetme.
*Veri:* `useGoals()`, `useUpdateGoals()`.

### 10. Hesap + Tehlikeli Bölge **[ÇEKİRDEK]**
`grp` "HESAP": Card içinde "↩ Çıkış yap" satırı. Altında **`DeleteAccountSection`** (zaten kodlandı; `grp danger` + dangerSoft çerçeve diline uyar — gerekirse minik stil uyumu).
*Veri:* `supabase.auth.signOut()`, mevcut `DeleteAccountSection`.

---

## Bileşen Yapısı (Faz 1)

Sorumluluğa göre ayrılır; `profile.tsx` ince bir kompozisyon olur:

| Dosya | Sorumluluk | İşlem |
|------|-----------|------|
| `mobile/src/theme/index.ts` | `accentSoft`/`accentBorder`/`dangerSoft` token | Modify |
| `mobile/src/components/ui/Text.tsx` | `eyebrow` variant | Modify |
| `mobile/src/components/ui/ProgressBar.tsx` | Animated fill | Modify |
| `mobile/src/components/ui/Hairline.tsx` | Tekrar eden ayraç | Create (opsiyonel) |
| `mobile/src/components/ui/EmptyState.tsx` | İkon+metin boş durum | Create |
| `mobile/src/components/profile/ProgressHero.tsx` | Kilo hero (sayı+delta+hedef bar+inline ekle) | Create |
| `mobile/src/components/profile/KpiStrip.tsx` | 3 KPI | Create |
| `mobile/src/components/profile/GoalsInline.tsx` | Inline auto-save hedefler | Create |
| `mobile/src/components/StatsSection.tsx` | Collapsible "Aktivite"; SummaryCard'ları KpiStrip'e devret | Modify |
| `mobile/src/components/WeightSection.tsx` | Hero'ya devredilen parçalar çıkar; kalan sade grafik/liste | Modify/Refactor |
| `mobile/src/app/(app)/profile.tsx` | Yeni kompozisyon (eyebrow+hairline akışı) | Modify |

> **Not:** `WeightSection`/`StatsSection` parçalanıyor çünkü redesign onların içeriğini ekran düzeyinde yeniden diziyor. Mevcut saf hook'lar/grafikler korunur; sadece yerleşim değişir.

---

## OTA Güvenliği
Tamamen OTA-safe: yalnız RN core (`View`, `Animated`, `LayoutAnimation`, `ScrollView`) + mevcut `@expo/vector-icons`. `react-native-svg` YOK, yeni native paket YOK. Grafikler pure-View kalır.

## Fazlama
- **Faz 1 (çekirdek):** tasarım sistemi (eyebrow/hairline/token/animated bar) + kimlik şeridi + ilerleme hero + KPI + 30-gün grafik + collapsible Aktivite + inline Günlük Hedefler + Hesap/Tehlike grupları. → tek OTA. Tam profesyonel re-layout.
- **Faz 2 (momentum):** streak şeridi + hedef halkaları + rozetler + yeni pure helper'lar (`workoutStreak`, `milestones`). → ikinci OTA.

## Kapsam Dışı (YAGNI)
- Avatar yükleme (baş harf yeterli).
- Toast altyapısı (DESIGN-AUDIT #12) — Faz 1'de inline "✓" yeterli; tam toast app-geneli turda.
- Yeni veri tabloları (streak/rozet türetilir).
- Tüm-app redesign — ayrı tur (kullanıcı Faz 1'i beğenirse).

## Test / Doğrulama
Jest yok → `npx tsc --noEmit` yeşil + cihaz görsel testi. Manuel: hero sayıları doğru; delta renk yönü doğru; hedef bar oranı; inline hedef onBlur kaydı + "✓"; collapsible Aktivite aç/kapa; boş durumlar; silme bölümü çalışır. Migration gerekmez (Faz 1 saf JS). Yayın: `eas update --branch preview --platform android` (mobile/.env 3 anahtar).
