// mobile/src/lib/exercises.ts
// Egzersiz ekranı için saf yardımcılar — React/Supabase'siz, izole test edilebilir.

export const MUSCLE_GROUPS = ['Göğüs', 'Sırt', 'Bacak', 'Omuz', 'Kol', 'Karın', 'Kalça', 'Kardiyo'] as const
export const MUSCLE_OTHER = 'Diğer'
export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Makine', 'Kablo', 'Vücut Ağırlığı', 'Kettlebell', 'Bant'] as const
export const EQUIPMENT_NONE = 'Belirtilmemiş'

// Bir egzersizin tek bir set kaydı + ait olduğu seansın tarihi (ISO).
export type HistorySet = { reps: number; weight_kg: number; set_number: number; date: string }

// Güne göre gruplanmış seans.
export type Session = { date: string; sets: HistorySet[]; topWeight: number; volume: number }

// Serbest-metin kas grubunu kanonik gruba eşler. Eşleşmezse 'Diğer'.
export function normalizeMuscle(raw: string | null | undefined): string {
  const s = (raw ?? '').toLowerCase().trim()
  if (!s) return MUSCLE_OTHER
  const has = (...keys: string[]) => keys.some((k) => s.includes(k))
  if (has('göğüs', 'gogus', 'chest', 'pec')) return 'Göğüs'
  if (has('sırt', 'sirt', 'back', 'lat')) return 'Sırt'
  if (has('bacak', 'leg', 'quad', 'hamstring', 'calf', 'baldır')) return 'Bacak'
  if (has('omuz', 'shoulder', 'delt')) return 'Omuz'
  if (has('kol', 'arm', 'biceps', 'triceps', 'bicep', 'tricep')) return 'Kol'
  if (has('karın', 'karin', 'abs', 'core', 'abdom')) return 'Karın'
  if (has('kalça', 'kalca', 'glute', 'hip')) return 'Kalça'
  if (has('kardiyo', 'cardio')) return 'Kardiyo'
  return MUSCLE_OTHER
}

// Serbest-metin ekipmanı kanonik değere eşler. Boş/eşleşmez → 'Belirtilmemiş'.
export function normalizeEquipment(raw: string | null | undefined): string {
  const s = (raw ?? '').toLowerCase().trim()
  if (!s) return EQUIPMENT_NONE
  const has = (...keys: string[]) => keys.some((k) => s.includes(k))
  if (has('barbell', 'bar')) return 'Barbell'
  if (has('dumbbell', 'dumbell', 'dambıl', 'dambil')) return 'Dumbbell'
  if (has('makine', 'machine')) return 'Makine'
  if (has('kablo', 'cable')) return 'Kablo'
  if (has('vücut', 'vucut', 'bodyweight', 'body weight')) return 'Vücut Ağırlığı'
  if (has('kettlebell', 'kettle')) return 'Kettlebell'
  if (has('bant', 'band')) return 'Bant'
  return EQUIPMENT_NONE
}

// En ağır set ağırlığı (PR). Boş → 0.
export function personalRecord(sets: { weight_kg: number }[]): number {
  let max = 0
  for (const s of sets) if (Number.isFinite(s.weight_kg) && s.weight_kg > max) max = s.weight_kg
  return max
}

// Tahmini 1RM = max(setler) Epley: w*(1+reps/30), yuvarlanmış. Boş → 0.
export function estimate1RM(sets: { weight_kg: number; reps: number }[]): number {
  let best = 0
  for (const s of sets) {
    const w = Number.isFinite(s.weight_kg) ? s.weight_kg : 0
    const r = Number.isFinite(s.reps) && s.reps > 0 ? s.reps : 1
    const e = w * (1 + r / 30)
    if (e > best) best = e
  }
  return Math.round(best)
}

// Setleri güne (date'in gün kısmına) göre grupla; her seans için topWeight + volume hesapla.
// Sonuç EN YENİ seans başta (date azalan).
export function groupBySession(sets: HistorySet[]): Session[] {
  const byDay = new Map<string, HistorySet[]>()
  for (const s of sets) {
    const day = (s.date ?? '').slice(0, 10) // YYYY-MM-DD
    if (!day) continue
    const arr = byDay.get(day)
    if (arr) arr.push(s)
    else byDay.set(day, [s])
  }
  const sessions: Session[] = []
  for (const [day, daySets] of byDay) {
    const ordered = [...daySets].sort((a, b) => a.set_number - b.set_number)
    const topWeight = personalRecord(daySets)
    let volume = 0
    for (const s of daySets) volume += (s.weight_kg || 0) * (s.reps || 0)
    sessions.push({ date: day, sets: ordered, topWeight, volume })
  }
  sessions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) // en yeni başta
  return sessions
}

// Grafik girdisi: kronolojik (eski→yeni) seans topWeight dizisi.
export function trendPoints(sessions: Session[]): number[] {
  return [...sessions].reverse().map((s) => s.topWeight)
}

// ISO tarihten bugüne tam gün farkı. nowMs test edilebilirlik için parametre.
export function daysSince(iso: string, nowMs: number): number {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return 0
  return Math.max(0, Math.floor((nowMs - then) / 86_400_000))
}
