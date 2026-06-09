# Phase 3 Stats & Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an OTA-safe stats section to the Profile screen — summary cards, weekly workout frequency, lifted-volume trend, last-7-days calories vs goal, and a workout heatmap — using pure `<View>` charts (no `react-native-svg`).

**Architecture:** Pure aggregation in `stats.ts`; two new TanStack Query hooks; two reusable pure-View chart components (`BarChart`, `Heatmap`); a `StatsSection` that wires data→charts; rendered inside `profile.tsx`. No schema changes, no new dependencies.

**Tech Stack:** Expo SDK 54, expo-router, React Native, TypeScript, TanStack Query, Supabase, `@expo/vector-icons` (already present).

**Verification model:** No unit-test harness in this project; per spec, tests are deferred and `stats.ts` is kept pure for future testing. Each task verifies with `npx tsc --noEmit`. `expo lint` is unconfigured (would interactively scaffold eslint) — skip it. Final visual run on device, then OTA publish with `--platform android`.

**Reference spec:** `docs/superpowers/specs/2026-06-09-phase3-stats-charts-design.md`

---

## File Structure

- Create `mobile/src/lib/stats.ts` — pure aggregation + date helpers (no React/Supabase).
- Modify `mobile/src/lib/queries.ts` — `useWorkoutStats`, `useNutritionWeek` + row types.
- Create `mobile/src/components/charts/BarChart.tsx` — pure-View vertical bars + optional goal line.
- Create `mobile/src/components/charts/Heatmap.tsx` — pure-View week×day grid.
- Create `mobile/src/components/StatsSection.tsx` — wires hooks + stats + charts; owns empty/loading states.
- Modify `mobile/src/app/(app)/profile.tsx` — render `<StatsSection />` below the Goals card.

Build order is dependency-driven: stats → hooks → charts → section → profile.

---

### Task 1: Pure aggregation module `stats.ts`

**Files:**
- Create: `mobile/src/lib/stats.ts`

All week math is local time, Monday-anchored. Turkey has no DST (permanent UTC+3), so millisecond-based week arithmetic is safe.

- [ ] **Step 1: Create the file with full contents**

```ts
// Pure stats aggregation — no React, no Supabase. Unit-testable in isolation.

export type SetRow = { reps: number; weight_kg: number }
export type WorkoutRow = { started_at: string; workout_sets: SetRow[] }
export type DayCalories = { date: string; label: string; calories: number }

const DAY_MS = 86_400_000
const WEEKDAY_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

// Local midnight Monday of the week containing d.
function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7 // Mon=0 … Sun=6
  x.setDate(x.getDate() - dow)
  return x
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

// First date (YYYY-MM-DD) of a `days`-long window ending at `today`.
export function weekStartISO(today: string, days = 7): string {
  const base = parseISODate(today)
  return toISODate(new Date(base.getTime() - (days - 1) * DAY_MS))
}

export function workoutVolume(sets: SetRow[]): number {
  return (sets ?? []).reduce((s, r) => s + r.reps * r.weight_kg, 0)
}

export function summary(workouts: WorkoutRow[]): { total: number; thisWeek: number; totalVolumeKg: number } {
  const weekStart = startOfWeek(new Date()).getTime()
  let totalVolumeKg = 0
  let thisWeek = 0
  for (const w of workouts) {
    totalVolumeKg += workoutVolume(w.workout_sets)
    if (new Date(w.started_at).getTime() >= weekStart) thisWeek++
  }
  return { total: workouts.length, thisWeek, totalVolumeKg }
}

export function weeklyFrequency(workouts: WorkoutRow[], weeks = 7): { label: string; count: number }[] {
  const thisWeekStart = startOfWeek(new Date()).getTime()
  const counts = new Array(weeks).fill(0) as number[]
  for (const w of workouts) {
    const t = new Date(w.started_at).getTime()
    for (let i = 0; i < weeks; i++) {
      const lo = thisWeekStart - (weeks - 1 - i) * 7 * DAY_MS
      if (t >= lo && t < lo + 7 * DAY_MS) { counts[i]++; break }
    }
  }
  return counts.map((count, i) => ({
    label: i === weeks - 1 ? 'bu' : i === weeks - 2 ? 'geç.' : `-${weeks - 1 - i}h`,
    count,
  }))
}

export function volumeTrend(workouts: WorkoutRow[], n = 8): { valueKg: number }[] {
  const sorted = [...workouts].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
  return sorted.slice(-n).map((w) => ({ valueKg: workoutVolume(w.workout_sets) }))
}

export function dailyCalories(
  entries: { entry_date: string; calories: number }[],
  today: string,
  days = 7,
): DayCalories[] {
  const base = parseISODate(today)
  const out: DayCalories[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * DAY_MS)
    const iso = toISODate(d)
    const label = WEEKDAY_TR[(d.getDay() + 6) % 7]
    const calories = entries.filter((e) => e.entry_date === iso).reduce((s, e) => s + e.calories, 0)
    out.push({ date: iso, label, calories })
  }
  return out
}

export function heatmap(workouts: WorkoutRow[], weeks = 6): { weekLabel: string; days: number[] }[] {
  const thisWeekStart = startOfWeek(new Date()).getTime()
  const rows = Array.from({ length: weeks }, (_, i) => ({
    start: thisWeekStart - (weeks - 1 - i) * 7 * DAY_MS,
    days: [0, 0, 0, 0, 0, 0, 0],
  }))
  for (const w of workouts) {
    const t = new Date(w.started_at).getTime()
    for (const row of rows) {
      if (t >= row.start && t < row.start + 7 * DAY_MS) {
        const idx = Math.floor((t - row.start) / DAY_MS)
        if (idx >= 0 && idx < 7) row.days[idx] += workoutVolume(w.workout_sets)
        break
      }
    }
  }
  return rows.map((r, i) => ({ weekLabel: i === weeks - 1 ? 'bu' : `-${weeks - 1 - i}h`, days: r.days }))
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/stats.ts
git commit -m "feat(mobile): pure stats aggregation module"
```

---

### Task 2: Query hooks in `queries.ts`

**Files:**
- Modify: `mobile/src/lib/queries.ts`

- [ ] **Step 1: Add the stats import at the top**

In `mobile/src/lib/queries.ts`, add after the existing imports (line 2 area):

```ts
import { weekStartISO, type WorkoutRow } from './stats'
```

- [ ] **Step 2: Append the two hooks at the end of the file**

Add at the bottom of `mobile/src/lib/queries.ts`:

```ts
// ============ İstatistik sorguları ============
export function useWorkoutStats() {
  return useQuery({
    queryKey: ['workout_stats'],
    queryFn: async (): Promise<WorkoutRow[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('started_at, workout_sets(reps, weight_kg)')
        .order('started_at')
      if (error) throw error
      return (data ?? []) as unknown as WorkoutRow[]
    },
  })
}

export function useNutritionWeek(today: string) {
  return useQuery({
    queryKey: ['nutrition_week', today],
    queryFn: async (): Promise<{ entry_date: string; calories: number }[]> => {
      const start = weekStartISO(today, 7)
      const { data, error } = await supabase
        .from('food_entries')
        .select('entry_date, quantity_g, food:foods(calories_per_100g)')
        .gte('entry_date', start)
        .lte('entry_date', today)
      if (error) throw error
      type Row = { entry_date: string; quantity_g: number; food: { calories_per_100g: number } | null }
      return ((data ?? []) as unknown as Row[]).map((r) => ({
        entry_date: r.entry_date,
        calories: r.food ? r.food.calories_per_100g * (r.quantity_g / 100) : 0,
      }))
    },
  })
}
```

- [ ] **Step 3: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/lib/queries.ts
git commit -m "feat(mobile): useWorkoutStats + useNutritionWeek hooks"
```

---

### Task 3: `BarChart` component

**Files:**
- Create: `mobile/src/components/charts/BarChart.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { View } from 'react-native'
import { Text } from '../ui'
import { colors } from '../../theme'

export type Bar = { label: string; value: number }

export function BarChart({
  data,
  color = colors.accent,
  height = 100,
  goal,
  overColor = colors.fat,
  goalColor = colors.fat,
  showValues = false,
  formatValue,
}: {
  data: Bar[]
  color?: string
  height?: number
  goal?: number
  overColor?: string
  goalColor?: string
  showValues?: boolean
  formatValue?: (v: number) => string
}) {
  const max = Math.max(1, ...data.map((d) => d.value), goal ?? 0)
  return (
    <View>
      <View style={{ position: 'relative', height, flexDirection: 'row', alignItems: 'flex-end', gap: 7 }}>
        {goal && goal > 0 ? (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: (goal / max) * height, borderTopWidth: 1.5, borderColor: goalColor, borderStyle: 'dashed' }}
          />
        ) : null}
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            {showValues ? (
              <Text variant="label" style={{ fontSize: 9 }}>{formatValue ? formatValue(d.value) : String(d.value)}</Text>
            ) : null}
            <View
              style={{
                width: '100%',
                height: Math.max(2, (d.value / max) * height),
                backgroundColor: goal && d.value >= goal ? overColor : color,
                borderTopLeftRadius: 5,
                borderTopRightRadius: 5,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 5 }}>
        {data.map((d, i) => (
          <Text key={i} variant="label" style={{ flex: 1, textAlign: 'center', fontSize: 9 }}>{d.label}</Text>
        ))}
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/charts/BarChart.tsx
git commit -m "feat(mobile): pure-View BarChart with optional goal line"
```

---

### Task 4: `Heatmap` component

**Files:**
- Create: `mobile/src/components/charts/Heatmap.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { View } from 'react-native'
import { Text } from '../ui'
import { colors } from '../../theme'

const SHADES = ['#5e7a00', '#9ac800', '#c8ff00']

export type HeatWeek = { weekLabel: string; days: number[] }

export function Heatmap({ weeks, max }: { weeks: HeatWeek[]; max: number }) {
  function cellColor(v: number): string {
    if (v <= 0) return colors.border
    const ratio = v / max
    const idx = ratio > 0.66 ? 2 : ratio > 0.33 ? 1 : 0
    return SHADES[idx]
  }
  return (
    <View>
      {weeks.map((w, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <Text variant="label" style={{ width: 44, fontSize: 9 }}>{w.weekLabel}</Text>
          <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
            {w.days.map((d, j) => (
              <View key={j} style={{ flex: 1, aspectRatio: 1, maxWidth: 20, borderRadius: 3, backgroundColor: cellColor(d) }} />
            ))}
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 6 }}>
        <Text variant="label" style={{ fontSize: 9 }}>az</Text>
        {[colors.border, ...SHADES].map((c, i) => (
          <View key={i} style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: c }} />
        ))}
        <Text variant="label" style={{ fontSize: 9 }}>çok</Text>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/charts/Heatmap.tsx
git commit -m "feat(mobile): pure-View Heatmap grid"
```

---

### Task 5: `StatsSection` component

**Files:**
- Create: `mobile/src/components/StatsSection.tsx`

Owns data fetching, aggregation calls, layout, and all empty/loading states.

- [ ] **Step 1: Create the file**

```tsx
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, Card } from './ui'
import { colors, spacing } from '../theme'
import { BarChart } from './charts/BarChart'
import { Heatmap } from './charts/Heatmap'
import { useWorkoutStats, useNutritionWeek, useGoals } from '../lib/queries'
import { summary, weeklyFrequency, volumeTrend, dailyCalories, heatmap, todayISO } from '../lib/stats'

function SummaryCard({ big, label }: { big: string; label: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm }}>
      <Text variant="stat" color={colors.accent} style={{ fontSize: 22 }}>{big}</Text>
      <Text variant="label" style={{ textAlign: 'center', marginTop: 2 }}>{label}</Text>
    </Card>
  )
}

export function StatsSection() {
  const today = todayISO()
  const { data: workouts, isLoading: wLoading } = useWorkoutStats()
  const { data: week, isLoading: nLoading } = useNutritionWeek(today)
  const { data: goals } = useGoals()

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md }}>
      <Ionicons name="stats-chart" size={20} color={colors.accent} />
      <Text variant="title">İstatistikler</Text>
    </View>
  )

  if (wLoading || nLoading) {
    return (
      <View>
        {header}
        <Card style={{ marginBottom: spacing.lg }}><Text color={colors.textMuted}>İstatistikler yükleniyor...</Text></Card>
      </View>
    )
  }

  const ws = workouts ?? []
  const s = summary(ws)
  const freq = weeklyFrequency(ws)
  const vol = volumeTrend(ws)
  const cals = dailyCalories(week ?? [], today)
  const heat = heatmap(ws)
  const heatMax = Math.max(1, ...heat.flatMap((w) => w.days))
  const calGoal = goals?.daily_calorie_goal && goals.daily_calorie_goal > 0 ? goals.daily_calorie_goal : 2400
  const hasWorkouts = ws.length > 0
  const hasCals = cals.some((c) => c.calories > 0)

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {header}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <SummaryCard big={String(s.total)} label="Toplam antrenman" />
        <SummaryCard big={String(s.thisWeek)} label="Bu hafta" />
        <SummaryCard big={`${(s.totalVolumeKg / 1000).toFixed(1)} t`} label="Toplam hacim" />
      </View>

      {hasWorkouts ? (
        <>
          <Card style={{ marginBottom: spacing.md }}>
            <Text variant="label" style={{ marginBottom: spacing.md }}>Haftalık antrenman sıklığı</Text>
            <BarChart data={freq.map((f) => ({ label: f.label, value: f.count }))} showValues />
          </Card>
          <Card style={{ marginBottom: spacing.md }}>
            <Text variant="label" style={{ marginBottom: spacing.md }}>Kaldırılan hacim trendi (ton, son {vol.length} antrenman)</Text>
            <BarChart data={vol.map((v, i) => ({ label: i === 0 ? 'eski' : i === vol.length - 1 ? 'yeni' : '', value: Number((v.valueKg / 1000).toFixed(2)) }))} />
          </Card>
        </>
      ) : (
        <Card style={{ borderStyle: 'dashed', marginBottom: spacing.md }}>
          <Text variant="label">Henüz antrenman yok — bir antrenman ekleyince istatistikler burada görünecek.</Text>
        </Card>
      )}

      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="label" style={{ marginBottom: spacing.md }}>Son 7 gün kalori</Text>
        {hasCals ? (
          <BarChart
            data={cals.map((c) => ({ label: c.label, value: Math.round(c.calories) }))}
            color={colors.carb}
            goal={calGoal}
            overColor={colors.fat}
            goalColor={colors.fat}
          />
        ) : (
          <Text variant="label">Son 7 günde besin kaydı yok.</Text>
        )}
      </Card>

      {hasWorkouts ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Text variant="label" style={{ marginBottom: spacing.md }}>Antrenman serisi (son 6 hafta)</Text>
          <Heatmap weeks={heat} max={heatMax} />
        </Card>
      ) : null}
    </View>
  )
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors. (Confirms `Card` accepts `style` with `alignItems`/`borderStyle`, `Text` accepts `style` fontSize override, and `stats-chart` is a valid Ionicons glyph.)

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/StatsSection.tsx
git commit -m "feat(mobile): StatsSection wiring data to charts"
```

---

### Task 6: Render `StatsSection` in Profile

**Files:**
- Modify: `mobile/src/app/(app)/profile.tsx`

- [ ] **Step 1: Add the import**

In `mobile/src/app/(app)/profile.tsx`, add after the existing component imports (after the `../../lib/queries` import, ~line 7):

```tsx
import { StatsSection } from '../../components/StatsSection'
```

- [ ] **Step 2: Render it between the Goals card and the Çıkış button**

Find the closing of the Goals `Card` followed by the sign-out `Button` (lines ~52-54):

```tsx
      </Card>

      <Button title="Çıkış Yap" variant="ghost" onPress={() => supabase.auth.signOut()} />
```

Replace with:

```tsx
      </Card>

      <StatsSection />

      <Button title="Çıkış Yap" variant="ghost" onPress={() => supabase.auth.signOut()} />
```

- [ ] **Step 3: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "mobile/src/app/(app)/profile.tsx"
git commit -m "feat(mobile): show stats section in profile"
```

---

### Task 7: Visual verification + OTA publish

**Files:** none (verification only)

- [ ] **Step 1: Start the app**

Run (from `mobile/`): `npx expo start` and open on device/emulator.

- [ ] **Step 2: Verify against the spec**

- Profile → below "Günlük Hedefler": "📊 İstatistikler" header.
- 3 summary cards (Toplam antrenman / Bu hafta / Toplam hacim in tonnes).
- Weekly frequency bars with counts; volume trend bars (oldest→newest, "eski"/"yeni" labels).
- Last-7-days calorie bars with a dashed goal line; bars at/over goal render in fat-orange, others in carb-blue.
- Heatmap: 6 week rows × 7 cells, intensity shaded; legend "az → çok".
- Empty states: with no workouts, workout charts/heatmap replaced by the dashed "Henüz antrenman yok…" card; with no week food entries, calorie card shows "Son 7 günde besin kaydı yok."

- [ ] **Step 3: Confirm OTA promise intact**

Run (from `mobile/`):
```bash
grep -icE "svg|victory|chart-kit|gifted-charts|skia" package.json
```
Expected: `0` — no charting/SVG/native dependency was added, so this ships via EAS Update with no new APK. (All charts are pure `<View>`.)

- [ ] **Step 4: Publish via OTA (Android only)**

`eas update` defaults to `--platform=all`, and the web static-render export crashes (`window is not defined`, pre-existing Supabase/AsyncStorage issue). Always scope to android:

```bash
cd mobile && npx eas-cli update --branch preview --platform android --message "Phase 3 stats + charts" --non-interactive
```
Requires an active EAS login (`npx eas-cli whoami`). After publish, user fully closes and reopens the app (may take two launches: download then apply).

---

## Notes for the executor

- No new dependencies — adding any native dep (incl. `react-native-svg`) breaks the OTA-only guarantee.
- All UI copy Turkish; dark theme + lime accent tokens in `mobile/src/theme/index.ts`.
- `stats.ts` is pure (no React/Supabase imports) — keep it that way so it stays unit-testable.
- If `npx tsc --noEmit` rejects the `stats-chart` Ionicons name, pick the nearest valid glyph (e.g. `bar-chart`) and keep going.
- Don't refactor `nutrition.tsx`'s local `todayISO` — out of scope; `stats.ts` has its own.
