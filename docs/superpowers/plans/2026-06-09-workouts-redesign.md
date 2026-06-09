# Workouts Section Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the three Workouts screens (list, detail, new) with rich cards, summary headers, and exercise-grouped sets — OTA-safe, pure `<View>` + Ionicons.

**Architecture:** Two pure helpers added to `stats.ts`; `useWorkouts` extended to embed sets + a new `useWorkout(id)`; three reusable `components/workouts/` components; three screens rewired. No schema changes, no new dependencies.

**Tech Stack:** Expo SDK 54, expo-router, React Native, TypeScript, TanStack Query, Supabase, `@expo/vector-icons`.

**Verification model:** No unit-test harness; each task verifies with `npx tsc --noEmit`. `expo lint` unconfigured — skip. Final visual run, then OTA publish `--platform android`.

**Reference spec:** `docs/superpowers/specs/2026-06-09-workouts-redesign-design.md`

---

## File Structure

- Modify `mobile/src/lib/stats.ts` — `workoutSummary`, `groupSetsByExercise` (pure).
- Modify `mobile/src/lib/queries.ts` — extend `useWorkouts`, add `useWorkout`, `WorkoutWithSets` type.
- Create `mobile/src/components/workouts/WorkoutStatHeader.tsx` — lime-bar summary header.
- Create `mobile/src/components/workouts/ExerciseSetGroup.tsx` — grouped exercise + sets (+ optional delete).
- Create `mobile/src/components/workouts/WorkoutCard.tsx` — rich list card.
- Modify `mobile/src/app/(app)/index.tsx` — render `WorkoutCard`.
- Modify `mobile/src/app/(app)/workout/[id].tsx` — header + grouped sets.
- Modify `mobile/src/app/(app)/new-workout.tsx` — grouped draft sets + delete + total + icons.

Build order: helpers → hooks → components → screens.

---

### Task 1: Pure helpers in `stats.ts`

**Files:**
- Modify: `mobile/src/lib/stats.ts`

- [ ] **Step 1: Append the two helpers at the end of `mobile/src/lib/stats.ts`**

```ts
export type ExerciseSetRow = { reps: number; weight_kg: number; exercise: { name: string } | null }

export function workoutSummary(sets: ExerciseSetRow[]): { setCount: number; volumeKg: number; exercises: string[] } {
  const exercises: string[] = []
  for (const s of sets) {
    const name = s.exercise?.name ?? 'Egzersiz'
    if (!exercises.includes(name)) exercises.push(name)
  }
  return { setCount: sets.length, volumeKg: workoutVolume(sets), exercises }
}

export function groupSetsByExercise<T>(sets: T[], getName: (s: T) => string): { exerciseName: string; sets: T[] }[] {
  const groups: { exerciseName: string; sets: T[] }[] = []
  const index = new Map<string, number>()
  for (const s of sets) {
    const name = getName(s)
    let i = index.get(name)
    if (i === undefined) { i = groups.length; index.set(name, i); groups.push({ exerciseName: name, sets: [] }) }
    groups[i].sets.push(s)
  }
  return groups
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors. (`workoutVolume` already accepts `{reps, weight_kg}[]`; `ExerciseSetRow[]` is assignable.)

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/stats.ts
git commit -m "feat(mobile): workoutSummary + groupSetsByExercise helpers"
```

---

### Task 2: Extend queries — `useWorkouts` embed sets, add `useWorkout`

**Files:**
- Modify: `mobile/src/lib/queries.ts`

- [ ] **Step 1: Replace the existing `useWorkouts` function**

Find (currently ~lines 57-67):

```ts
// --- Antrenmanlar ---
export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async (): Promise<Workout[]> => {
      const { data, error } = await supabase
        .from('workouts').select('*').order('started_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}
```

Replace with:

```ts
// --- Antrenmanlar ---
export type WorkoutWithSets = Workout & {
  workout_sets: { reps: number; weight_kg: number; exercise: { name: string } | null }[]
}

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async (): Promise<WorkoutWithSets[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*, workout_sets(reps, weight_kg, exercise:exercises(name))')
        .order('started_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as WorkoutWithSets[]
    },
  })
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: ['workout', id],
    queryFn: async (): Promise<{ started_at: string }> => {
      const { data, error } = await supabase.from('workouts').select('started_at').eq('id', id).single()
      if (error) throw error
      return data as { started_at: string }
    },
  })
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/queries.ts
git commit -m "feat(mobile): embed sets in useWorkouts + add useWorkout"
```

---

### Task 3: `WorkoutStatHeader` component

**Files:**
- Create: `mobile/src/components/workouts/WorkoutStatHeader.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { View } from 'react-native'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'

export function WorkoutStatHeader({ title, subtitle, stats }: {
  title: string
  subtitle?: string
  stats: { value: string; label: string }[]
}) {
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md }}>
      <View style={{ height: 3, backgroundColor: colors.accent }} />
      <View style={{ padding: spacing.lg }}>
        <Text variant="subtitle" style={{ textTransform: 'capitalize' }}>{title}</Text>
        {subtitle ? <Text variant="label" style={{ marginTop: 2 }}>{subtitle}</Text> : null}
        <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md }}>
          {stats.map((s, i) => (
            <View key={i}>
              <Text variant="stat" color={colors.accent} style={{ fontSize: 18 }}>{s.value}</Text>
              <Text variant="label" style={{ fontSize: 10, textTransform: 'uppercase' }}>{s.label}</Text>
            </View>
          ))}
        </View>
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
git add mobile/src/components/workouts/WorkoutStatHeader.tsx
git commit -m "feat(mobile): WorkoutStatHeader component"
```

---

### Task 4: `ExerciseSetGroup` component

**Files:**
- Create: `mobile/src/components/workouts/ExerciseSetGroup.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'

export function ExerciseSetGroup({ exerciseName, sets, onDeleteSet }: {
  exerciseName: string
  sets: { reps: number; weight_kg: number }[]
  onDeleteSet?: (indexInGroup: number) => void
}) {
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: spacing.sm }}>
        <Ionicons name="barbell" size={16} color={colors.accent} />
        <Text variant="body" style={{ fontWeight: '700' }}>{exerciseName}</Text>
        <Text variant="label" style={{ marginLeft: 'auto' }}>{sets.length} set</Text>
      </View>
      {sets.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.border }}>
          <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="label" style={{ fontSize: 10 }}>{i + 1}</Text>
          </View>
          <Text variant="body" style={{ flex: 1 }}>{s.reps} <Text variant="label">tekrar ×</Text> {s.weight_kg} kg</Text>
          {onDeleteSet ? (
            <Pressable onPress={() => onDeleteSet(i)} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  )
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/workouts/ExerciseSetGroup.tsx
git commit -m "feat(mobile): ExerciseSetGroup component"
```

---

### Task 5: `WorkoutCard` component

**Files:**
- Create: `mobile/src/components/workouts/WorkoutCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { View, Pressable } from 'react-native'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'

function StatMini({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text variant="body" color={colors.text} style={{ fontWeight: '800' }}>{value}</Text>
      <Text variant="label" style={{ fontSize: 10 }}>{label}</Text>
    </View>
  )
}

export function WorkoutCard({ date, exercises, setCount, volumeKg, onPress }: {
  date: Date
  exercises: string[]
  setCount: number
  volumeKg: number
  onPress: () => void
}) {
  const shown = exercises.slice(0, 3)
  const extra = exercises.length - shown.length
  const dateStr = date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  return (
    <Pressable onPress={onPress} style={{ marginBottom: spacing.sm }}>
      <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' }}>
        <View style={{ height: 3, backgroundColor: colors.accent }} />
        <View style={{ padding: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="body" style={{ fontWeight: '700', textTransform: 'capitalize' }}>{dateStr}</Text>
            <Text variant="label">{timeStr}</Text>
          </View>
          {exercises.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: spacing.sm }}>
              {shown.map((name, i) => (
                <View key={i} style={{ backgroundColor: '#c8ff0015', borderWidth: 1, borderColor: '#c8ff0033', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 }}>
                  <Text variant="label" color={colors.accent} style={{ fontSize: 10 }}>{name}</Text>
                </View>
              ))}
              {extra > 0 ? (
                <View style={{ backgroundColor: colors.cardAlt, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 }}>
                  <Text variant="label" style={{ fontSize: 10 }}>+{extra}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm }}>
            <StatMini value={String(setCount)} label="set" />
            <StatMini value={`${(volumeKg / 1000).toFixed(1)} t`} label="hacim" />
            <StatMini value={String(exercises.length)} label="egzersiz" />
          </View>
        </View>
      </View>
    </Pressable>
  )
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/workouts/WorkoutCard.tsx
git commit -m "feat(mobile): WorkoutCard list component"
```

---

### Task 6: Rewire the list screen `index.tsx`

**Files:**
- Modify: `mobile/src/app/(app)/index.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useWorkouts } from '../../lib/queries'
import { workoutSummary } from '../../lib/stats'
import { WorkoutCard } from '../../components/workouts/WorkoutCard'

export default function Workouts() {
  const { data: workouts, isLoading, refetch } = useWorkouts()
  const router = useRouter()

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Antrenmanlar</Text>
      <Button icon="add" title="Yeni Antrenman" onPress={() => router.push('/(app)/new-workout')} />
      <FlatList
        style={{ marginTop: spacing.lg }}
        data={workouts}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={<Text color={colors.textMuted}>Henüz antrenman yok.</Text>}
        renderItem={({ item }) => {
          const s = workoutSummary(item.workout_sets ?? [])
          return (
            <WorkoutCard
              date={new Date(item.started_at)}
              exercises={s.exercises}
              setCount={s.setCount}
              volumeKg={s.volumeKg}
              onPress={() => router.push(`/(app)/workout/${item.id}`)}
            />
          )
        }}
      />
    </Screen>
  )
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "mobile/src/app/(app)/index.tsx"
git commit -m "feat(mobile): rich workout cards on list screen"
```

---

### Task 7: Rewire the detail screen `workout/[id].tsx`

**Files:**
- Modify: `mobile/src/app/(app)/workout/[id].tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { FlatList } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Screen, Text } from '../../../components/ui'
import { colors } from '../../../theme'
import { useWorkout, useWorkoutSets } from '../../../lib/queries'
import { workoutSummary, groupSetsByExercise } from '../../../lib/stats'
import { WorkoutStatHeader } from '../../../components/workouts/WorkoutStatHeader'
import { ExerciseSetGroup } from '../../../components/workouts/ExerciseSetGroup'

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: workout } = useWorkout(id)
  const { data: sets, isLoading } = useWorkoutSets(id)

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  const list = sets ?? []
  const s = workoutSummary(list)
  const groups = groupSetsByExercise(list, (x) => x.exercise?.name ?? 'Egzersiz')
  const date = workout ? new Date(workout.started_at) : null

  return (
    <Screen>
      <WorkoutStatHeader
        title={date ? date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Antrenman'}
        subtitle={date ? date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : undefined}
        stats={[
          { value: String(s.setCount), label: 'set' },
          { value: `${(s.volumeKg / 1000).toFixed(1)} t`, label: 'hacim' },
          { value: String(s.exercises.length), label: 'egzersiz' },
        ]}
      />
      <FlatList
        data={groups}
        keyExtractor={(g) => g.exerciseName}
        ListEmptyComponent={<Text color={colors.textMuted}>Bu antrenmanda set yok.</Text>}
        renderItem={({ item }) => <ExerciseSetGroup exerciseName={item.exerciseName} sets={item.sets} />}
      />
    </Screen>
  )
}
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "mobile/src/app/(app)/workout/[id].tsx"
git commit -m "feat(mobile): detail screen summary header + grouped sets"
```

---

### Task 8: Rewire the new-workout screen `new-workout.tsx`

**Files:**
- Modify: `mobile/src/app/(app)/new-workout.tsx`

Keep the existing draft-set state, `addSet`, and `save` logic. Add a `removeSet` helper, group the draft sets for rendering, add a live total bar, and add button icons.

- [ ] **Step 1: Add imports**

In `mobile/src/app/(app)/new-workout.tsx`, add after the existing imports (after the `../../lib/queries` import, ~line 6):

```tsx
import { groupSetsByExercise } from '../../lib/stats'
import { ExerciseSetGroup } from '../../components/workouts/ExerciseSetGroup'
```

- [ ] **Step 2: Add `removeSet` after the `addSet` function**

After the `addSet` function (ends ~line 23), add:

```tsx
  function removeSet(globalIndex: number) {
    setSets((prev) => prev.filter((_, i) => i !== globalIndex))
  }
```

- [ ] **Step 3: Replace the draft-set `FlatList` and save button**

Find (currently ~lines 49-58):

```tsx
      <FlatList
        style={{ flex: 1 }} data={sets} keyExtractor={(_, i) => String(i)}
        ListEmptyComponent={<Text color={colors.textMuted}>Henüz set eklenmedi.</Text>}
        renderItem={({ item, index }) => (
          <Text variant="body" style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.border }}>
            {index + 1}. {item.exercise_name} — {item.reps} tekrar × {item.weight_kg} kg
          </Text>
        )}
      />
      <Button title={createWorkout.isPending ? 'Kaydediliyor...' : 'Antrenmanı Kaydet'} onPress={save} disabled={createWorkout.isPending} style={{ marginTop: spacing.sm }} />
```

Replace with:

```tsx
      <FlatList
        style={{ flex: 1 }}
        data={groupSetsByExercise(sets.map((s, i) => ({ ...s, _i: i })), (s) => s.exercise_name)}
        keyExtractor={(g) => g.exerciseName}
        ListEmptyComponent={<Text color={colors.textMuted}>Henüz set eklenmedi.</Text>}
        renderItem={({ item }) => (
          <ExerciseSetGroup
            exerciseName={item.exerciseName}
            sets={item.sets}
            onDeleteSet={(gi) => removeSet(item.sets[gi]._i)}
          />
        )}
      />
      {sets.length > 0 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#c8ff0012', borderWidth: 1, borderColor: '#c8ff0033', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12, marginVertical: spacing.sm }}>
          <Text variant="label">Toplam</Text>
          <Text variant="body" color={colors.accent} style={{ fontWeight: '700' }}>
            {sets.length} set · {(sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0) / 1000).toFixed(1)} t
          </Text>
        </View>
      ) : null}
      <Button icon="checkmark" title={createWorkout.isPending ? 'Kaydediliyor...' : 'Antrenmanı Kaydet'} onPress={save} disabled={createWorkout.isPending} style={{ marginTop: spacing.sm }} />
```

- [ ] **Step 4: Add an icon to the "Set Ekle" button**

Find (~line 47): `<Button title="Set Ekle" onPress={addSet} />`
Replace with: `<Button icon="add" title="Set" onPress={addSet} />`

- [ ] **Step 5: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no errors. (`groupSetsByExercise` is generic, so `{...s, _i}` items keep their `_i` field accessible in `renderItem`.)

- [ ] **Step 6: Commit**

```bash
git add "mobile/src/app/(app)/new-workout.tsx"
git commit -m "feat(mobile): grouped draft sets + delete + live total in new-workout"
```

---

### Task 9: Visual verification + OTA publish

**Files:** none (verification only)

- [ ] **Step 1: Start the app**

Run (from `mobile/`): `npx expo start` and open on device/emulator.

- [ ] **Step 2: Verify against the spec**

- List: each workout card has a lime top bar, long-format date + time, up to 3 exercise chips (+N overflow), and a set/volume/exercise stat row. Empty list still shows "Henüz antrenman yok."
- Detail: lime-bar summary header (date + time + set/volume/exercise stats); sets grouped by exercise with barbell icon, "N set", numbered rows.
- New-workout: adding sets groups them by exercise; each row has a red ✕ that removes that set; the live "Toplam N set · X t" bar appears once ≥1 set and updates as you add/delete; "＋ Set" and "✓ Antrenmanı Kaydet" buttons have icons; saving still creates the workout and returns to the list.

- [ ] **Step 3: Confirm OTA promise intact**

Run (from `mobile/`):
```bash
grep -icE "svg|victory|chart-kit|gifted-charts|skia" package.json
```
Expected: `0` — no new dependency. Ships via EAS Update, no new APK.

- [ ] **Step 4: Publish via OTA (Android only)**

```bash
cd mobile && npx eas-cli update --branch preview --platform android --message "Workouts section redesign" --non-interactive
```
Requires active EAS login (`npx eas-cli whoami`). After publish, user fully closes and reopens the app (may take two launches).

---

## Notes for the executor

- No new dependencies — keep it OTA-safe.
- All UI copy Turkish; dark theme + lime accent tokens in `mobile/src/theme/index.ts`.
- `stats.ts` helpers stay pure (no React/Supabase).
- Reuse the `Button` `icon` prop added in the earlier polish phase (`icon?: keyof typeof Ionicons.glyphMap`).
- If `npx tsc --noEmit` rejects an Ionicons name, pick the nearest valid glyph and continue.
