# Skeleton Loading + Smooth Auth Geçişi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5 ekrandaki "Yükleniyor..." düz yazısını ekran düzenini taklit eden nabız atan skeleton'larla değiştir + welcome→kayıt/giriş geçişini fade yap.

**Architecture:** Tek `Skeleton` primitive (RN Animated opaklık nabzı) üstüne 4 ekran-bazlı iskelet (`WorkoutsSkeleton`/`ExercisesSkeleton`/`NutritionSkeleton`/`DetailSkeleton`); 5 ekranın `isLoading` dalı bunlara bağlanır; `(auth)/_layout` Stack'e `animation:'fade'`. Pure-JS + Stack config → OTA-safe (runtime 1.0.2).

**Tech Stack:** Expo SDK 54, React 19, expo-router 6, RN `Animated`. Mevcut `Screen`/`Text` (ui), `colors`/`spacing` (theme). `tsconfig` `noUnusedLocals` YOK → kullanılmayan import sorun değil.

**Design ref:** `docs/superpowers/specs/2026-06-15-skeleton-loading-design.md`

**Test notu:** Test runner YOK. Doğrulama: `cd mobile && npx tsc --noEmit` + cihaz. Mantık değişmiyor (sadece isLoading dalı).

---

## Agent Split (paralel execution)

Dosyalar çakışmıyor → 4 iş kolu. Agent'lar commit ETMEZ; orchestrator tek `tsc` + commit + OTA.

- **Agent A — Primitive:** Task 1. (`ui/Skeleton.tsx` + `ui/index.ts` export)
- **Agent B — İskelet 1:** Task 2. (`skeletons/WorkoutsSkeleton.tsx` + `ExercisesSkeleton.tsx`)
- **Agent C — İskelet 2:** Task 3. (`skeletons/NutritionSkeleton.tsx` + `DetailSkeleton.tsx`)
- **Agent D — Ekranlar + auth:** Task 4. (5 ekran isLoading dalı + `(auth)/_layout.tsx`)

B/C, A'nın `Skeleton`'ına; D, B/C'nin iskeletlerine göre kodlar (planda kilitli).

## Dosya Yapısı

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `mobile/src/components/ui/Skeleton.tsx` | animasyonlu placeholder kutusu | Create |
| `mobile/src/components/ui/index.ts` | `Skeleton` export | Modify (1 satır) |
| `mobile/src/components/skeletons/WorkoutsSkeleton.tsx` | Antrenmanlar iskeleti | Create |
| `mobile/src/components/skeletons/ExercisesSkeleton.tsx` | Egzersizler iskeleti | Create |
| `mobile/src/components/skeletons/NutritionSkeleton.tsx` | Beslenme iskeleti | Create |
| `mobile/src/components/skeletons/DetailSkeleton.tsx` | detay ekranları iskeleti | Create |
| `mobile/src/app/(app)/index.tsx` | isLoading → WorkoutsSkeleton | Modify |
| `mobile/src/app/(app)/exercises.tsx` | isLoading → ExercisesSkeleton | Modify |
| `mobile/src/app/(app)/nutrition.tsx` | isLoading → NutritionSkeleton | Modify |
| `mobile/src/app/(app)/workout/[id].tsx` | isLoading → DetailSkeleton | Modify |
| `mobile/src/app/(app)/exercise/[id].tsx` | yükleme → DetailSkeleton | Modify |
| `mobile/src/app/(auth)/_layout.tsx` | Stack animation: fade | Modify |

---

### Task 1: `Skeleton` primitive (Agent A)

**Files:**
- Create: `mobile/src/components/ui/Skeleton.tsx`
- Modify: `mobile/src/components/ui/index.ts`

- [ ] **Step 1: Skeleton'ı yaz**

```tsx
// mobile/src/components/ui/Skeleton.tsx
import { useEffect, useRef } from 'react'
import { Animated, type DimensionValue, type ViewStyle } from 'react-native'
import { colors } from '../../theme'

// Nabız atan placeholder kutusu (opaklık 0.4↔1). useNativeDriver — OTA-safe.
export function Skeleton({
  width,
  height,
  radius = 8,
  style,
}: {
  width: DimensionValue
  height: number
  radius?: number
  style?: ViewStyle
}) {
  const opacity = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.cardAlt, opacity }, style]}
    />
  )
}
```

- [ ] **Step 2: ui/index.ts'e export ekle**

`mobile/src/components/ui/index.ts` sonuna ekle:
```ts
export { Skeleton } from './Skeleton'
```

- [ ] **Step 3: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 2: `WorkoutsSkeleton` + `ExercisesSkeleton` (Agent B)

**Files:**
- Create: `mobile/src/components/skeletons/WorkoutsSkeleton.tsx`
- Create: `mobile/src/components/skeletons/ExercisesSkeleton.tsx`

- [ ] **Step 1: WorkoutsSkeleton'ı yaz**

```tsx
// mobile/src/components/skeletons/WorkoutsSkeleton.tsx
import { View } from 'react-native'
import { Screen, Skeleton } from '../ui'
import { spacing } from '../../theme'

export function WorkoutsSkeleton() {
  return (
    <Screen>
      <Skeleton width={160} height={26} style={{ marginBottom: spacing.md }} />
      <Skeleton width="100%" height={120} radius={16} style={{ marginBottom: spacing.md }} />
      <Skeleton width="100%" height={48} radius={12} style={{ marginBottom: spacing.lg }} />
      <Skeleton width={90} height={12} style={{ marginBottom: spacing.md }} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <Skeleton width={10} height={10} radius={5} />
          <Skeleton width="55%" height={14} />
          <View style={{ flex: 1 }} />
          <Skeleton width={70} height={12} />
        </View>
      ))}
    </Screen>
  )
}
```

- [ ] **Step 2: ExercisesSkeleton'ı yaz**

```tsx
// mobile/src/components/skeletons/ExercisesSkeleton.tsx
import { View } from 'react-native'
import { Screen, Skeleton } from '../ui'
import { spacing } from '../../theme'

export function ExercisesSkeleton() {
  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Skeleton width={140} height={26} />
        <Skeleton width={90} height={34} radius={12} />
      </View>
      <Skeleton width="100%" height={46} radius={12} style={{ marginBottom: spacing.sm }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        {[60, 50, 56, 48].map((w, i) => (
          <Skeleton key={i} width={w} height={30} radius={16} />
        ))}
      </View>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={11} />
          </View>
          <Skeleton width={50} height={14} />
        </View>
      ))}
    </Screen>
  )
}
```

- [ ] **Step 3: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 1 tamamlanmış olmalı).

---

### Task 3: `NutritionSkeleton` + `DetailSkeleton` (Agent C)

**Files:**
- Create: `mobile/src/components/skeletons/NutritionSkeleton.tsx`
- Create: `mobile/src/components/skeletons/DetailSkeleton.tsx`

- [ ] **Step 1: NutritionSkeleton'ı yaz**

```tsx
// mobile/src/components/skeletons/NutritionSkeleton.tsx
import { View } from 'react-native'
import { Screen, Skeleton } from '../ui'
import { spacing } from '../../theme'

export function NutritionSkeleton() {
  return (
    <Screen scroll>
      <Skeleton width={130} height={12} style={{ marginBottom: spacing.sm }} />
      <Skeleton width={90} height={26} style={{ marginBottom: spacing.lg }} />
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Skeleton width={168} height={168} radius={84} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, gap: 6 }}>
            <Skeleton width="60%" height={11} />
            <Skeleton width="100%" height={6} radius={3} />
          </View>
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
          <Skeleton width={120} height={16} />
          <Skeleton width="100%" height={52} radius={12} />
        </View>
      ))}
    </Screen>
  )
}
```

- [ ] **Step 2: DetailSkeleton'ı yaz**

```tsx
// mobile/src/components/skeletons/DetailSkeleton.tsx
import { View } from 'react-native'
import { Screen, Skeleton } from '../ui'
import { spacing } from '../../theme'

export function DetailSkeleton() {
  return (
    <Screen>
      <Skeleton width={80} height={11} style={{ marginBottom: spacing.sm }} />
      <Skeleton width={180} height={26} style={{ marginBottom: spacing.lg }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="32%" height={56} radius={12} />
        ))}
      </View>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <Skeleton width="45%" height={14} />
          <Skeleton width={70} height={14} />
        </View>
      ))}
    </Screen>
  )
}
```

- [ ] **Step 3: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 1 tamamlanmış olmalı).

---

### Task 4: Ekranları bağla + auth fade (Agent D)

**Files:**
- Modify: `mobile/src/app/(app)/index.tsx`
- Modify: `mobile/src/app/(app)/exercises.tsx`
- Modify: `mobile/src/app/(app)/nutrition.tsx`
- Modify: `mobile/src/app/(app)/workout/[id].tsx`
- Modify: `mobile/src/app/(app)/exercise/[id].tsx`
- Modify: `mobile/src/app/(auth)/_layout.tsx`

> Not: `noUnusedLocals` kapalı → loading metnini çıkarınca `Text`/`colors` import'ları kalsa da sorun değil. Sadece import EKLE + isLoading dalını değiştir.

- [ ] **Step 1: `index.tsx`**

Import ekle (diğer importların yanına):
```tsx
import { WorkoutsSkeleton } from '../../components/skeletons/WorkoutsSkeleton'
```
Şu bloğu:
```tsx
  if (isLoading) {
    return (
      <Screen>
        <Text color={colors.textMuted}>Yükleniyor...</Text>
      </Screen>
    )
  }
```
şununla değiştir:
```tsx
  if (isLoading) return <WorkoutsSkeleton />
```

- [ ] **Step 2: `exercises.tsx`**

Import ekle:
```tsx
import { ExercisesSkeleton } from '../../components/skeletons/ExercisesSkeleton'
```
Şu bloğu:
```tsx
  if (isLoading) {
    return (
      <Screen>
        <Text color={colors.textMuted}>Yükleniyor...</Text>
      </Screen>
    )
  }
```
şununla değiştir:
```tsx
  if (isLoading) return <ExercisesSkeleton />
```

- [ ] **Step 3: `nutrition.tsx`**

Import ekle:
```tsx
import { NutritionSkeleton } from '../../components/skeletons/NutritionSkeleton'
```
Şu bloğu:
```tsx
  if (isLoading) {
    return (
      <Screen>
        <Text color={colors.textMuted}>Yükleniyor...</Text>
      </Screen>
    )
  }
```
şununla değiştir:
```tsx
  if (isLoading) return <NutritionSkeleton />
```

- [ ] **Step 4: `workout/[id].tsx`**

Import ekle (üç seviye yukarı):
```tsx
import { DetailSkeleton } from '../../../components/skeletons/DetailSkeleton'
```
Şu satırı:
```tsx
  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>
```
şununla değiştir:
```tsx
  if (isLoading) return <DetailSkeleton />
```

- [ ] **Step 5: `exercise/[id].tsx`**

Import ekle:
```tsx
import { DetailSkeleton } from '../../../components/skeletons/DetailSkeleton'
```
Şu bloğu:
```tsx
  if (!exercise) {
    return (
      <Screen>
        <Text color={colors.textMuted}>{isLoading ? 'Yükleniyor...' : 'Egzersiz bulunamadı.'}</Text>
      </Screen>
    )
  }
```
şununla değiştir:
```tsx
  if (!exercise) {
    if (isLoading) return <DetailSkeleton />
    return (
      <Screen>
        <Text color={colors.textMuted}>Egzersiz bulunamadı.</Text>
      </Screen>
    )
  }
```

- [ ] **Step 6: `(auth)/_layout.tsx` — fade geçiş**

Tüm dosyayı şununla değiştir:
```tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
}
```

- [ ] **Step 7: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 1, 2, 3 tamamlanmış olmalı).

---

### Task 5: Entegrasyon + doğrulama (Orchestrator + KULLANICI)

- [ ] **Step 1: Tek tsc**

Run: `cd mobile && npx tsc --noEmit`
Expected: EXIT 0.

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/fatih/fitness-app"
git add mobile/src/components/ui/Skeleton.tsx mobile/src/components/ui/index.ts \
  mobile/src/components/skeletons/ \
  mobile/src/app/\(app\)/index.tsx mobile/src/app/\(app\)/exercises.tsx \
  mobile/src/app/\(app\)/nutrition.tsx mobile/src/app/\(app\)/workout/\[id\].tsx \
  mobile/src/app/\(app\)/exercise/\[id\].tsx mobile/src/app/\(auth\)/_layout.tsx
git commit -m "feat(ux): skeleton loading durumlari + auth fade gecisi"
```

- [ ] **Step 3: OTA yayını**

Run: `cd mobile && eas update --branch preview --platform android -m "skeleton loading + auth fade"`
Expected: update grubu **runtime 1.0.2**'ye yayınlanır.

- [ ] **Step 4: Cihaz doğrulaması (KULLANICI)**

1. Antrenmanlar/Egzersizler/Beslenme açılırken nabız atan iskeletler görünür (düz "Yükleniyor..." gitti).
2. Antrenman/egzersiz detayına girerken `DetailSkeleton` görünür.
3. Welcome → "Başla"/"Giriş yap" → fade geçiş (hero zıplamaz).
4. Yüklenince içerik sorunsuz gelir.

---

## Self-Review notları

- **Spec coverage:** Skeleton primitive nabız (Task 1) ✓; 4 ekran iskeleti (Task 2 + 3) ✓; 5 ekran bağlama (Task 4 Step 1-5) ✓; auth fade (Task 4 Step 6) ✓; OTA runtime 1.0.2 (Task 5) ✓. StatsSection = kapsam dışı (spec ile uyumlu) ✓.
- **Tip tutarlılığı:** `Skeleton` props `{width: DimensionValue, height, radius?, style?}` ↔ tüm iskeletlerde kullanım uyumlu (`width` sayı veya "%"; `style` marginlar). İskeletler `Screen`+`Skeleton`'ı `../ui`'den alır (Task 1 export'u). Ekranlar iskeletleri doğru göreli yoldan import eder (ana ekranlar `../../`, detaylar `../../../`).
- **Placeholder taraması:** Yok — her adımda tam kod + tam old/new bloklar.
- **Risk:** (1) `noUnusedLocals` kapalı → loading sonrası `Text`/`colors` kalması sorun değil. (2) `animation:'fade'` react-native-screens üstünden (mevcut), OTA-safe. (3) Yeni route/native yok → typedRoutes/build gerekmez.
