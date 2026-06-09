# UI Polish + Icons — Design Spec

**Date:** 2026-06-09
**Status:** Approved (brainstorm)
**Ships via:** OTA / EAS Update only — `@expo/vector-icons` is bundled with Expo SDK. **No native deps, no new APK.** User closes/reopens the app.

## Goal

Add icons and visual polish across the Expo mobile fitness app. The app works (APK installed, confirmed), but the tab bar is text-only, buttons are plain text, nutrition uses emoji, and a bare number ("160") in the add-food list has no label. This pass makes the app feel finished and consistent.

## Constraints

- **OTA-safe only.** Use `@expo/vector-icons` (already available via Expo SDK). Do NOT add any new native dependency.
- App is Turkish-language. Keep all copy Turkish.
- Baseline design: dark theme + lime accent. Tokens in `mobile/src/theme/index.ts` (`accent: #c8ff00`, `bg: #0d0f12`, `card: #16191f`, `textMuted: #9aa0ab`, macro colors `protein #c8ff00` / `carb #5b86d6` / `fat #e0a05d`).
- Follow existing component patterns in `mobile/src/components/ui/`.

## Prerequisite: make `@expo/vector-icons` resolvable

`@expo/vector-icons@^15.0.3` exists only as a **nested** transitive dep under `node_modules/expo/node_modules/` — it is NOT hoisted, so a direct `import` from app code won't resolve via Metro. Add it as a direct dependency:

```
cd mobile && npx expo install @expo/vector-icons
```

**This is still OTA-safe.** `@expo/vector-icons` is pure JS + `.ttf` font assets — no native module. The fonts ship inside the EAS Update bundle, so no native rebuild / no new APK. The OTA-only promise holds.

## Icon library

Use **Ionicons** from `@expo/vector-icons` everywhere (single set for consistency). Convention: **filled when active/primary, `-outline` when inactive/secondary** (standard Ionicons/iOS pattern).

## Scope — 4 areas

### 1. Tab bar icons
File: `mobile/src/app/(app)/_layout.tsx`

Add `tabBarIcon` to each of the 4 visible tabs. Active = filled, inactive = outline. Expo Router passes `{ color, focused, size }` to `tabBarIcon`; use `focused` to pick filled vs outline, and `color` for tint (already wired to `tabBarActiveTintColor`/`tabBarInactiveTintColor`).

| Tab | Title | Ionicons (focused / unfocused) |
|-----|-------|--------------------------------|
| index | Antrenmanlar | `barbell` / `barbell-outline` |
| exercises | Egzersizler | `list` / `list-outline` |
| nutrition | Beslenme | `nutrition` / `nutrition-outline` |
| profile | Profil | `person` / `person-outline` |

Hidden tabs (`href: null`) need no icons.

### 2. Add-food calorie label ("160 falan" fix)
File: `mobile/src/app/(app)/add-food.tsx` (line ~49)

The bare lime number on each food row is calories per 100g with no unit. Fix:
- Render a small flame icon (`flame` Ionicons, accent color) + `{kcal} kcal` instead of the bare number.
- Replace the plain macro line (`100g · P 31 · K 0 · Y 3.6`) with small colored dots per macro (protein/carb/fat theme colors) + value, ending with `· 100g`. Keep it compact (one line, `textMuted`).

### 3. Nutrition meal headers: emoji → icons
File: `mobile/src/app/(app)/nutrition.tsx` (MEALS array, line ~8)

Replace leading emoji in each meal label with an Ionicon rendered next to the title text (accent color, ~18px). Change `MEALS` to carry an `icon` (Ionicons name) instead of an emoji prefix, and render `<Ionicons>` + `<Text>` in the meal header row (line ~67).

| Meal | Was | Ionicons name |
|------|-----|---------------|
| breakfast | 🍳 Kahvaltı | `cafe` |
| lunch | ☀️ Öğle | `sunny` |
| dinner | 🌙 Akşam | `moon` |
| snack | 🍎 Ara | `fast-food` |

### 4. Buttons + UI icons
File: `mobile/src/components/ui/Button.tsx`

Add an optional `icon?: keyof typeof Ionicons.glyphMap` prop. When present, render `<Ionicons>` before the title (size ~17, color matches the title color: `accentText` for primary, `text` for ghost, with a small gap). No icon → unchanged. Backward compatible.

Apply icons at key call sites (non-exhaustive, apply where it clearly helps):
- "Öğüne Ekle" → `add`
- Save/primary submit buttons (e.g. new-workout, new-food) → `checkmark` or `add` as fits
- Empty-state cards (e.g. "Henüz besin eklenmedi" in nutrition) → a muted leading icon for warmth (optional, low priority).

## Out of scope (YAGNI)

- No theme/color changes, no new screens, no layout restructuring.
- No animation library. Existing `Pressable` opacity feedback stays.
- StatChip macro chips on the nutrition summary card: leave as-is (already color-coded). Only the add-food food rows get the dot treatment.

## Testing / verification

- This is presentation-only (no logic/data changes). Verify by running the app:
  - Tab bar shows 4 icons; active tab icon is filled + lime, others outline + gray.
  - Add-food search rows show `🔥 160 kcal` style + macro dots; the number's meaning is now obvious.
  - Nutrition meal headers show consistent icons instead of emoji.
  - Buttons with icons render icon + text aligned; buttons without icon prop unchanged.
- TypeScript: `Ionicons` name props typed via `keyof typeof Ionicons.glyphMap` so bad names fail at compile time.
- Confirm no new entries in `package.json` native deps — OTA promise intact.

## Files touched (summary)

- `mobile/src/app/(app)/_layout.tsx` — tab icons
- `mobile/src/app/(app)/add-food.tsx` — kcal label + macro dots
- `mobile/src/app/(app)/nutrition.tsx` — meal header icons
- `mobile/src/components/ui/Button.tsx` — optional icon prop
- Call sites using `<Button icon=...>` where it helps (add-food, new-workout, new-food, etc.)
