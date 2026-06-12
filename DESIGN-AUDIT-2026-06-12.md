# Tasarım/UX Denetimi — Fitness App (2026-06-12)

**Yöntem:** design-scout agent — theme token'ları + 7 UI primitive + 9 ekran + 2 auth ekranı + 3 grafik + 5 workout bileşeni + 2 feature section okundu.
**Kısıt:** OTA-safe (svg yok). `reanimated@4.1.1` zaten native build'de var → core `Animated`/`LayoutAnimation` tamamen OTA-safe.

---

## Top 5 Hızlı Kazanım (yüksek etki · düşük efor · OTA-safe)

### 1. Çıplak "Yükleniyor..." → skeleton/markalı loading
**Nerede:** `index.tsx:14`, `nutrition.tsx:43`, `exercises.tsx:19`, `WeightSection.tsx:32-39`, `[id].tsx:19`, `StatsSection.tsx:46-53`, `profile.tsx:36` (`'...'`).
**Neden:** 5 ekran yüklenirken sol üstte stilsiz gri yazı → bozuk/boş gibi görünüyor, premium dark hissi kırılıyor, içerik gelince layout zıplıyor. App'teki en çok tekrarlanan tutarsızlık.
**Değişiklik:** `ui/`'da tek `<Skeleton>` primitive: `cardAlt` arka plan, `radius.md`, gerçek içerik yüksekliği, core `Animated.loop` opacity 0.4→1 (350ms). Her ekranın loading dalında Card-şekilli skeleton. Minimum: loading yazısını ortalı `Card`'a sar. **Efor:** M (S = sadece Card'a sar)

### 2. Button olmayan her tıklanabilire press feedback
**Nerede:** `nutrition.tsx:75` (+ Ekle), `add-food.tsx:46` (besin satırı), `new-workout.tsx:52` (egzersiz chip), `TemplateCard.tsx:36` (▶ Başla), `WorkoutCard.tsx:26`, `TemplateCard.tsx:19` (sil), `WeightSection.tsx:150` (çöp).
**Neden:** Sadece paylaşılan `Button`'da `pressed` opacity var. Diğer her `Pressable` sıfır dokunsal geri bildirim → dark UI'da dokunuşlar ölü hissettiriyor (algılanan kalitenin #1 katili).
**Değişiklik:** Her ham `Pressable`'a `style={({ pressed }) => [..., pressed && { opacity: 0.7 }]}`. ~7 tek-satır düzenleme. **Efor:** S

### 3. `Input` placeholder/değer kontrastı + focus state
**Nerede:** `ui/Input.tsx`.
**Neden:** Input'ta **hiç focus state yok** — border odakta da `colors.border` (#23272f). 5 üst üste input'lu formda (`new-food`) hangi alanın aktif olduğu görünmüyor. Border card (#16191f) üstünde ≈1.2:1, boş input'lar düz blok gibi.
**Değişiklik:** Local `focused` state → odakta border `colors.accent` + `borderWidth: 1.5`. Resting border'ı `#2e333d`'ye aç. `selectionColor={colors.accent}`. **Efor:** S

### 4. Hardcoded accent-tint hex'lerini token'la
**Nerede:** `new-workout.tsx:77` (`#c8ff0012`, `#c8ff0033`), `WorkoutCard.tsx:37` (`#c8ff0015`, `#c8ff0033`).
**Neden:** "Düşük opacity accent" dolgusu inline ve **3 farklı alpha** (`12`/`15`/`33`) — aynı görsel olması gereken hacim pill'i + egzersiz chip'leri eşleşmiyor.
**Değişiklik:** `theme/index.ts`: `accentSoft: '#c8ff0015'`, `accentBorder: '#c8ff0033'`. Inline hex'leri değiştir. **Efor:** S

### 5. Boş durumlara ikon + aksiyon (sadece gri yazı değil)
**Nerede:** `index.tsx:27`, `new-workout.tsx:67`, `add-food.tsx:44`, `nutrition.tsx:81`.
**Neden:** İlk kullanıcı "Antrenmanlar"da bir buton + yalnız gri cümle görüyor. Boş durumlar en yüksek kaldıraçlı onboarding/delight anı, şu an sonradan akla gelmiş.
**Değişiklik:** `<EmptyState icon label hint?>`: ortalı Ionicon (40, `textFaint`) + `subtitle` + opsiyonel hint, `paddingVertical: spacing.xl`. 4 yerde reuse. **Efor:** M

---

## Büyük Bahisler

### 6. Shadow/elevation token → kartlara derinlik
`ui/Card.tsx`, `theme/index.ts` (shadow token yok). Yüzeyler (bg #0d0f12, card #16191f, cardAlt #23272f) sadece 1px border + %9 lightness farkıyla ayrılıyor → bazı ekranlarda kartlar arka plana karışıyor. Çözüm: elevation token (`shadowOpacity:0.3, shadowRadius:8, offset:{0,2}, elevation:3`) VEYA `card`→`#1a1e25`, `cardAlt`→`#272c35`. **Efor:** M

### 7. Gerçek tipografi ölçeği + `label` size-override salgını
`ui/Text.tsx` (5 variant) ama bileşenler sürekli inline `fontSize` override ediyor: `9` (BarChart/Heatmap), `10` (WorkoutCard/ExerciseSetGroup/TemplateCard/WorkoutStatHeader), `11`, `18`, `22`. `label` (11) 4 farklı boyutta kullanılıyor. 9px chart label'ları dark'ta okunaksız. Çözüm: `caption`(12/600), `micro`(10/600), `statSm` variant'ları ekle; inline override'ları variant'la değiştir; chart label 9→10. #4 ve #1'i de temizler. **Efor:** L

### 8. Progress bar / bar chart / değer değişimlerini anime et
`ui/ProgressBar.tsx`, `charts/BarChart.tsx`, kalori alanı `nutrition.tsx:50-57`. Sayılar/barlar anında snap'liyor. Tracker'da "protein hedefini tutturdun" fill animasyonu çekirdek dopamin anı — şu an yok. Çözüm: ProgressBar width'i core `Animated.Value`+`timing` (400ms easeOut, `useNativeDriver:false` — width % native sürücü kullanamaz ama JS-driven OTA-safe). Hedef aşılınca accent flash. BarChart mount'ta staggered (i*40ms). **Efor:** M

### 9. Kalori özetini hak ettiği "hero"ya çevir
`nutrition.tsx:50-63`. Günün kalorisi nutrition'ın en önemli sayısı ama düz yazı + ince 8px bar (bir öğün satırıyla aynı ağırlık). "kalan {remaining}" negatife düşebiliyor, görsel uyarı yok. Çözüm (pure-View ring zor): ProgressBar'ı 12px kalınlaştır, remaining pozitifken `accent`, `<0` iken `danger` + "+X üzerinde". Macro StatChip'leri hedefe-göre-ilerleme göster (protein hedefi kayıtlı ama hiç görselleşmiyor). **Efor:** M

### 10. Tutarlı ekran başlıkları + scroll davranışı
Tab ekranları: index/exercises `FlatList`+non-scroll Screen; nutrition/profile `scroll`. Başlık `marginBottom` `md` vs `lg`. `_layout.tsx` header set ediyor ama ekranlar da kendi başlığını basıyor → olası çift başlık. Çözüm: `<ScreenHeader title subtitle?>` sabit `marginBottom: spacing.lg`; tek başlık kaynağı; `_layout.tsx`'te `headerShown:false`. **Efor:** M

### 11. Accessibility-as-design: hit target, label, dynamic type
İkon-only `Pressable`'lar: `TemplateCard.tsx:19` (çöp 15px), `WeightSection.tsx:150` (çöp 18px), `ExerciseSetGroup.tsx:25` (kapat). `hitSlop=8` ile ≈31px (<44px kılavuz). `accessibilityLabel`/`Role` yok → ekran okuyucu sessiz. `textFaint` #6b7280/bg #0d0f12 ≈3.6:1 WCAG AA fail. Çözüm: `hitSlop` 12; `accessibilityRole="button"`+`accessibilityLabel` ("Kaydı sil"); gerçek label'larda `textMuted` (#9aa0ab ≈6.6:1 geçer) kullan; destructive'e `accessibilityHint`. **Efor:** M

### 12. Modal/Alert aşırı kullanımı → inline onay
`Alert.alert` success toast için (`profile.tsx:26`, `WeightSection.tsx:68`, `[id].tsx:35`) + her validasyon hatası. "Kaydedildi" için native Alert ağır + akışı kesiyor + markasız. Çözüm: hafif in-app toast (absolute bottom View, `cardAlt`+accent sol border, 2s auto-dismiss `Animated` fade). `Alert` sadece destructive onay için. Input'ları inline validate et (kırmızı border + helper). **Efor:** L

---

## Tutarsızlık Kataloğu

| Sorun | Yer | Ref |
|---|---|---|
| Accent-tint alpha farkı (12/15/33) | new-workout:77, WorkoutCard:37 | #4 |
| `borderRadius:16` hardcoded (radius.lg değil) | [id].tsx:60 modal | token kullan |
| Başlık `marginBottom` md vs lg | index/exercises vs nutrition/profile | #10 |
| Loading metni 4 farklı | 6 ekran | #1 |
| Inline fontSize (9/10/11/18/22) variant bypass | chart + 4 workout bileşeni | #7 |
| "Başla" `▶` glyph ama diğer CTA Ionicon | TemplateCard:37 | Ionicon `play` |
| ⭐/🎯/⚡/🎉 emoji vs Ionicon | add-food, exercises, WeightSection, Templates | Ionicon'da birleş (emoji Android font'larında tutarsız) |
| Chip radius 6 (TemplateCard) vs 20 pill (WorkoutCard) | — | tek şekil seç |
| Stat-card Card vs raw View (kopya stil) | StatsSection vs WorkoutCard/Header | `StatStrip` çıkar |

## Ortam Uyarısı
- **package.json uyumsuzluğu:** `expo: ~54.0.0` ama AGENTS.md/memory SDK 56 diyor. Dependency işine girmeden çözülmeli (tasarım sorunu değil ama neyin güvenli ekleneceğini etkiler).

## Önce ne yapılmalı (agent önerisi)
#1–#5 tek OTA batch (~1 gün): hepsi düşük efor, algılanan kaliteye direkt dokunuyor, native değişiklik yok. Sonra #7 (tipografi) yapısal temel. Kullanıcının *hissedeceği* iki değişiklik: #9 (kalori hero) + #8 (progress animasyon).
