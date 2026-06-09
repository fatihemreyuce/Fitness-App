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
