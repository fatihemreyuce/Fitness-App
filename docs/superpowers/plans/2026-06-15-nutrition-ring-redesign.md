# Beslenme — Kalori Halkası Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beslenme ekranını "kalori halkası" diline taşı — react-native-svg dairesel kalori ilerlemesi (ortada kalan kcal) + makro satırı + sadeleştirilmiş öğünler.

**Architecture:** `react-native-svg` ile `CalorieRing` (yeniden kullanılabilir) + `NutritionHero` (tarih + ring + makrolar) + `MealSection` (öğün bloğu) üstüne `nutrition.tsx` yeniden kompoze edilir. react-native-svg native modül → version 1.0.2 + yeni APK build. Mevcut veri katmanı (useDayEntries/useGoals/entryMacros) değişmez.

**Tech Stack:** Expo SDK 54, React 19, expo-router 6, `react-native-svg` (yeni). Mevcut: `useDayEntries`/`useGoals`/`entryMacros` (`queries.ts`), `Screen/Text/Card` (ui), `todayISO` (`stats.ts`).

**Design ref:** `docs/superpowers/specs/2026-06-15-nutrition-ring-redesign-design.md`

**Test notu:** Test runner YOK. Doğrulama: `cd mobile && npx tsc --noEmit` + cihaz (yeni APK). Mantık değişmiyor (totals mevcut), regresyon riski düşük.

---

## Agent Split (paralel execution)

**Ön koşul (orchestrator, workflow ÖNCESİ — Task 0):** `react-native-svg` kurulur + version 1.0.2 yapılır ki agent'ların `import 'react-native-svg'`'si ve tsc çalışsın.

Sonra 4 iş kolu paralel (agent'lar commit ETMEZ):
- **Agent A — Ring:** Task 1. (`components/charts/CalorieRing.tsx`)
- **Agent B — Hero:** Task 2. (`components/nutrition/NutritionHero.tsx`)
- **Agent C — Öğün:** Task 3. (`components/nutrition/MealSection.tsx`)
- **Agent D — Ekran:** Task 4. (`app/(app)/nutrition.tsx` rewrite)

D, B/C imzalarına; B, A'ya göre kodlar (planda kilitli).

## Dosya Yapısı

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `mobile/package.json` | `react-native-svg` | Modify (expo install) |
| `mobile/app.json` | version 1.0.1 → 1.0.2 | Modify |
| `mobile/src/components/charts/CalorieRing.tsx` | svg dairesel ilerleme | Create |
| `mobile/src/components/nutrition/NutritionHero.tsx` | tarih + ring + makro satırı | Create |
| `mobile/src/components/nutrition/MealSection.tsx` | tek öğün bloğu | Create |
| `mobile/src/app/(app)/nutrition.tsx` | ekranı yeniden kompoze | Rewrite |

---

### Task 0: react-native-svg kurulumu + version bump (Orchestrator, workflow öncesi)

- [ ] **Step 1: react-native-svg kur (SDK-uyumlu sürüm)**

Run:
```bash
cd "C:/Users/fatih/fitness-app/mobile"
npx expo install react-native-svg
```
Expected: `react-native-svg` package.json'a eklenir.

- [ ] **Step 2: app.json version 1.0.1 → 1.0.2**

`mobile/app.json` içinde:
```json
"version": "1.0.1",
```
→
```json
"version": "1.0.2",
```
(runtimeVersion policy `appVersion` → runtime 1.0.2'ye ayrışır; eski 1.0.1 installler svg bundle'ını almaz, çökmez.)

---

### Task 1: `CalorieRing.tsx` (Agent A)

**Files:**
- Create: `mobile/src/components/charts/CalorieRing.tsx`

- [ ] **Step 1: svg halka bileşenini yaz**

```tsx
// mobile/src/components/charts/CalorieRing.tsx
import { type ReactNode } from 'react'
import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { colors } from '../../theme'

// Dairesel ilerleme halkası (react-native-svg). Tepeden saat yönünde dolar.
// children halkanın ortasında gösterilir.
export function CalorieRing({
  progress,
  size = 168,
  stroke = 14,
  color = colors.accent,
  trackColor = colors.cardAlt,
  children,
}: {
  progress: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  children?: ReactNode
}) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0))
  const r = (size - stroke) / 2
  const c = size / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - p)
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={c} cy={c} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      {children}
    </View>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 0 ile react-native-svg kurulu olmalı).

---

### Task 2: `NutritionHero.tsx` (Agent B)

**Files:**
- Create: `mobile/src/components/nutrition/NutritionHero.tsx`

- [ ] **Step 1: Hero'yu yaz (tarih + AI Tara + ring + makro satırı)**

İç `MacroBar`: hedef varsa hedefe göre dolu çubuk; hedef yoksa (karb/yağ) %40 opaklıkta düz çubuk (dekoratif).

```tsx
// mobile/src/components/nutrition/NutritionHero.tsx
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { CalorieRing } from '../charts/CalorieRing'

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal?: number; color: string }) {
  const pct = goal && goal > 0 ? Math.max(0, Math.min(1, value / goal)) : null
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text variant="label" color={color}>{label}</Text>
        <Text variant="label" color={colors.textMuted}>{Math.round(value)}g</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.cardAlt, overflow: 'hidden' }}>
        <View style={{ height: '100%', borderRadius: 3, backgroundColor: color, width: `${(pct ?? 1) * 100}%`, opacity: pct == null ? 0.4 : 1 }} />
      </View>
    </View>
  )
}

export function NutritionHero({
  dateLabel,
  calories,
  calGoal,
  protein,
  proteinGoal,
  carb,
  fat,
  onScan,
}: {
  dateLabel: string
  calories: number
  calGoal: number
  protein: number
  proteinGoal: number
  carb: number
  fat: number
  onScan: () => void
}) {
  const remaining = Math.round(calGoal - calories)
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text variant="label">{dateLabel}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text variant="title">Bugün</Text>
        <Pressable
          onPress={onScan}
          accessibilityRole="button"
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.accentSoft,
              borderWidth: 1,
              borderColor: colors.accent,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: 999,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="camera" size={15} color={colors.accent} />
          <Text variant="label" color={colors.accent}>AI ile Tara</Text>
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <CalorieRing progress={calGoal > 0 ? calories / calGoal : 0}>
          <View style={{ alignItems: 'center' }}>
            <Text variant="stat">{Math.round(calories).toLocaleString('tr-TR')}</Text>
            <Text variant="label">/ {Math.round(calGoal).toLocaleString('tr-TR')} kcal</Text>
            <Text variant="label" color={colors.accent} style={{ fontWeight: '700', marginTop: 2 }}>
              {remaining >= 0
                ? `${remaining.toLocaleString('tr-TR')} kalan`
                : `${Math.abs(remaining).toLocaleString('tr-TR')} aşıldı`}
            </Text>
          </View>
        </CalorieRing>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <MacroBar label="Protein" value={protein} goal={proteinGoal} color={colors.protein} />
        <MacroBar label="Karb" value={carb} color={colors.carb} />
        <MacroBar label="Yağ" value={fat} color={colors.fat} />
      </View>
    </View>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 1 tamamlanmış olmalı).

---

### Task 3: `MealSection.tsx` (Agent C)

**Files:**
- Create: `mobile/src/components/nutrition/MealSection.tsx`

- [ ] **Step 1: Öğün bloğunu yaz**

```tsx
// mobile/src/components/nutrition/MealSection.tsx
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, Card } from '../ui'
import { colors, spacing } from '../../theme'

export type MealItem = { id: string; name: string; quantity_g: number; calories: number }

export function MealSection({
  label,
  icon,
  items,
  totalCal,
  onAdd,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  items: MealItem[]
  totalCal: number
  onAdd: () => void
}) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name={icon} size={18} color={colors.accent} />
          <Text variant="subtitle">{label}</Text>
          <Text variant="label" color={colors.textFaint}>{Math.round(totalCal)} kcal</Text>
        </View>
        <Pressable onPress={onAdd} hitSlop={6}>
          <Text variant="label" color={colors.accent}>+ Ekle</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <Pressable onPress={onAdd}>
          <Card style={{ borderStyle: 'dashed', paddingVertical: spacing.md }}>
            <Text variant="label" color={colors.textFaint}>Henüz besin eklenmedi · dokun ve ekle</Text>
          </Card>
        </Pressable>
      ) : (
        <Card style={{ padding: spacing.md }}>
          {items.map((it, idx) => (
            <View
              key={it.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 5,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Text variant="body">{it.name} · {it.quantity_g}g</Text>
              <Text variant="body" color={colors.textMuted}>{Math.round(it.calories)} kcal</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 4: `nutrition.tsx` yeniden kompoze (Agent D)

**Files:**
- Rewrite: `mobile/src/app/(app)/nutrition.tsx`

- [ ] **Step 1: Ekranı yeniden yaz**

Totals hesabı (mevcut) korunur; sunum `NutritionHero` + `MealSection`'a taşınır. `useDayEntries`/`useGoals`/`entryMacros`/`todayISO`/`useFocusEffect` mevcut.

```tsx
// mobile/src/app/(app)/nutrition.tsx
import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Screen, Text } from '../../components/ui'
import { colors } from '../../theme'
import { useDayEntries, useGoals, entryMacros, type MealType } from '../../lib/queries'
import { todayISO } from '../../lib/stats'
import { NutritionHero } from '../../components/nutrition/NutritionHero'
import { MealSection, type MealItem } from '../../components/nutrition/MealSection'

const MEALS: { type: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'breakfast', label: 'Kahvaltı', icon: 'cafe' },
  { type: 'lunch', label: 'Öğle', icon: 'sunny' },
  { type: 'dinner', label: 'Akşam', icon: 'moon' },
  { type: 'snack', label: 'Ara', icon: 'fast-food' },
]

export default function Nutrition() {
  const [date, setDate] = useState(todayISO())
  // Ekran her odaklandığında bugünü tazele (gece yarısı geçince donmasın).
  useFocusEffect(useCallback(() => setDate(todayISO()), []))
  const { data: entries, isLoading } = useDayEntries(date)
  const { data: goals } = useGoals()
  const router = useRouter()

  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carb: 0, fat: 0 }
    for (const e of entries ?? []) {
      const m = entryMacros(e)
      t.calories += m.calories
      t.protein += m.protein
      t.carb += m.carb
      t.fat += m.fat
    }
    return t
  }, [entries])

  if (isLoading) {
    return (
      <Screen>
        <Text color={colors.textMuted}>Yükleniyor...</Text>
      </Screen>
    )
  }

  const calGoal = goals?.daily_calorie_goal && goals.daily_calorie_goal > 0 ? goals.daily_calorie_goal : 2400
  const proteinGoal = goals?.daily_protein_goal && goals.daily_protein_goal > 0 ? goals.daily_protein_goal : 150
  const dateLabel = new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Screen scroll>
      <NutritionHero
        dateLabel={dateLabel}
        calories={totals.calories}
        calGoal={calGoal}
        protein={totals.protein}
        proteinGoal={proteinGoal}
        carb={totals.carb}
        fat={totals.fat}
        onScan={() => router.push(`/(app)/scan-food?date=${date}`)}
      />

      {MEALS.map((meal) => {
        const mealEntries = (entries ?? []).filter((e) => e.meal_type === meal.type)
        const items: MealItem[] = mealEntries.map((e) => ({
          id: e.id,
          name: e.food?.name ?? 'Besin',
          quantity_g: e.quantity_g,
          calories: entryMacros(e).calories,
        }))
        const totalCal = items.reduce((s, it) => s + it.calories, 0)
        return (
          <MealSection
            key={meal.type}
            label={meal.label}
            icon={meal.icon}
            items={items}
            totalCal={totalCal}
            onAdd={() => router.push(`/(app)/add-food?meal=${meal.type}&date=${date}`)}
          />
        )
      })}
    </Screen>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 1, 2, 3 + Task 0 tamamlanmış olmalı).

---

### Task 5: Entegrasyon + build + doğrulama (Orchestrator + KULLANICI)

- [ ] **Step 1: Tek tsc**

Run: `cd mobile && npx tsc --noEmit`
Expected: EXIT 0.

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/fatih/fitness-app"
git add mobile/package.json mobile/package-lock.json mobile/app.json \
  mobile/src/components/charts/CalorieRing.tsx \
  mobile/src/components/nutrition/NutritionHero.tsx \
  mobile/src/components/nutrition/MealSection.tsx \
  mobile/src/app/\(app\)/nutrition.tsx
git commit -m "feat(nutrition): Kalori Halkasi redesign — react-native-svg ring + makro + sade ogunler (v1.0.2)"
```

- [ ] **Step 3: Yeni APK build (KULLANICI/orchestrator — native modül eklendi)**

Run: `cd mobile && eas build -p android --profile preview`
Telefona kur. (Sonraki JS değişiklikleri runtime 1.0.2'ye OTA gider.)

- [ ] **Step 4: Cihaz doğrulaması (KULLANICI)**

1. Beslenme sekmesi → kalori halkası: alınan/hedef doğru, ortada kalori + kalan, tepeden dolar.
2. Makro satırı: protein çubuğu hedefe göre dolu; karb/yağ gram + soluk çubuk.
3. Öğünler: ikon + ad + kcal + "+ Ekle"; besin satırları; boşsa "dokun ve ekle".
4. "+ Ekle" → add-food; "AI ile Tara" → scan-food. Eklenen besin halka + makro + toplama yansır.
5. Boş gün çökmeden açılır (halka %0).

---

## Self-Review notları

- **Spec coverage:** CalorieRing svg hero (Task 1 + Task 2) ✓; ortada kalori/kalan (Task 2) ✓; makro satırı protein(çubuk)/karb/yağ (Task 2 MacroBar) ✓; sadeleştirilmiş öğünler (Task 3) ✓; add-food/scan-food navigasyonu korunur (Task 4) ✓; react-native-svg + v1.0.2 + build (Task 0 + Task 5) ✓; günler arası gezinme = kapsam dışı (today-only korunur) ✓.
- **Tip tutarlılığı:** `CalorieRing` props `{progress, size?, stroke?, color?, trackColor?, children?}` ↔ `NutritionHero` kullanımı (`progress` + children) uyumlu. `MealItem {id,name,quantity_g,calories}` (MealSection'da export) ↔ nutrition.tsx `items` map aynı. `NutritionHero` props ↔ nutrition.tsx kullanımı birebir. `Goals {daily_calorie_goal, daily_protein_goal}` ↔ calGoal/proteinGoal türetme doğru.
- **Placeholder taraması:** Yok — her adımda tam kod.
- **Risk:** (1) react-native-svg native → v1.0.2 build şart (Task 5 Step 3); eski 1.0.1 ayrı runtime, çökmez. (2) `width: \`${x}%\`` RN string yüzde — geçerli. (3) Yeni route yok → typedRoutes regen gerekmez. (4) Task 0 (expo install) workflow'dan ÖNCE yapılmalı yoksa agent tsc'leri svg tipini bulamaz.
