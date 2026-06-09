# Phase 3 — Stats & Charts Design Spec

**Date:** 2026-06-09
**Status:** Approved (brainstorm)
**Ships via:** OTA / EAS Update only. **No new native dependency, no new APK.** Charts are pure React Native `<View>` — no `react-native-svg`.

## Goal

Add a stats section to the Profile screen showing workout and nutrition trends as simple, OTA-safe charts built from plain Views: summary cards, weekly workout frequency, lifted-volume trend, last-7-days calories vs goal, and a workout heatmap.

## Constraints

- **OTA-safe only.** `react-native-svg` is NOT in the project; adding it is a native module → new APK. Forbidden this phase. All charts = `<View>` rectangles (bars, cells, progress). No SVG, no Skia, no new native deps.
- App is Turkish. Dark theme + lime accent (`#c8ff00`); tokens in `mobile/src/theme/index.ts`. Macro colors: protein `#c8ff00`, carb `#5b86d6`, fat `#e0a05d`.
- Follow existing patterns: `Card`, `Text`, `StatChip`, `ProgressBar` in `mobile/src/components/ui/`; query hooks in `mobile/src/lib/queries.ts`.
- Location: **inside the Profile screen** (`mobile/src/app/(app)/profile.tsx`), below "Günlük Hedefler", above "Çıkış Yap". Screen already uses `<Screen scroll>`.

## Data model (existing, no schema changes)

- `workouts(id, user_id, started_at timestamptz not null default now(), ended_at, notes)` — `started_at` is reliable for time grouping.
- `workout_sets(id, workout_id, exercise_id, set_number, reps, weight_kg)` — volume = `reps * weight_kg`.
- `food_entries(id, user_id, entry_date date, meal_type, food_id, quantity_g)` + `foods(calories_per_100g, ...)`.
- `profiles(daily_calorie_goal)` via existing `useGoals()`.

Data volumes are personal-scale, so all aggregation happens client-side in JS (no SQL aggregation).

## Architecture

Four units, each with one responsibility:

### 1. Pure aggregation module — `mobile/src/lib/stats.ts` (new)

Pure functions (no React, no Supabase) — easy to reason about and unit-testable later. Operate on minimal row shapes:

```ts
type SetRow = { reps: number; weight_kg: number }
type WorkoutRow = { started_at: string; workout_sets: SetRow[] }
type DayCalories = { date: string; calories: number }
```

Functions:
- `workoutVolume(sets: SetRow[]): number` — Σ reps×weight.
- `summary(workouts: WorkoutRow[]): { total: number; thisWeek: number; totalVolumeKg: number }` — total count; count with `started_at` in the current ISO week (Mon–Sun, local tz); Σ of all volumes.
- `weeklyFrequency(workouts: WorkoutRow[], weeks = 7): { label: string; count: number }[]` — bucket workouts into the last `weeks` Mon-anchored weeks; oldest→newest; labels `-6h … geç. … bu`.
- `volumeTrend(workouts: WorkoutRow[], n = 8): { label: string; valueKg: number }[]` — last `n` workouts by `started_at` ascending, each workout's volume.
- `dailyCalories(entries: { entry_date: string; calories: number }[], today: string, days = 7): DayCalories[]` — sum calories per day for the last `days` dates ending at `today`; missing days = 0; ordered oldest→newest with weekday labels.
- `heatmap(workouts: WorkoutRow[], weeks = 6): { weekLabel: string; days: number[] }[]` — for each of the last `weeks` weeks, a 7-length array (Mon–Sun) of that day's total volume (0 if no workout). Caller maps volume→intensity bucket.

All week math uses local time and Monday as week start. Provide a small private helper for "start of ISO week for a Date".

### 2. Chart components — `mobile/src/components/charts/` (new dir)

- `BarChart.tsx` — pure `<View>` vertical bars. Props:
  ```ts
  { data: { label: string; value: number }[]; color?: string; height?: number;
    goal?: number; goalColor?: string; overColor?: string; showValues?: boolean }
  ```
  Each bar height = `value / max * height` (max = `Math.max(...values, goal ?? 0)`, guard divide-by-zero → all-zero renders empty bars). If `goal` set, draw a horizontal dashed line (a thin bordered `<View>` positioned by `goal/max`) and color bars ≥ goal with `overColor`. x-axis labels under bars. Used for frequency, volume, and calories.
- `Heatmap.tsx` — pure `<View>` grid. Props:
  ```ts
  { weeks: { weekLabel: string; days: number[] }[]; max: number }
  ```
  Each cell color from intensity bucket of `day/max`: 0 → `colors.border` (`#23272f`); then 3 lime shades `#5e7a00` / `#9ac800` / `#c8ff00`. Row = week (label on left), 7 cells. A small "az → çok" legend below.

### 3. Query hooks — extend `mobile/src/lib/queries.ts`

- `useWorkoutStats()` — `from('workouts').select('id, started_at, workout_sets(reps, weight_kg)').order('started_at')`. Returns `WorkoutRow[]`. queryKey `['workout_stats']`.
- `useNutritionWeek(today: string)` — `from('food_entries').select('entry_date, quantity_g, food:foods(calories_per_100g)').gte('entry_date', <today-6d>).lte('entry_date', today)`. Map each row to `{ entry_date, calories: calories_per_100g * quantity_g/100 }`. queryKey `['nutrition_week', today]`. Compute the start date (`today` − 6 days) with a pure date helper.

### 4. Profile integration — `mobile/src/app/(app)/profile.tsx`

Add a `<StatsSection />` (new component, `mobile/src/components/StatsSection.tsx`) rendered after the Goals card. It calls the two hooks + `useGoals()`, runs the `stats.ts` functions, and renders: a section header "📊 İstatistikler" (Ionicons `stats-chart`, accent), the 3 summary `Card`s in a row, then `BarChart`/`Heatmap` inside `Card`s with captions matching the mockup. Keeping it in its own component keeps `profile.tsx` focused.

## Layout (top→bottom in Profile stats section)

1. Section header: `stats-chart` icon + "İstatistikler".
2. Summary row: 3 cards — `47` Toplam antrenman · `4` Bu hafta · `182 t` Toplam hacim (volume shown in tonnes = kg/1000, 1 decimal).
3. Card "Haftalık antrenman sıklığı" → BarChart (frequency, lime, showValues).
4. Card "Kaldırılan hacim trendi (ton, son 8 antrenman)" → BarChart (volume in tonnes, lime).
5. Card "Son 7 gün kalori" → BarChart (calories, carb-blue bars, goal line from `daily_calorie_goal` (fallback 2400), over-goal bars fat-orange).
6. Card "Antrenman serisi (son 6 hafta)" → Heatmap.

## Error / empty / loading states

- While either hook `isLoading`: show a single `Card` with "İstatistikler yükleniyor...".
- If no workouts: summary shows zeros; workout charts/heatmap replaced by a dashed `Card` "Henüz antrenman yok — bir antrenman ekleyince istatistikler burada görünecek."
- If no food entries in the week: calorie card shows a dashed `Card` "Son 7 günde besin kaydı yok."
- Query errors surface via TanStack Query defaults (no crash); section degrades to empty states. Null-safe: a workout with no sets → volume 0; a food entry with null `food` → 0 calories (mirror existing `entryMacros` null guard).

## Out of scope (YAGNI)

- No date-range pickers, no per-exercise drilldown, no 1RM estimates, no streaks counter text (heatmap conveys it), no nutrition macro pie, no new tab.
- No `react-native-svg`, no animation of bars (static render).

## Verification

- `npx tsc --noEmit` green (no test harness in project; `expo lint` is unconfigured — skip).
- `stats.ts` is pure and unit-testable; tests deferred (no harness) but the module is structured so a future `stats.test.ts` is trivial. Manually sanity-check aggregation by comparing one chart against known data on device.
- Visual run: open Profile → stats section renders below goals; bars/heatmap reflect real data; empty states show when data absent; OTA published with `--platform android`.
- Confirm `package.json` gains **no** new dependency — OTA promise intact.

## Files touched (summary)

- Create: `mobile/src/lib/stats.ts`
- Create: `mobile/src/components/charts/BarChart.tsx`
- Create: `mobile/src/components/charts/Heatmap.tsx`
- Create: `mobile/src/components/StatsSection.tsx`
- Modify: `mobile/src/lib/queries.ts` (two hooks + row types)
- Modify: `mobile/src/app/(app)/profile.tsx` (render `<StatsSection />`)
