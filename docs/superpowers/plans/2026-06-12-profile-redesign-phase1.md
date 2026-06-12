# Profil Redesign — Faz 1 (Çekirdek) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Profil ekranını birleşik tasarım sistemiyle (eyebrow/hairline/token/animated) yeniden dizmek: ilerleme-hero üstte, inline-yönetim altta.

**Architecture:** Önce tasarım sistemi temeli (theme token + `eyebrow` Text variant + animated ProgressBar + Hairline/EmptyState primitive). Sonra yeni profil bileşenleri (`ProgressHero`, `KpiStrip`, `WeightTrend`, `GoalsInline`) + `StatsSection`→`ActivitySection` refactor. En son `profile.tsx` yeniden kompozisyon + eski `WeightSection` kaldırılır. Tamamen OTA-safe (RN core + Animated/LayoutAnimation, svg yok). Faz 2 (streak/halka/rozet) ayrı plan.

**Tech Stack:** React Native + Expo SDK 56, @tanstack/react-query, expo-router, @expo/vector-icons.

**Spec:** `docs/superpowers/specs/2026-06-12-profile-redesign-design.md`

> **NOT — test harness yok:** jest yok. Otomatik kapı = `cd mobile && npx tsc --noEmit` (EXIT 0). Her task'ta manuel doğrulama listesi. Görsel doğrulama cihazda (OTA) yapılır.

> **Mevcut kalıplar (uy):** `Text` props `{ variant, color, style }`. `Card` çocuk sarar. `Button` `{ title, onPress, variant:'primary'|'ghost', disabled, loading, icon, style }`. `Input` = `TextInput` sarmalayıcı. `colors` (accent #c8ff00, danger #ff6b6b, text #fff, textMuted #9aa0ab, textFaint #6b7280, card #16191f, cardAlt #23272f, border #23272f, fat #e0a05d). `spacing` {xs4,sm8,md12,lg16,xl24}. `radius` {sm8,md12,lg16,xl20}. Veri hook'ları `lib/queries.ts`'te; saf yardımcılar `lib/stats.ts`'te (`weightSummary`, `weightChartPoints`, `summary`, `todayISO`). `WeightLineChart` props `{ points:number[], goal?:number, height?:number }`.

---

## File Structure

| Dosya | Sorumluluk | İşlem |
|------|-----------|------|
| `mobile/src/theme/index.ts` | accentSoft/accentBorder/dangerSoft token | Modify |
| `mobile/src/components/ui/Text.tsx` | `eyebrow` variant | Modify |
| `mobile/src/components/ui/ProgressBar.tsx` | Animated fill + `height` prop | Modify |
| `mobile/src/components/ui/Hairline.tsx` | Ayraç primitive | Create |
| `mobile/src/components/ui/EmptyState.tsx` | İkon+metin boş durum | Create |
| `mobile/src/components/ui/index.ts` | Hairline + EmptyState export | Modify |
| `mobile/src/components/profile/ProgressHero.tsx` | Kilo hero (sayı+delta+hedef bar+inline ekle) | Create |
| `mobile/src/components/profile/KpiStrip.tsx` | 3 KPI şeridi | Create |
| `mobile/src/components/profile/WeightTrend.tsx` | 30-gün grafik + collapsible kayıtlar | Create |
| `mobile/src/components/profile/GoalsInline.tsx` | Inline auto-save Günlük Hedefler | Create |
| `mobile/src/components/StatsSection.tsx` | → collapsible "Aktivite"; SummaryCard'ları çıkar | Modify |
| `mobile/src/app/(app)/profile.tsx` | Yeni kompozisyon (eyebrow+hairline) | Modify |
| `mobile/src/components/WeightSection.tsx` | İçeriği devredildi → kaldır | Delete |

---

## Task 1: Tasarım sistemi — token + `eyebrow` variant

**Files:** Modify `mobile/src/theme/index.ts`, `mobile/src/components/ui/Text.tsx`

- [ ] **Step 1: Token'ları ekle** — `theme/index.ts` `colors` objesine `danger` satırından sonra:

```ts
  danger: '#ff6b6b',
  accentSoft: '#c8ff0015',
  accentBorder: '#c8ff0033',
  dangerSoft: '#ff6b6b10',
```

- [ ] **Step 2: `eyebrow` variant** — `Text.tsx`'i tümüyle şununla değiştir:

```tsx
import { Text as RNText, type TextProps, type TextStyle } from 'react-native'
import { colors } from '../../theme'

type Variant = 'title' | 'subtitle' | 'body' | 'label' | 'stat' | 'eyebrow'
const styles: Record<Variant, TextStyle> = {
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, fontWeight: '400', color: colors.text },
  label: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  stat: { fontSize: 28, fontWeight: '800', color: colors.text },
  eyebrow: { fontSize: 11, fontWeight: '700', color: colors.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' },
}

export function Text({ variant = 'body', color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  const base = styles[variant]
  return <RNText {...rest} style={[base, color ? { color } : null, style]} />
}
```

- [ ] **Step 3:** `cd mobile && npx tsc --noEmit` → EXIT 0.
- [ ] **Step 4:** `git add mobile/src/theme/index.ts mobile/src/components/ui/Text.tsx && git commit -m "feat(ui): eyebrow text variant + accentSoft/accentBorder/dangerSoft tokens"`

---

## Task 2: ProgressBar — animated fill + height prop

**Files:** Modify `mobile/src/components/ui/ProgressBar.tsx`

- [ ] **Step 1:** Tümüyle değiştir:

```tsx
import { useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import { colors, radius } from '../../theme'

// width % native sürücü kullanamaz → useNativeDriver:false (JS-driven, OTA-safe).
export function ProgressBar({ value, color = colors.accent, height = 8 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, isFinite(value) ? value : 0))
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 400, useNativeDriver: false }).start()
  }, [pct, anim])
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
  return (
    <View style={{ height, backgroundColor: colors.cardAlt, borderRadius: radius.sm, overflow: 'hidden' }}>
      <Animated.View style={{ width, height: '100%', backgroundColor: color, borderRadius: radius.sm }} />
    </View>
  )
}
```

- [ ] **Step 2:** `cd mobile && npx tsc --noEmit` → EXIT 0. (Mevcut `ProgressBar value={...}` çağrıları — nutrition.tsx — `height` default 8 ile değişmeden çalışır.)
- [ ] **Step 3:** `git add mobile/src/components/ui/ProgressBar.tsx && git commit -m "feat(ui): animate ProgressBar fill + optional height prop"`

---

## Task 3: Hairline + EmptyState primitive'leri

**Files:** Create `mobile/src/components/ui/Hairline.tsx`, `mobile/src/components/ui/EmptyState.tsx`; Modify `mobile/src/components/ui/index.ts`

- [ ] **Step 1: Hairline** — `ui/Hairline.tsx`:

```tsx
import { View } from 'react-native'
import { colors, spacing } from '../../theme'

export function Hairline() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />
}
```

- [ ] **Step 2: EmptyState** — `ui/EmptyState.tsx`:

```tsx
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from './Text'
import { colors, spacing } from '../../theme'

export function EmptyState({ icon, label, hint }: { icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}>
      <Ionicons name={icon} size={40} color={colors.textFaint} />
      <Text variant="subtitle" color={colors.textMuted} style={{ textAlign: 'center' }}>{label}</Text>
      {hint ? <Text variant="label" color={colors.textFaint} style={{ textAlign: 'center' }}>{hint}</Text> : null}
    </View>
  )
}
```

- [ ] **Step 3: Export** — `ui/index.ts`'e ekle:

```ts
export { Hairline } from './Hairline'
export { EmptyState } from './EmptyState'
```

- [ ] **Step 4:** `cd mobile && npx tsc --noEmit` → EXIT 0.
- [ ] **Step 5:** `git add mobile/src/components/ui/Hairline.tsx mobile/src/components/ui/EmptyState.tsx mobile/src/components/ui/index.ts && git commit -m "feat(ui): Hairline + EmptyState primitives"`

---

## Task 4: ProgressHero bileşeni

**Files:** Create `mobile/src/components/profile/ProgressHero.tsx`

İlerleme hero'su: kilo (42px) + delta pill + hedef ProgressBar (12px, animated) + yön microcopy + inline "Bugünkü kilo" ekle. `WeightSection`'ın özet/hedef-ilerleme/ekle parçalarını devralır (referans: mevcut `WeightSection.tsx` `addWeight()` mantığı + `weightSummary`).

- [ ] **Step 1: Bileşen** — `profile/ProgressHero.tsx`:

```tsx
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Text, Input, Button, ProgressBar } from '../ui'
import { colors, spacing, radius } from '../../theme'
import { useBodyWeights, useUpsertBodyWeight, useTargetWeight } from '../../lib/queries'
import { weightSummary, todayISO } from '../../lib/stats'

export function ProgressHero() {
  const { data: entries } = useBodyWeights()
  const { data: target } = useTargetWeight()
  const upsert = useUpsertBodyWeight()
  const [weight, setWeight] = useState('')

  const list = entries ?? []
  const { current, change7d } = weightSummary(list)
  // hedefe ilerleme: başlangıç = en eski kayıt; |current-target| / |start-target|
  const start = list.length > 0 ? list[0].weight_kg : null
  const remaining = current != null && target != null ? Number((current - target).toFixed(1)) : null
  const progress =
    current != null && target != null && start != null && start !== target
      ? Math.max(0, Math.min(1, (Math.abs(start - current)) / (Math.abs(start - target))))
      : 0
  const showBar = current != null && target != null && list.length >= 2

  function addWeight() {
    const kg = Number(weight.replace(',', '.'))
    if (!weight.trim() || !Number.isFinite(kg) || kg <= 0) {
      Alert.alert('Geçersiz', "Lütfen 0'dan büyük bir kilo gir")
      return
    }
    upsert.mutate(
      { entry_date: todayISO(), weight_kg: kg },
      { onSuccess: () => setWeight(''), onError: (e) => Alert.alert('Hata', String(e)) },
    )
  }

  return (
    <View>
      <Text variant="eyebrow" style={{ marginBottom: spacing.sm }}>Güncel Kilo</Text>

      {current != null ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 42, fontWeight: '800', color: colors.text }}>
            {current}<Text color={colors.textMuted} style={{ fontSize: 15 }}> kg</Text>
          </Text>
          {change7d != null ? (
            <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, marginBottom: 6 }}>
              <Text variant="label" color={change7d <= 0 ? colors.accent : colors.fat}>
                {change7d <= 0 ? '↓' : '↑'} {Math.abs(change7d)} / 7g
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text color={colors.textMuted}>Henüz kilo kaydı yok — bugünkü kilonu ekle.</Text>
      )}

      {showBar ? (
        <View style={{ marginTop: spacing.md }}>
          <ProgressBar value={progress} height={12} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
            <Text variant="label">🎯 Hedef {target} kg{remaining != null && remaining !== 0 ? ` · ${Math.abs(remaining)} kg ${remaining > 0 ? 'kaldı' : 'aşıldı'}` : ''}</Text>
            <Text variant="label" color={colors.accent}>{remaining === 0 ? 'ulaştın! 🎉' : progress >= 0.5 ? 'yarı yoldasın' : 'devam et'}</Text>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <Input placeholder="Bugünkü kilonu gir (kg)" keyboardType="numeric" value={weight} onChangeText={setWeight} style={{ flex: 1 }} />
        <Button title="Ekle" icon="add" onPress={addWeight} loading={upsert.isPending} />
      </View>
    </View>
  )
}
```

> `useBodyWeights` ARTAN entry_date döndürür (queries.ts yorumuna göre) → `list[0]` en eski (başlangıç), doğru.

- [ ] **Step 2:** `cd mobile && npx tsc --noEmit` → EXIT 0.
- [ ] **Step 3:** `git add mobile/src/components/profile/ProgressHero.tsx && git commit -m "feat(profile): ProgressHero — weight + delta pill + target bar + inline add"`

---

## Task 5: KpiStrip bileşeni

**Files:** Create `mobile/src/components/profile/KpiStrip.tsx`

3 KPI: Toplam · Bu hafta · Hacim. Kartsız, dikey hairline ayraçlı. `summary(useWorkoutStats().data)` kullanır.

- [ ] **Step 1: Bileşen** — `profile/KpiStrip.tsx`:

```tsx
import { View } from 'react-native'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { useWorkoutStats } from '../../lib/queries'
import { summary } from '../../lib/stats'

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.accent }}>{value}</Text>
      <Text variant="eyebrow" style={{ marginTop: 2 }}>{label}</Text>
    </View>
  )
}

export function KpiStrip() {
  const { data } = useWorkoutStats()
  const s = summary(data ?? [])
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Kpi value={String(s.total)} label="Toplam" />
      <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
      <Kpi value={String(s.thisWeek)} label="Bu hafta" />
      <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
      <Kpi value={`${(s.totalVolumeKg / 1000).toFixed(1)}t`} label="Hacim" />
    </View>
  )
}
```

- [ ] **Step 2:** `cd mobile && npx tsc --noEmit` → EXIT 0.
- [ ] **Step 3:** `git add mobile/src/components/profile/KpiStrip.tsx && git commit -m "feat(profile): KpiStrip — total/week/volume"`

---

## Task 6: WeightTrend bileşeni (grafik + collapsible kayıtlar)

**Files:** Create `mobile/src/components/profile/WeightTrend.tsx`

`eyebrow` "SON 30 GÜN" + `WeightLineChart` (borderless) + collapsible "Kilo kayıtları (N)" listesi (sil ile). `WeightSection`'ın grafik+liste parçasını devralır (referans `WeightSection.tsx:117-158`, `useDeleteBodyWeight`).

- [ ] **Step 1: Bileşen** — `profile/WeightTrend.tsx`:

```tsx
import { useCallback, useState } from 'react'
import { Alert, LayoutAnimation, Platform, Pressable, UIManager, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { WeightLineChart } from '../charts/WeightLineChart'
import { useBodyWeights, useDeleteBodyWeight } from '../../lib/queries'
import { weightChartPoints } from '../../lib/stats'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export function WeightTrend() {
  const { data: entries } = useBodyWeights()
  const del = useDeleteBodyWeight()
  const [open, setOpen] = useState(false)

  const list = entries ?? []
  const points = weightChartPoints(list, 30)
  const recent = [...list].reverse().slice(0, 10)

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen((o) => !o)
  }, [])

  function removeEntry(id: string, date: string) {
    Alert.alert('Sil', `${date} kaydını sil?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => del.mutate(id) },
    ])
  }

  if (points.length < 1) return null

  return (
    <View>
      <Text variant="eyebrow" style={{ marginBottom: spacing.sm }}>Son 30 gün</Text>
      <WeightLineChart points={points} height={110} />

      {recent.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <Pressable onPress={toggle} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }, pressed && { opacity: 0.7 }]}>
            <Text variant="eyebrow">Kilo kayıtları ({recent.length})</Text>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
          </Pressable>
          {open ? (
            <View style={{ gap: spacing.xs }}>
              {recent.map((e) => (
                <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <Text color={colors.textMuted}>{e.entry_date}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Text variant="subtitle">{e.weight_kg} kg</Text>
                    <Pressable onPress={() => removeEntry(e.id, e.entry_date)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Kaydı sil">
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
```

- [ ] **Step 2:** `cd mobile && npx tsc --noEmit` → EXIT 0.
- [ ] **Step 3:** `git add mobile/src/components/profile/WeightTrend.tsx && git commit -m "feat(profile): WeightTrend — quiet 30d chart + collapsible records"`

---

## Task 7: GoalsInline bileşeni (inline auto-save)

**Files:** Create `mobile/src/components/profile/GoalsInline.tsx`

Günlük Hedefler grubu: kalori/protein sağa-hizalı inline Input, **onBlur'da otomatik kayıt** (ayrı buton/Alert yok), başarıda 1.2s accent "✓". Focus'ta accent border.

- [ ] **Step 1: Bileşen** — `profile/GoalsInline.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Animated, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'
import { useGoals, useUpdateGoals } from '../../lib/queries'

function GoalRow({ label, suffix, value, onChange, onCommit, focused, setFocused }: {
  label: string; suffix: string; value: string; onChange: (s: string) => void; onCommit: () => void
  focused: boolean; setFocused: (b: boolean) => void
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text variant="body">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 1.5, borderBottomColor: focused ? colors.accent : 'transparent', paddingBottom: 2 }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onCommit() }}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={colors.textFaint}
          style={{ color: colors.text, fontSize: 15, fontWeight: '700', minWidth: 48, textAlign: 'right', padding: 0 }}
        />
        <Text color={colors.textFaint} variant="label">{suffix}</Text>
      </View>
    </View>
  )
}

export function GoalsInline() {
  const { data: goals } = useGoals()
  const update = useUpdateGoals()
  const [cal, setCal] = useState('')
  const [prot, setProt] = useState('')
  const [calF, setCalF] = useState(false)
  const [protF, setProtF] = useState(false)
  const tick = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (goals) { setCal(goals.daily_calorie_goal?.toString() ?? ''); setProt(goals.daily_protein_goal?.toString() ?? '') }
  }, [goals])

  function flashTick() {
    tick.setValue(0)
    Animated.sequence([
      Animated.timing(tick, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1100),
      Animated.timing(tick, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
  }

  function commit() {
    const c = cal.trim() ? Number(cal) : null
    const p = prot.trim() ? Number(prot) : null
    if ((c !== null && (!Number.isFinite(c) || c <= 0)) || (p !== null && (!Number.isFinite(p) || p <= 0))) return
    if (c === (goals?.daily_calorie_goal ?? null) && p === (goals?.daily_protein_goal ?? null)) return
    update.mutate({ daily_calorie_goal: c, daily_protein_goal: p }, { onSuccess: flashTick })
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
        <Text variant="eyebrow">Günlük Hedefler</Text>
        <Animated.View style={{ opacity: tick, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons name="checkmark" size={13} color={colors.accent} />
          <Text variant="label" color={colors.accent}>kaydedildi</Text>
        </Animated.View>
      </View>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md }}>
        <GoalRow label="Kalori" suffix="kcal" value={cal} onChange={setCal} onCommit={commit} focused={calF} setFocused={setCalF} />
        <View style={{ opacity: 1 }}>
          <GoalRowLast label="Protein" suffix="g" value={prot} onChange={setProt} onCommit={commit} focused={protF} setFocused={setProtF} />
        </View>
      </View>
    </View>
  )
}

// Son satır: alt çizgisiz
function GoalRowLast(props: Parameters<typeof GoalRow>[0]) {
  return (
    <View style={{ marginBottom: -1 }}>
      <GoalRow {...props} />
    </View>
  )
}
```

> Son satırın divider'ını gizlemek için `GoalRowLast` `marginBottom:-1` ile alt border'ı kırpıyor (basit, ekstra prop'suz). Alternatif kabul: `GoalRow`'a `last?:boolean` prop ekleyip borderBottomWidth'i 0 yapmak — implementer hangisi temizse onu seçebilir, ikisi de kabul.

- [ ] **Step 2:** `cd mobile && npx tsc --noEmit` → EXIT 0.
- [ ] **Step 3:** `git add mobile/src/components/profile/GoalsInline.tsx && git commit -m "feat(profile): GoalsInline — inline auto-save calorie/protein goals"`

---

## Task 8: StatsSection → collapsible "Aktivite" (SummaryCard'lar çıkar)

**Files:** Modify `mobile/src/components/StatsSection.tsx`

Değişiklikler (mevcut dosyayı oku, şu davranışa getir):
1. Başlık satırı: `Ionicons stats-chart` + "İstatistikler" yerine → `eyebrow` "Aktivite" + sağda chevron; tıklanınca `LayoutAnimation.easeInEaseOut` ile gövde aç/kapa (varsayılan **kapalı**).
2. **SummaryCard üçlüsünü KALDIR** (artık KpiStrip'te). `SummaryCard` fonksiyonu ve onu kullanan ilk `<View>` bloğu silinir.
3. Boş antrenman durumunda dashed `Card` yerine `EmptyState` (`ui`'dan): `icon="barbell-outline"`, `label="Henüz antrenman yok"`, `hint="Bir antrenman ekleyince burada görünecek"`.
4. Grafik kartları (BarChart sıklık, hacim trendi, 7-gün kalori, Heatmap) collapsible gövde içinde kalır; `useMemo` türetmeleri korunur.
5. Android için `UIManager.setLayoutAnimationEnabledExperimental(true)` guard'ı ekle (Task 6'daki kalıp).

> Implementer: mevcut `StatsSection.tsx`'i okuyup yukarıdaki maddeleri uygula; `useWorkoutStats`/`useNutritionWeek`/`useGoals` + `useMemo` türetme mantığı (s/freq/vol/cals/heat/heatMax) korunur, sadece `s` (summary) artık KpiStrip'e taşındığı için burada SummaryCard render edilmez. Collapsible state hook'ları (useMemo) erken return'den ÖNCE çağrılmalı (hooks kuralı).

- [ ] **Step 1:** Yukarıdaki 5 değişikliği uygula.
- [ ] **Step 2:** `cd mobile && npx tsc --noEmit` → EXIT 0.
- [ ] **Step 3:** `git add mobile/src/components/StatsSection.tsx && git commit -m "feat(profile): StatsSection -> collapsible Aktivite, drop summary cards"`

---

## Task 9: profile.tsx yeniden kompozisyon + WeightSection kaldır

**Files:** Modify `mobile/src/app/(app)/profile.tsx`; Delete `mobile/src/components/WeightSection.tsx`

Yeni profil kompozisyonu (yukarıdan aşağı): kimlik şeridi → Hairline → ProgressHero → Hairline → KpiStrip → Hairline → WeightTrend → Hairline → GoalsInline → Hairline → StatsSection(Aktivite) → Hairline → Hesap grubu (Çıkış) → DeleteAccountSection.

- [ ] **Step 1: profile.tsx'i değiştir** — tümüyle şu yapıya getir:

```tsx
import { Pressable, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Screen, Text, Hairline } from '../../components/ui'
import { colors, spacing, radius } from '../../theme'
import { useDisplayName } from '../../lib/queries'
import { ProgressHero } from '../../components/profile/ProgressHero'
import { KpiStrip } from '../../components/profile/KpiStrip'
import { WeightTrend } from '../../components/profile/WeightTrend'
import { GoalsInline } from '../../components/profile/GoalsInline'
import { StatsSection } from '../../components/StatsSection'
import { DeleteAccountSection } from '../../components/DeleteAccountSection'

export default function Profile() {
  const { session } = useAuth()
  const { data: displayName } = useDisplayName()
  const initial = (displayName ?? session?.user.email ?? '?').trim().charAt(0).toUpperCase()

  return (
    <Screen scroll>
      {/* Kimlik şeridi */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.accent }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{displayName ?? '...'}</Text>
          <Text variant="label">{session?.user.email}</Text>
        </View>
      </View>

      <Hairline />
      <ProgressHero />
      <Hairline />
      <KpiStrip />
      <Hairline />
      <WeightTrend />
      <Hairline />
      <GoalsInline />
      <Hairline />
      <StatsSection />
      <Hairline />

      {/* Hesap */}
      <Text variant="eyebrow" style={{ marginBottom: spacing.sm }}>Hesap</Text>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md }}>
        <Pressable onPress={() => supabase.auth.signOut()} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }, pressed && { opacity: 0.7 }]}>
          <Text variant="body" color={colors.textMuted}>↩  Çıkış yap</Text>
        </Pressable>
      </View>

      <DeleteAccountSection />
    </Screen>
  )
}
```

- [ ] **Step 2: WeightSection.tsx'i sil** (içeriği ProgressHero + WeightTrend'e taşındı):

```bash
git rm mobile/src/components/WeightSection.tsx
```

- [ ] **Step 3:** `cd mobile && npx tsc --noEmit` → EXIT 0. (WeightSection'a başka referans kalmamalı — `grep -r "WeightSection" mobile/src` sadece silinen dosyayı göstermemeli; profile.tsx artık import etmiyor.)
- [ ] **Step 4:** `git add mobile/src/app/(app)/profile.tsx && git commit -m "feat(profile): recompose profile screen with new design system, drop WeightSection"`

---

## Final: Doğrulama + yayın (kullanıcı)

- [ ] `cd mobile && npx tsc --noEmit` → EXIT 0 (tüm Faz 1).
- [ ] `grep -rn "WeightSection" mobile/src` → boş (referans kalmadı).
- [ ] Yayın: `cd mobile && eas update --branch preview --platform android` (mobile/.env'de 3 anahtar). Migration GEREKMEZ (saf JS).
- [ ] Cihaz görsel testi:
  - Kimlik şeridi (avatar+ad+e-posta) + hairline ritmi.
  - ProgressHero: kilo 42px, delta pill rengi (düşüş accent / artış fat), hedef bar oranı + microcopy.
  - KpiStrip 3 değer doğru.
  - WeightTrend grafik + "Kilo kayıtları" aç/kapa + sil.
  - GoalsInline: değeri değiştir → alandan çık → "✓ kaydedildi" yanıp söner; nutrition'da hedef güncellenmiş olur.
  - Aktivite collapsible aç/kapa; boş durumda EmptyState.
  - Çıkış + Hesabı Sil çalışır.

---

## Self-Review

- **Spec kapsamı:** eyebrow/hairline/token/animated (T1-T3) ✓; kimlik şeridi (T9) ✓; ProgressHero (T4) ✓; KpiStrip (T5) ✓; 30-gün grafik + kayıtlar (T6) ✓; inline auto-save hedefler (T7) ✓; collapsible Aktivite + EmptyState (T8) ✓; Hesap+Tehlike grupları (T9, DeleteAccountSection mevcut) ✓. Faz 2 (streak/halka/rozet) kapsam dışı, ayrı plan ✓.
- **Placeholder taraması:** Layout bileşenlerinin tamamı tam kod; StatsSection (T8) refactor talimatı mevcut dosyaya dayalı 5 net madde (tam yeniden yazım yerine, çünkü useMemo türetmeleri korunuyor) — kabul edilebilir, her madde somut.
- **Tip tutarlılığı:** `ProgressBar` yeni `height?` prop (T2) ↔ ProgressHero `height={12}` (T4) uyumlu. `eyebrow` variant (T1) ↔ tüm bileşenlerde `variant="eyebrow"` ✓. `Hairline`/`EmptyState` export (T3) ↔ T8/T9 import ✓. `weightSummary`/`summary`/`weightChartPoints`/`todayISO` mevcut imzalar korunur ✓.
