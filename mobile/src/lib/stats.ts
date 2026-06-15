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
  return (sets ?? []).reduce((s, r) => {
    // Bozuk/eksik veriyi (NaN, negatif, 0) hacme katma.
    if (!Number.isFinite(r.reps) || !Number.isFinite(r.weight_kg) || r.reps <= 0 || r.weight_kg <= 0) return s
    return s + r.reps * r.weight_kg
  }, 0)
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

// ============ Şablon draft çözümlemesi (saf) ============
export type DraftSet = { exercise_id: string; exercise_name: string; reps: number; weight_kg: number }
export type TemplateSetRow = {
  set_number: number
  target_reps: number
  target_weight_kg: number
  exercise: { id: string; name: string } | null
}

// Şablon setlerini new-workout draft'ına çevirir (B/akıllı model):
// kilo = o egzersizin son antrenmandaki kilosu (lastWeightByExercise), yoksa şablon yedeği.
// Silinmiş egzersiz (exercise null) atlanır. Setler set_number sırasıyla beklenir.
export function templateDraftSets(
  sets: TemplateSetRow[],
  lastWeightByExercise: Map<string, number>,
): DraftSet[] {
  const out: DraftSet[] = []
  for (const s of sets) {
    if (!s.exercise) continue
    const last = lastWeightByExercise.get(s.exercise.id)
    out.push({
      exercise_id: s.exercise.id,
      exercise_name: s.exercise.name,
      reps: s.target_reps,
      weight_kg: last ?? s.target_weight_kg,
    })
  }
  return out
}

// ============ Kilo takibi (saf) ============
export type BodyWeightRow = { entry_date: string; weight_kg: number }

// Güncel kilo (en yeni kayıt) + ~7 gün önceki en yakın kayda göre değişim.
// entries herhangi bir sırada gelebilir; içeride tarihe göre sıralanır.
// Tek kayıt veya boş → change7d null. current boşsa null.
export function weightSummary(
  entries: BodyWeightRow[],
): { current: number | null; change7d: number | null } {
  if (entries.length === 0) return { current: null, change7d: null }
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  const last = sorted[sorted.length - 1]
  const current = last.weight_kg
  if (sorted.length < 2) return { current, change7d: null }

  const target = parseISODate(last.entry_date).getTime() - 7 * DAY_MS
  let best = sorted[0]
  let bestDiff = Infinity
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = Math.abs(parseISODate(sorted[i].entry_date).getTime() - target)
    if (diff < bestDiff) { bestDiff = diff; best = sorted[i] }
  }
  const change = current - best.weight_kg
  return { current, change7d: Number.isFinite(change) ? Number(change.toFixed(1)) : null }
}

// Grafik için: en yeni kaydın tarihinden geriye `days` günlük penceredeki
// kayıtların kronolojik weight_kg dizisi. Saf, saat bağımlılığı yok (pencere
// en yeni kayda göre hesaplanır). Boş giriş → [].
export function weightChartPoints(entries: BodyWeightRow[], days = 30): number[] {
  if (entries.length === 0) return []
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  const lastTime = parseISODate(sorted[sorted.length - 1].entry_date).getTime()
  const cutoff = lastTime - (days - 1) * DAY_MS
  return sorted
    .filter((e) => parseISODate(e.entry_date).getTime() >= cutoff)
    .map((e) => e.weight_kg)
}

// === Antrenman haftalık momentum (Antrenmanlar ekranı hero'su) ===
export type WeekMomentum = {
  count: number
  volumeKg: number
  dayDots: boolean[] // uzunluk 7, Pzt..Paz
  todayIndex: number // 0..6 (Pzt=0)
  streakWeeks: number
}

// Bir timestamp'in ait olduğu haftanın Pazartesi 00:00'ının ms'i (yerel saat).
function weekMondayMs(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // Pzt=0 ... Paz=6
  return d.getTime() - dow * DAY_MS
}

// Bu haftanın özeti + haftalık seri. Saf; nowMs test edilebilirlik için parametre.
export function weekMomentum(
  workouts: { started_at: string; workout_sets: { reps: number; weight_kg: number }[] }[],
  nowMs: number,
): WeekMomentum {
  const thisMon = weekMondayMs(nowMs)
  const dayDots = [false, false, false, false, false, false, false]
  const todayIndex = (new Date(nowMs).getDay() + 6) % 7
  let count = 0
  let volumeKg = 0
  const activeWeeks = new Set<number>()

  for (const w of workouts ?? []) {
    const t = Date.parse(w.started_at)
    if (!Number.isFinite(t)) continue
    const wm = weekMondayMs(t)
    activeWeeks.add(wm)
    if (wm === thisMon) {
      const dow = (new Date(t).getDay() + 6) % 7
      dayDots[dow] = true
      count++
      volumeKg += workoutVolume(w.workout_sets)
    }
  }

  // Seri: en son aktif haftadan geriye kesintisiz aktif hafta sayısı.
  let streakWeeks = 0
  if (activeWeeks.size > 0) {
    let cur = Math.max(...activeWeeks)
    while (activeWeeks.has(cur)) {
      streakWeeks++
      cur = weekMondayMs(cur - DAY_MS)
    }
  }

  return { count, volumeKg, dayDots, todayIndex, streakWeeks }
}
