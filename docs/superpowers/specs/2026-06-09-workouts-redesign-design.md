# Workouts Section Redesign Design Spec

**Date:** 2026-06-09
**Status:** Approved (brainstorm)
**Ships via:** OTA / EAS Update only. **No new dependency, no new APK.** All UI is pure `<View>` + Ionicons (already in project).

## Goal

Redesign the three Workouts screens so each conveys what a workout actually contains, with a consistent visual language (lime accent bar, stat blocks, exercise grouping):
1. **List** (`index.tsx`) — rich cards: date, exercise chips, set/volume/exercise stats (was: date only).
2. **Detail** (`workout/[id].tsx`) — summary header (date + set/volume/exercise) and sets grouped by exercise (was: flat set list).
3. **New workout** (`new-workout.tsx`) — draft sets grouped by exercise, per-set delete, live running total, button icons (was: plain text rows).

## Constraints

- **OTA-safe only.** No new native deps. Pure `<View>` + `Ionicons` from `@expo/vector-icons`.
- Turkish copy. Dark theme + lime accent; tokens in `mobile/src/theme/index.ts` (`accent #c8ff00`, `card #16191f`, `border #23272f`, `textMuted #9aa0ab`, `danger #ff6b6b`).
- Follow existing `Card`/`Text`/`Button`/`Input` patterns. Reuse `stats.ts` (`workoutVolume`).
- `useWorkouts` is used only by `index.tsx`; `useWorkoutSets` only by `workout/[id].tsx` — both safe to extend.

## Data model (existing, no schema changes)

- `workouts(id, user_id, started_at, ended_at, notes)`.
- `workout_sets(id, workout_id, exercise_id, set_number, reps, weight_kg)` + `exercise:exercises(name)`.
- Volume per set = `reps * weight_kg`.

## Architecture

### Pure helpers — extend `mobile/src/lib/stats.ts`

Operate on a minimal set shape `{ reps: number; weight_kg: number; exercise: { name: string } }`:

- `workoutSummary(sets): { setCount: number; volumeKg: number; exercises: string[] }` — `setCount` = sets.length; `volumeKg` via existing `workoutVolume`; `exercises` = distinct exercise names in first-seen order.
- `groupSetsByExercise(sets): { exerciseName: string; sets: T[] }[]` — group consecutive-or-not by exercise name, preserving first-seen order; each group keeps its sets in original order.

Both pure, no React/Supabase — unit-testable like the rest of `stats.ts`.

### Query hooks — extend `mobile/src/lib/queries.ts`

- **Extend `useWorkouts`** to embed sets + exercise names:
  `from('workouts').select('*, workout_sets(reps, weight_kg, exercise:exercises(name))').order('started_at', { ascending: false })`.
  New return type `WorkoutWithSets = Workout & { workout_sets: { reps: number; weight_kg: number; exercise: { name: string } | null }[] }`. The list computes each card's summary via `workoutSummary`.
- **Add `useWorkout(id)`** — `from('workouts').select('started_at').eq('id', id).single()` → `{ started_at: string }`. Used by the detail header for the date. queryKey `['workout', id]`.
- `useWorkoutSets(id)` stays as-is (already returns sets with `exercise`); detail groups them client-side.

### Reusable components — `mobile/src/components/workouts/` (new dir)

- `WorkoutStatHeader.tsx` — the lime-bar summary header. Props `{ title: string; subtitle?: string; stats: { value: string; label: string }[] }`. A `Card` with a 3px lime top bar, bold title, and a row of stat blocks (lime value + muted uppercase label). Used in **detail** (and any future workout summary).
- `ExerciseSetGroup.tsx` — one exercise with its sets. Props `{ exerciseName: string; sets: { reps: number; weight_kg: number }[]; onDeleteSet?: (index: number) => void }`. Header: barbell icon + name + "N set"; each set is a numbered chip + `reps × weight kg`; if `onDeleteSet` provided, a red ✕ (`close`) per row. Used in **detail** (read-only) and **new-workout** (with delete).
- `WorkoutCard.tsx` — the list card (direction B). Props `{ date: Date; exercises: string[]; setCount: number; volumeKg: number; onPress: () => void }`. Lime top bar, date (long format) + time, up to 3 exercise chips + `+N` overflow chip, stat row (set / volume in tonnes / exercise count). Wrapped in `Pressable`.

### Screen changes

- **`index.tsx`** — map `useWorkouts()` data to `<WorkoutCard>` per item, computing `workoutSummary(item.workout_sets)` for chips/stats; keep the "+ Yeni Antrenman" button (add `add` icon) and empty state. `started_at` → `Date`.
- **`workout/[id].tsx`** — call `useWorkout(id)` + `useWorkoutSets(id)`; render `<WorkoutStatHeader>` (date long format + time; stats from `workoutSummary(sets)`), then `groupSetsByExercise(sets).map(...)` → `<ExerciseSetGroup>` (read-only). Keep loading/empty states.
- **`new-workout.tsx`** — keep the existing draft-set state and add logic. Replace the flat set `FlatList` with `groupSetsByExercise(sets)` → `<ExerciseSetGroup onDeleteSet=…>`; deleting removes that set from `sets` state by identity/index. Add a live total bar above the save button: `{sets.length} set · {(totalVolumeKg/1000).toFixed(1)} t` (lime-tinted). Add icons: `add` on "Set", `checkmark` on "Antrenmanı Kaydet". Keep validation/`save()` unchanged (still renumbers `set_number` sequentially on save).

## Volume / formatting

- Card & header volume shown in **tonnes** = kg/1000, 1 decimal (e.g. `2.4 t`). Live total in new-workout same.
- Date long format via `toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })`; time via `toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })`.

## Error / empty / loading states

- List: existing loading text; empty → "Henüz antrenman yok." (keep). A workout with zero sets → chips empty, stats show `0 set · 0 t · 0 egzersiz` (no crash; `workoutSummary([])` returns zeros/empty).
- Detail: loading text; if no sets → keep "Bu antrenmanda set yok." below the header (header still shows date with zero stats).
- New-workout: empty draft → "Henüz set eklenmedi." in place of groups; total bar hidden until ≥1 set.
- Null-safety: a set with null `exercise` falls back to name "Egzersiz" (mirror existing null guards).

## Out of scope (YAGNI)

- No edit-after-save, no reorder, no rest timer, no per-exercise PR badges, no workout notes editor changes.
- No new dependency; no animation.

## Verification

- `npx tsc --noEmit` green (no test harness; `expo lint` unconfigured — skip). `stats.ts` helpers pure/testable.
- Visual run: list cards show chips + stats; detail shows header + grouped sets; new-workout groups sets, deletes work, total updates live; create→save still works and returns to list.
- Confirm `package.json` unchanged — OTA-safe. Publish with `--platform android`.

## Files touched (summary)

- Modify: `mobile/src/lib/stats.ts` (`workoutSummary`, `groupSetsByExercise`)
- Modify: `mobile/src/lib/queries.ts` (extend `useWorkouts`, add `useWorkout`, `WorkoutWithSets` type)
- Create: `mobile/src/components/workouts/WorkoutCard.tsx`
- Create: `mobile/src/components/workouts/WorkoutStatHeader.tsx`
- Create: `mobile/src/components/workouts/ExerciseSetGroup.tsx`
- Modify: `mobile/src/app/(app)/index.tsx`
- Modify: `mobile/src/app/(app)/workout/[id].tsx`
- Modify: `mobile/src/app/(app)/new-workout.tsx`
