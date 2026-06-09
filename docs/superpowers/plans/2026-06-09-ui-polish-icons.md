# UI Polish + Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Ionicons-based icons and visual polish across the Expo mobile fitness app (tab bar, add-food calorie label, nutrition meal headers, buttons) — shipping via OTA only.

**Architecture:** Presentation-only changes. One shared `Button` gains an optional `icon` prop; three screens render `Ionicons` from `@expo/vector-icons`. No data/logic/native changes.

**Tech Stack:** Expo SDK 54, expo-router, React Native, TypeScript, `@expo/vector-icons` (Ionicons).

**Verification model:** No unit-test harness exists in this project and these are visual changes, so each task verifies with **TypeScript type-check** (`npx tsc --noEmit`) + **lint** (`npm run lint`) and a final visual run. Type safety on Ionicons names (`keyof typeof Ionicons.glyphMap`) catches bad icon names at compile time.

**Reference spec:** `docs/superpowers/specs/2026-06-09-ui-polish-icons-design.md`

---

## File Structure

- `mobile/package.json` — add `@expo/vector-icons` as a direct dep (prerequisite; currently only nested under `expo`).
- `mobile/src/components/ui/Button.tsx` — add optional `icon` prop (shared component, touched by many screens).
- `mobile/src/app/(app)/_layout.tsx` — tab bar icons.
- `mobile/src/app/(app)/add-food.tsx` — calorie label (`🔥 160 kcal`) + macro dots.
- `mobile/src/app/(app)/nutrition.tsx` — meal header icons (emoji → Ionicons).

Order is dependency-driven: prerequisite dep first, then the shared `Button`, then screens.

---

### Task 1: Make `@expo/vector-icons` a direct dependency

**Files:**
- Modify: `mobile/package.json`

`@expo/vector-icons` is currently only a nested transitive dep (`node_modules/expo/node_modules/...`), not hoisted, so app-code imports won't resolve via Metro. Installing it as a direct dep is OTA-safe (pure JS + font assets, no native module).

- [ ] **Step 1: Install via expo (picks SDK-matched version)**

Run (from `mobile/`):
```bash
npx expo install @expo/vector-icons
```
Expected: `package.json` gains `"@expo/vector-icons": "^15.x"` under dependencies; install completes with no native-module warnings.

- [ ] **Step 2: Verify it now resolves from project root**

Run (from `mobile/`):
```bash
node -e "console.log(require.resolve('@expo/vector-icons'))"
```
Expected: prints a path under `mobile/node_modules/@expo/vector-icons/...` (no "Cannot find module" error).

- [ ] **Step 3: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore(mobile): add @expo/vector-icons as direct dep (OTA-safe)"
```

---

### Task 2: Add optional `icon` prop to Button

**Files:**
- Modify: `mobile/src/components/ui/Button.tsx`

Backward compatible: no `icon` → renders exactly as before. With `icon` → Ionicon before the title, tinted to match the title color, with a small gap.

- [ ] **Step 1: Implement the icon prop**

Replace the entire contents of `mobile/src/components/ui/Button.tsx` with:

```tsx
import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing } from '../../theme'

export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false, icon, style }:
  { title: string; onPress: () => void; variant?: 'primary' | 'ghost'; disabled?: boolean; loading?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: ViewStyle }) {
  const isPrimary = variant === 'primary'
  const fg = isPrimary ? colors.accentText : colors.text
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
        isPrimary ? { backgroundColor: colors.accent } : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
        (disabled || loading) ? { opacity: 0.5 } : null,
        pressed ? { opacity: 0.8 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
          <Text style={{ fontWeight: '700', fontSize: 15, color: fg }}>{title}</Text>
        </>
      )}
    </Pressable>
  )
}
```

Note: the `Pressable` itself becomes the flex row (`flexDirection: 'row'` + `gap: 7`), so icon+text center together without a wrapping `View`. The icon/text live in a fragment.

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run (from `mobile/`): `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/ui/Button.tsx
git commit -m "feat(ui): optional icon prop on Button (Ionicons)"
```

---

### Task 3: Tab bar icons

**Files:**
- Modify: `mobile/src/app/(app)/_layout.tsx`

Add `tabBarIcon` to the 4 visible tabs. Filled when focused, outline otherwise. `color` comes from `tabBarActiveTintColor`/`tabBarInactiveTintColor` (already set to accent/textMuted).

- [ ] **Step 1: Implement tab icons**

Replace the entire contents of `mobile/src/app/(app)/_layout.tsx` with:

```tsx
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme'

type IconName = keyof typeof Ionicons.glyphMap

function tabIcon(focused: IconName, unfocused: IconName) {
  return ({ color, size, focused: isFocused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={isFocused ? focused : unfocused} size={size} color={color} />
  )
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Antrenmanlar', tabBarIcon: tabIcon('barbell', 'barbell-outline') }} />
      <Tabs.Screen name="exercises" options={{ title: 'Egzersizler', tabBarIcon: tabIcon('list', 'list-outline') }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Beslenme', tabBarIcon: tabIcon('nutrition', 'nutrition-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('person', 'person-outline') }} />
      <Tabs.Screen name="new-workout" options={{ href: null, title: 'Yeni Antrenman' }} />
      <Tabs.Screen name="workout/[id]" options={{ href: null, title: 'Detay' }} />
      <Tabs.Screen name="add-food" options={{ href: null, title: 'Besin Ekle' }} />
      <Tabs.Screen name="new-food" options={{ href: null, title: 'Özel Besin' }} />
    </Tabs>
  )
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors. (If any of `barbell`/`list`/`nutrition`/`person` + `-outline` is not a valid glyph, tsc fails here — swap to a valid name and re-run.)

- [ ] **Step 3: Commit**

```bash
git add "mobile/src/app/(app)/_layout.tsx"
git commit -m "feat(mobile): tab bar icons (Ionicons, filled-when-active)"
```

---

### Task 4: Add-food calorie label + macro dots

**Files:**
- Modify: `mobile/src/app/(app)/add-food.tsx`

Turn the bare lime number (calories/100g) into `🔥 160 kcal`, and replace the plain macro text line with small colored dots per macro.

- [ ] **Step 1: Add the Ionicons import**

In `mobile/src/app/(app)/add-food.tsx`, add this import after the existing imports (the `react-native` and `expo-router` import block, ~line 3):

```tsx
import { Ionicons } from '@expo/vector-icons'
```

- [ ] **Step 2: Replace the food row body**

Find the `renderItem` `Card` body (currently lines ~47-52):

```tsx
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">{item.name} {item.owner_id ? '⭐' : ''}</Text>
                <Text variant="body" color={colors.accent}>{Math.round(item.calories_per_100g)}</Text>
              </View>
              <Text variant="label">100g · P {item.protein_g} · K {item.carb_g} · Y {item.fat_g}</Text>
```

Replace it with:

```tsx
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="body">{item.name} {item.owner_id ? '⭐' : ''}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="flame" size={14} color={colors.accent} />
                  <Text variant="body" color={colors.accent}>{Math.round(item.calories_per_100g)} kcal</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 }}>
                <MacroDot color={colors.protein} label={`P ${item.protein_g}g`} />
                <MacroDot color={colors.carb} label={`K ${item.carb_g}g`} />
                <MacroDot color={colors.fat} label={`Y ${item.fat_g}g`} />
                <Text variant="label" color={colors.textFaint}>· 100g</Text>
              </View>
```

- [ ] **Step 3: Add the MacroDot helper**

At the bottom of the file (after the `AddFood` component's closing brace), add:

```tsx
function MacroDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text variant="label">{label}</Text>
    </View>
  )
}
```

- [ ] **Step 4: Add an icon to the "Öğüne Ekle" button**

Find the save `Button` (~line 66):

```tsx
          <Button title={addEntry.isPending ? 'Ekleniyor...' : 'Öğüne Ekle'} onPress={save} disabled={addEntry.isPending} style={{ marginTop: spacing.md }} />
```

Replace with (adds `icon="add"`):

```tsx
          <Button icon="add" title={addEntry.isPending ? 'Ekleniyor...' : 'Öğüne Ekle'} onPress={save} disabled={addEntry.isPending} style={{ marginTop: spacing.md }} />
```

- [ ] **Step 5: Type-check + lint**

Run (from `mobile/`): `npx tsc --noEmit && npm run lint`
Expected: no errors. (`colors.textFaint` exists in the theme — confirmed.)

- [ ] **Step 6: Commit**

```bash
git add "mobile/src/app/(app)/add-food.tsx"
git commit -m "feat(mobile): clear calorie label + macro dots in add-food"
```

---

### Task 5: Nutrition meal header icons (emoji → Ionicons)

**Files:**
- Modify: `mobile/src/app/(app)/nutrition.tsx`

Replace emoji prefixes with Ionicons rendered next to the meal title.

- [ ] **Step 1: Add the Ionicons import**

In `mobile/src/app/(app)/nutrition.tsx`, add after the existing import block (~line 6):

```tsx
import { Ionicons } from '@expo/vector-icons'
```

- [ ] **Step 2: Change the MEALS data to carry an icon name**

Replace the `MEALS` constant (lines ~8-13):

```tsx
const MEALS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: '🍳 Kahvaltı' },
  { type: 'lunch', label: '☀️ Öğle' },
  { type: 'dinner', label: '🌙 Akşam' },
  { type: 'snack', label: '🍎 Ara' },
]
```

with:

```tsx
const MEALS: { type: MealType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'breakfast', label: 'Kahvaltı', icon: 'cafe' },
  { type: 'lunch', label: 'Öğle', icon: 'sunny' },
  { type: 'dinner', label: 'Akşam', icon: 'moon' },
  { type: 'snack', label: 'Ara', icon: 'fast-food' },
]
```

- [ ] **Step 3: Render the icon in the meal header**

Find the meal header `Text` (~line 67):

```tsx
              <Text variant="subtitle">{meal.label}</Text>
```

Replace with:

```tsx
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name={meal.icon} size={18} color={colors.accent} />
                <Text variant="subtitle">{meal.label}</Text>
              </View>
```

(`View` is already imported in this file — confirmed line 2.)

- [ ] **Step 4: Type-check + lint**

Run (from `mobile/`): `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "mobile/src/app/(app)/nutrition.tsx"
git commit -m "feat(mobile): nutrition meal header icons (Ionicons)"
```

---

### Task 6: Final visual verification + OTA sanity

**Files:** none (verification only)

- [ ] **Step 1: Start the app**

Run (from `mobile/`): `npx expo start`
Open on device/emulator (or press the platform key). Memory note: user runs the installed APK and reloads JS — for dev, a local Expo session is fine.

- [ ] **Step 2: Verify each area against the spec**

- Tab bar: 4 icons visible; active tab icon filled + lime, others outline + gray.
- Add-food (open a meal → "+ Ekle"): each search result shows `🔥 NNN kcal` and three colored macro dots + `· 100g`. The number's meaning is now obvious.
- Nutrition: meal headers show cafe / sunny / moon / fast-food icons in lime instead of emoji.
- Buttons: "Öğüne Ekle" shows a `+` icon before the text; icon and text vertically centered. Buttons without an icon prop look unchanged.

- [ ] **Step 3: Confirm OTA promise intact**

Run (from repo root):
```bash
git diff --name-only HEAD~5 -- mobile/package.json
```
Confirm the only dependency added is `@expo/vector-icons` (pure JS + font assets, no native module) — no new native dependency, so the change ships via EAS Update with no new APK.

- [ ] **Step 4: (Optional) Ship via OTA**

When satisfied, publish the JS-only update so the user just closes/reopens the app:
```bash
cd mobile && eas update --branch <current-branch> --message "UI polish + icons"
```
(Use the project's existing EAS Update branch/channel — already configured per commit `ea6ca9b`.)

---

## Notes for the executor

- All changes are presentation-only — no query/data/schema changes.
- Keep all UI copy Turkish.
- If `npx tsc --noEmit` rejects an Ionicons name, it's a typo'd glyph — pick the nearest valid Ionicons name and keep going; do not disable the type.
- Don't add any other native dependency — it would break the OTA-only guarantee promised to the user.
