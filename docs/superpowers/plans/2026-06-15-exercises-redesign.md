# Egzersizler — Profesyonel Yeniden Tasarım Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Egzersizler sekmesini hibrit profesyonel bir ekrana dönüştür — arama + kas-grubu filtresi + son ağırlıklı liste, egzersize dokununca PR/1RM/trend/geçmiş gösteren zengin detay, ve preset kas-grubu/ekipman ile ekle-düzenle-sil.

**Architecture:** Üç ekran (`exercises.tsx` yeniden, `exercise/[id].tsx` yeni, `new-exercise.tsx` yeni) + saf veri katmanı (`lib/exercises.ts`) + yeni React Query hook'ları. Yeni DB tablosu/kolonu yok (RLS update/delete politikaları mevcut), yeni native modül yok → OTA-uyumlu. Mevcut serbest-metin `muscle_group` değerleri okuma anında normalize edilir.

**Tech Stack:** Expo SDK 54, React 19, expo-router 6, @tanstack/react-query 5, Supabase JS. Mevcut UI primitive'leri: `Screen, Text, Card, Button, Input, StatChip, EmptyState, Hairline`. Mevcut `WeightLineChart` (pure-View) trend grafiği için yeniden kullanılır.

**Design ref:** `docs/superpowers/specs/2026-06-15-exercises-redesign-design.md`

**Test notu:** Projede test runner YOK. Doğrulama kapısı: `cd mobile && npx tsc --noEmit` + cihaz doğrulaması (OTA sonrası). Saf helper'lar (`lib/exercises.ts`) plan içindeki **manuel akıl-yürütme** örnekleriyle doğrulanır.

---

## Agent Split (paralel execution)

Dosyalar çakışmıyor → 5 iş kolu paralel. Agent'lar **commit ETMEZ**; orchestrator entegrasyonda tek `tsc` + commit yapar.

- **Agent A — Saf katman:** Task 1. (`mobile/src/lib/exercises.ts`)
- **Agent B — Veri hook'ları:** Task 2. (`mobile/src/lib/queries.ts` — sona ekler; A'nın `HistorySet` tipini import eder)
- **Agent C — Liste:** Task 3, 4. (`ExerciseRow.tsx`, `MuscleFilter.tsx`, `exercises.tsx`)
- **Agent D — Detay:** Task 5, 6. (`ExerciseHistoryList.tsx`, `exercise/[id].tsx`)
- **Agent E — Ekle/Düzenle + route:** Task 7, 8. (`new-exercise.tsx`, `_layout.tsx`)

Interface bu planda kilitli. C/D/E, B'nin hook imzalarına ve A'nın saf tiplerine göre kodlar.

## Dosya Yapısı

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `mobile/src/lib/exercises.ts` | taksonomi sabitleri + `normalize*` + saf hesaplamalar (`HistorySet`, `Session`, PR/1RM/trend) | Create |
| `mobile/src/lib/queries.ts` | `useExercisesWithLastWeight`, `useExerciseHistory`, `useUpdateExercise`, `useDeleteExercise` | Modify (sona ekle) |
| `mobile/src/components/exercises/ExerciseRow.tsx` | liste satırı | Create |
| `mobile/src/components/exercises/MuscleFilter.tsx` | yatay kas-grubu çipleri | Create |
| `mobile/src/components/exercises/ExerciseHistoryList.tsx` | seans-gruplu geçmiş | Create |
| `mobile/src/app/(app)/exercises.tsx` | liste ekranı (arama+filtre+liste) | Rewrite |
| `mobile/src/app/(app)/exercise/[id].tsx` | zengin detay | Create |
| `mobile/src/app/(app)/new-exercise.tsx` | ekle/düzenle (preset picker) | Create |
| `mobile/src/app/(app)/_layout.tsx` | iki yeni `href:null` route | Modify |

---

### Task 1: Saf katman `lib/exercises.ts` (Agent A)

**Files:**
- Create: `mobile/src/lib/exercises.ts`

- [ ] **Step 1: Taksonomi + tipler + saf fonksiyonları yaz**

```ts
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
```

**Manuel akıl-yürütme (doğrulama):**
- `normalizeMuscle('GÖĞÜS')`→ lowercase `'göğüs'` → 'Göğüs' ✓. `normalizeMuscle('chest')`→'Göğüs' ✓. `normalizeMuscle('Pilates')`→ hiçbiri → 'Diğer' ✓. `normalizeMuscle(null)`→'Diğer' ✓.
- `personalRecord([{weight_kg:60},{weight_kg:55},{weight_kg:70}])`→70 ✓. `personalRecord([])`→0 ✓.
- `estimate1RM([{weight_kg:60,reps:8}])`→ 60*(1+8/30)=60*1.2667=76.0→76 ✓. `estimate1RM([])`→0 ✓.
- `groupBySession` iki gün, gün1 ağırlıkları 60/60/55 → topWeight 60, volume=60*8+60*6+55*8=480+360+440=1280; en yeni gün başta ✓.
- `trendPoints` en yeni-başta seansları ters çevirir → grafik soldan-sağa eskiden yeniye ✓.
- `daysSince('2026-06-12T10:00:00Z', Date.parse('2026-06-15T10:00:00Z'))`→ 3 ✓.

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (dosya tipli, henüz kullanılmıyor — sorun değil).

---

### Task 2: queries.ts hook'ları (Agent B)

**Files:**
- Modify: `mobile/src/lib/queries.ts` (dosyanın sonuna ekle)

`useQuery`, `useMutation`, `useQueryClient`, `supabase`, `requireUserId`, `Exercise` zaten bu dosyada mevcut/tanımlı.

- [ ] **Step 1: Import satırına HistorySet ekle ve hook'ları yaz**

Dosyanın en üstündeki importlara ekle:
```ts
import { type HistorySet } from './exercises'
```

Dosyanın **sonuna** ekle:
```ts
// === Egzersiz detay & yönetim ===

// Egzersizler + her egzersiz için EN SON kaydedilen set ağırlığı (liste satırı ipucu).
export function useExercisesWithLastWeight() {
  return useQuery({
    queryKey: ['exercises', 'with-last-weight'],
    queryFn: async (): Promise<{ exercises: Exercise[]; lastWeight: Record<string, number> }> => {
      const { data: exercises, error } = await supabase.from('exercises').select('*').order('name')
      if (error) throw error
      const list = (exercises ?? []) as Exercise[]
      const ids = list.map((e) => e.id)
      const lastWeight: Record<string, number> = {}
      if (ids.length > 0) {
        const { data: hist, error: hErr } = await supabase
          .from('workout_sets')
          .select('exercise_id, weight_kg, created_at')
          .in('exercise_id', ids)
          .order('created_at', { ascending: false })
        if (hErr) throw hErr
        for (const row of (hist ?? []) as { exercise_id: string; weight_kg: number }[]) {
          if (!(row.exercise_id in lastWeight)) lastWeight[row.exercise_id] = row.weight_kg
        }
      }
      return { exercises: list, lastWeight }
    },
  })
}

// Tek egzersizin tüm set geçmişi (seans tarihiyle). Detay ekranı saf helper'larla işler.
export function useExerciseHistory(exerciseId: string) {
  return useQuery({
    queryKey: ['exercise_history', exerciseId],
    enabled: !!exerciseId,
    queryFn: async (): Promise<HistorySet[]> => {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('reps, weight_kg, set_number, workout:workouts(started_at)')
        .eq('exercise_id', exerciseId)
      if (error) throw error
      type Row = { reps: number; weight_kg: number; set_number: number; workout: { started_at: string } | null }
      return ((data ?? []) as unknown as Row[])
        .filter((r) => r.workout != null)
        .map((r) => ({ reps: r.reps, weight_kg: r.weight_kg, set_number: r.set_number, date: r.workout!.started_at }))
    },
  })
}

// Custom egzersizi günceller (RLS: yalnız owner). 
export function useUpdateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; name: string; muscle_group: string; equipment: string | null }) => {
      await requireUserId()
      const { error } = await supabase
        .from('exercises')
        .update({ name: input.name, muscle_group: input.muscle_group, equipment: input.equipment })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

// Custom egzersizi siler (RLS: yalnız owner).
export function useDeleteExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await requireUserId()
      const { error } = await supabase.from('exercises').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}
```

> Not: `['exercises']` prefix invalidation, `['exercises','with-last-weight']` query'sini de kapsar (React Query partial match). `useExercises` (mevcut) ve `useExercisesWithLastWeight` ikisi de tazelenir.

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 1 tamamlanmış olmalı — `HistorySet` import edilebilir).

---

### Task 3: `ExerciseRow` + `MuscleFilter` bileşenleri (Agent C)

**Files:**
- Create: `mobile/src/components/exercises/ExerciseRow.tsx`
- Create: `mobile/src/components/exercises/MuscleFilter.tsx`

- [ ] **Step 1: ExerciseRow'u yaz**

```tsx
// mobile/src/components/exercises/ExerciseRow.tsx
import { Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'

export function ExerciseRow({
  name,
  subtitle,
  lastWeight,
  isCustom,
  onPress,
}: {
  name: string
  subtitle: string
  lastWeight: number | null
  isCustom: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="body" color={colors.text}>{name}</Text>
          {isCustom ? <Ionicons name="star" size={12} color={colors.accent} /> : null}
        </View>
        <Text variant="label" style={{ marginTop: 2 }}>{subtitle}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {lastWeight != null ? (
          <Text variant="body" color={colors.accent} style={{ fontWeight: '700' }}>{lastWeight} kg</Text>
        ) : (
          <Text variant="label" color={colors.textFaint}>—</Text>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </View>
    </Pressable>
  )
}
```

- [ ] **Step 2: MuscleFilter'ı yaz**

```tsx
// mobile/src/components/exercises/MuscleFilter.tsx
import { ScrollView, Pressable } from 'react-native'
import { Text } from '../ui'
import { colors, spacing, radius } from '../../theme'

export function MuscleFilter({
  groups,
  selected,
  onSelect,
}: {
  groups: string[] // 'Tümü' başta dahil
  selected: string
  onSelect: (g: string) => void
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
    >
      {groups.map((g) => {
        const on = g === selected
        return (
          <Pressable
            key={g}
            onPress={() => onSelect(g)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.xl,
              backgroundColor: on ? colors.accent : colors.cardAlt,
              borderWidth: 1,
              borderColor: on ? colors.accent : 'transparent',
            }}
          >
            <Text variant="label" color={on ? colors.accentText : colors.textMuted} style={{ fontWeight: '700' }}>
              {g}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
```

- [ ] **Step 3: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 4: `exercises.tsx` liste ekranı (Agent C)

**Files:**
- Rewrite: `mobile/src/app/(app)/exercises.tsx`

- [ ] **Step 1: Ekranı tamamen yeniden yaz**

`useExercisesWithLastWeight` (Task 2), `ExerciseRow`/`MuscleFilter` (Task 3), `normalizeMuscle`/`MUSCLE_GROUPS`/`MUSCLE_OTHER` (Task 1) kullanılır.

```tsx
// mobile/src/app/(app)/exercises.tsx
import { useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Input, Button, EmptyState } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useExercisesWithLastWeight } from '../../lib/queries'
import { normalizeMuscle, normalizeEquipment, MUSCLE_GROUPS, MUSCLE_OTHER, EQUIPMENT_NONE } from '../../lib/exercises'
import { ExerciseRow } from '../../components/exercises/ExerciseRow'
import { MuscleFilter } from '../../components/exercises/MuscleFilter'

const ALL = 'Tümü'

export default function Exercises() {
  const { data, isLoading } = useExercisesWithLastWeight()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState(ALL)

  const exercises = data?.exercises ?? []
  const lastWeight = data?.lastWeight ?? {}

  // Veride mevcut kanonik gruplar (MUSCLE_GROUPS sırasında) + 'Diğer' varsa sona; başta 'Tümü'.
  const groups = useMemo(() => {
    const present = new Set(exercises.map((e) => normalizeMuscle(e.muscle_group)))
    const ordered = MUSCLE_GROUPS.filter((g) => present.has(g))
    const tail = present.has(MUSCLE_OTHER) ? [MUSCLE_OTHER] : []
    return [ALL, ...ordered, ...tail]
  }, [exercises])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR')
    return exercises.filter((e) => {
      const matchSearch = !q || e.name.toLocaleLowerCase('tr-TR').includes(q)
      const matchMuscle = muscle === ALL || normalizeMuscle(e.muscle_group) === muscle
      return matchSearch && matchMuscle
    })
  }, [exercises, search, muscle])

  if (isLoading) {
    return (
      <Screen>
        <Text color={colors.textMuted}>Yükleniyor...</Text>
      </Screen>
    )
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text variant="title">Egzersizler</Text>
        <Button icon="add" title="Egzersiz" onPress={() => router.push('/(app)/new-exercise')} style={{ paddingVertical: 9, paddingHorizontal: spacing.md }} />
      </View>

      <Input placeholder="Egzersiz ara…" value={search} onChangeText={setSearch} autoCapitalize="none" />

      <View style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>
        <MuscleFilter groups={groups} selected={muscle} onSelect={setMuscle} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState icon="barbell-outline" label="Egzersiz bulunamadı" hint="Aramayı temizle ya da yeni egzersiz ekle." />
        }
        renderItem={({ item }) => {
          const eq = normalizeEquipment(item.equipment)
          const subtitle = eq === EQUIPMENT_NONE ? normalizeMuscle(item.muscle_group) : `${normalizeMuscle(item.muscle_group)} · ${eq}`
          return (
            <ExerciseRow
              name={item.name}
              subtitle={subtitle}
              lastWeight={item.id in lastWeight ? lastWeight[item.id] : null}
              isCustom={item.owner_id != null}
              onPress={() => router.push(`/(app)/exercise/${item.id}`)}
            />
          )
        }}
      />
    </Screen>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 5: `ExerciseHistoryList` bileşeni (Agent D)

**Files:**
- Create: `mobile/src/components/exercises/ExerciseHistoryList.tsx`

- [ ] **Step 1: Seans-gruplu geçmiş listesini yaz**

`Session` tipi (Task 1) kullanılır. Tarih `tr-TR` ile formatlanır.

```tsx
// mobile/src/components/exercises/ExerciseHistoryList.tsx
import { View } from 'react-native'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import type { Session } from '../../lib/exercises'

function fmtDate(day: string): string {
  const d = new Date(`${day}T00:00:00`)
  if (Number.isNaN(d.getTime())) return day
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

function fmtVolume(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${Math.round(v)}kg`
}

export function ExerciseHistoryList({ sessions }: { sessions: Session[] }) {
  return (
    <View>
      {sessions.map((s) => (
        <View key={s.date} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="body" color={colors.text}>{fmtDate(s.date)}</Text>
            <Text variant="label" color={colors.textFaint}>{s.sets.length} set · {fmtVolume(s.volume)}</Text>
          </View>
          <Text variant="label" color={colors.textMuted} style={{ marginTop: 3 }}>
            {s.sets.map((x) => `${x.weight_kg}×${x.reps}`).join(' · ')}
          </Text>
        </View>
      ))}
    </View>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 6: `exercise/[id].tsx` zengin detay (Agent D)

**Files:**
- Create: `mobile/src/app/(app)/exercise/[id].tsx`

- [ ] **Step 1: Detay ekranını yaz**

Egzersiz meta'sını `useExercises` (mevcut, cache'li) içinden id ile bulur. Geçmişi `useExerciseHistory` ile alır, saf helper'larla işler. Custom (`owner_id != null`) ise Düzenle/Sil. Geçmiş yoksa `EmptyState`.

```tsx
// mobile/src/app/(app)/exercise/[id].tsx
import { useMemo } from 'react'
import { Alert, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Screen, Text, Card, StatChip, Button, EmptyState, Hairline } from '../../../components/ui'
import { colors, spacing } from '../../../theme'
import { useExercises, useExerciseHistory, useDeleteExercise } from '../../../lib/queries'
import {
  normalizeMuscle,
  normalizeEquipment,
  groupBySession,
  personalRecord,
  estimate1RM,
  trendPoints,
  daysSince,
  EQUIPMENT_NONE,
} from '../../../lib/exercises'
import { WeightLineChart } from '../../../components/charts/WeightLineChart'
import { ExerciseHistoryList } from '../../../components/exercises/ExerciseHistoryList'

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: exercises } = useExercises()
  const { data: history, isLoading } = useExerciseHistory(id ?? '')
  const del = useDeleteExercise()

  const exercise = exercises?.find((e) => e.id === id)

  const sessions = useMemo(() => groupBySession(history ?? []), [history])
  const pr = useMemo(() => personalRecord(history ?? []), [history])
  const orm = useMemo(() => estimate1RM(history ?? []), [history])
  const points = useMemo(() => trendPoints(sessions), [sessions])
  const lastDays = sessions.length > 0 ? daysSince(`${sessions[0].date}T00:00:00`, Date.now()) : null

  function onDelete() {
    if (!exercise) return
    Alert.alert('Egzersizi sil', `"${exercise.name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () =>
          del.mutate(exercise.id, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('Hata', String(e)),
          }),
      },
    ])
  }

  if (!exercise) {
    return (
      <Screen>
        <Text color={colors.textMuted}>{isLoading ? 'Yükleniyor...' : 'Egzersiz bulunamadı.'}</Text>
      </Screen>
    )
  }

  const eq = normalizeEquipment(exercise.equipment)
  const subtitle = eq === EQUIPMENT_NONE ? normalizeMuscle(exercise.muscle_group) : `${normalizeMuscle(exercise.muscle_group)} · ${eq}`
  const isCustom = exercise.owner_id != null
  const hasHistory = sessions.length > 0

  return (
    <Screen scroll>
      <Text variant="eyebrow">EGZERSİZ</Text>
      <Text variant="title">{exercise.name}</Text>
      <Text variant="label" style={{ marginTop: 2, marginBottom: spacing.lg }}>{subtitle}</Text>

      {hasHistory ? (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatChip label="REKOR" value={`${pr} kg`} color={colors.accent} />
            <StatChip label="TAHMİNİ 1RM" value={`${orm} kg`} />
            <StatChip label="SON" value={lastDays === 0 ? 'bugün' : `${lastDays}g`} />
          </View>

          <Text variant="eyebrow" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>AĞIRLIK TRENDİ</Text>
          <Card>
            <WeightLineChart points={points} />
          </Card>

          <Text variant="eyebrow" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>GEÇMİŞ</Text>
          <ExerciseHistoryList sessions={sessions} />
        </>
      ) : (
        <EmptyState
          icon="barbell-outline"
          label="Henüz bu egzersizle antrenman yok"
          hint="Bir antrenmana ekleyip set kaydettiğinde geçmiş ve rekorların burada görünür."
        />
      )}

      {isCustom ? (
        <View style={{ marginTop: spacing.xl }}>
          <Hairline />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button icon="create-outline" title="Düzenle" variant="ghost" onPress={() => router.push(`/(app)/new-exercise?id=${exercise.id}`)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button icon="trash-outline" title="Sil" variant="ghost" onPress={onDelete} disabled={del.isPending} />
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 1, 2, 5 tamamlanmış olmalı).

---

### Task 7: `new-exercise.tsx` ekle/düzenle (Agent E)

**Files:**
- Create: `mobile/src/app/(app)/new-exercise.tsx`

- [ ] **Step 1: Ekle/düzenle ekranını yaz**

`?id=` yoksa ekle (`useAddExercise`), varsa düzenle (`useUpdateExercise`, değerleri `useExercises`'ten doldurur). Kas grubu/ekipman inline çip-seçici.

```tsx
// mobile/src/app/(app)/new-exercise.tsx
import { useState } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Screen, Text, Input, Button } from '../../components/ui'
import { colors, spacing, radius } from '../../theme'
import { useExercises, useAddExercise, useUpdateExercise } from '../../lib/queries'
import { MUSCLE_GROUPS, EQUIPMENT, normalizeMuscle, normalizeEquipment, EQUIPMENT_NONE } from '../../lib/exercises'

function ChipSelect({ options, selected, onSelect }: { options: readonly string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
      {options.map((o) => {
        const on = o === selected
        return (
          <Pressable
            key={o}
            onPress={() => onSelect(o)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.xl,
              backgroundColor: on ? colors.accent : colors.cardAlt,
              borderWidth: 1,
              borderColor: on ? colors.accent : 'transparent',
            }}
          >
            <Text variant="label" color={on ? colors.accentText : colors.textMuted} style={{ fontWeight: '700' }}>{o}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

export default function NewExercise() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const { data: exercises } = useExercises()
  const editing = exercises?.find((e) => e.id === id)

  const add = useAddExercise()
  const update = useUpdateExercise()

  const [name, setName] = useState(editing?.name ?? '')
  const [muscle, setMuscle] = useState(editing ? normalizeMuscle(editing.muscle_group) : MUSCLE_GROUPS[0])
  const [equip, setEquip] = useState(editing ? normalizeEquipment(editing.equipment) : EQUIPMENT_NONE)

  const saving = add.isPending || update.isPending
  const equipOptions = [EQUIPMENT_NONE, ...EQUIPMENT] as const

  function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      Alert.alert('Eksik', 'Egzersiz adı gerekli.')
      return
    }
    const equipment = equip === EQUIPMENT_NONE ? null : equip
    const onDone = {
      onSuccess: () => router.back(),
      onError: (e: unknown) => Alert.alert('Hata', String(e)),
    }
    if (editing) {
      update.mutate({ id: editing.id, name: trimmed, muscle_group: muscle, equipment }, onDone)
    } else {
      add.mutate({ name: trimmed, muscle_group: muscle, equipment }, onDone)
    }
  }

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: spacing.lg }}>{editing ? 'Egzersizi Düzenle' : 'Yeni Egzersiz'}</Text>

      <Text variant="eyebrow" style={{ marginBottom: spacing.sm }}>AD</Text>
      <Input placeholder="örn. Bench Press" value={name} onChangeText={setName} />

      <Text variant="eyebrow" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>KAS GRUBU</Text>
      <ChipSelect options={MUSCLE_GROUPS} selected={muscle} onSelect={setMuscle} />

      <Text variant="eyebrow" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>EKİPMAN</Text>
      <ChipSelect options={equipOptions} selected={equip} onSelect={setEquip} />

      <Button
        icon="checkmark"
        title={saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
        onPress={save}
        disabled={saving}
        style={{ marginTop: spacing.xl }}
      />
    </Screen>
  )
}
```

> Not: Düzenleme modunda kullanıcı global (owner_id null) bir egzersize bu ekrana ulaşamaz — detay ekranı "Düzenle"yi yalnız custom egzersizde gösterir. Yine de `useUpdateExercise` RLS ile korunur (owner değilse update 0 satır etkiler).

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 8: Route kaydı `_layout.tsx` (Agent E)

**Files:**
- Modify: `mobile/src/app/(app)/_layout.tsx`

- [ ] **Step 1: İki gizli route ekle**

Mevcut `scan-food` satırından sonra ekle:
```tsx
      <Tabs.Screen name="exercise/[id]" options={{ href: null, title: 'Egzersiz' }} />
      <Tabs.Screen name="new-exercise" options={{ href: null, title: 'Egzersiz Ekle' }} />
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 9: Entegrasyon + doğrulama (Orchestrator + KULLANICI)

- [ ] **Step 1: Tüm dosyalar yerinde — tek tsc**

Run: `cd mobile && npx tsc --noEmit`
Expected: EXIT 0, hata yok.

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/fatih/fitness-app"
git add mobile/src/lib/exercises.ts mobile/src/lib/queries.ts \
  mobile/src/components/exercises/ExerciseRow.tsx \
  mobile/src/components/exercises/MuscleFilter.tsx \
  mobile/src/components/exercises/ExerciseHistoryList.tsx \
  mobile/src/app/\(app\)/exercises.tsx \
  mobile/src/app/\(app\)/exercise/\[id\].tsx \
  mobile/src/app/\(app\)/new-exercise.tsx \
  mobile/src/app/\(app\)/_layout.tsx
git commit -m "feat(exercises): profesyonel redesign — ara/filtre liste + zengin detay (PR/1RM/trend/geçmiş) + preset ekle-düzenle-sil"
```

- [ ] **Step 3: OTA yayını (KULLANICI)**

Yeni native modül yok → OTA yeterli.
Run: `cd mobile && eas update --branch preview --platform android -m "egzersizler redesign"`
Expected: update grubu yayınlanır. (Env `mobile/.env`'den okunur — 3 anahtar mevcut olmalı.)

- [ ] **Step 4: Cihaz doğrulaması (KULLANICI)**

1. Egzersizler sekmesi: arama yaz → liste filtrelenir; kas-grubu çipi seç → filtrelenir.
2. Geçmişi olan bir egzersize dokun → PR/1RM/son + trend grafiği + seans-gruplu geçmiş görünür.
3. Geçmişi olmayan egzersize dokun → boş-durum, çökme yok.
4. "+ Egzersiz" → ad + kas grubu + ekipman seç → Ekle → listede görünür (⭐).
5. Custom egzersiz detayı → Düzenle → değiştir → Güncelle → yansır. Sil → onay → listeden kalkar.
6. Onaydan/geri'den çıkınca Egzersizler sekmesinde kal (önceki nav fix sayesinde).

---

## Self-Review notları

- **Spec coverage:** Liste A (Task 4: arama+MuscleFilter+ExerciseRow+son ağırlık) ✓; Zengin detay (Task 6: PR/1RM/son + WeightLineChart + ExerciseHistoryList + boş-durum) ✓; Ekle/düzenle preset (Task 7: ChipSelect kas+ekipman) ✓; Taksonomi normalize, migration'sız (Task 1) ✓; Hook'lar (Task 2: last-weight, history, update, delete) ✓; Route (Task 8) ✓; Sil onayı (Task 6 Alert) ✓; OTA (Task 9 Step 3) ✓. Favori = kapsam dışı (spec ile uyumlu) ✓.
- **Tip tutarlılığı:** `HistorySet` (exercises.ts) ↔ `useExerciseHistory` dönüşü ↔ `groupBySession` girdisi aynı `{reps, weight_kg, set_number, date}`. `Session` (exercises.ts) ↔ `ExerciseHistoryList` props ↔ `trendPoints` girdisi aynı. `Exercise` mevcut tip, değişmedi. `useUpdateExercise` input `{id,name,muscle_group,equipment}` ↔ new-exercise `update.mutate` çağrısı aynı.
- **Placeholder taraması:** Yok — her adımda tam kod ve gerçek doğrulama örnekleri var.
- **Risk:** `useExerciseHistory` join `workout:workouts(started_at)` — mevcut `exercise:exercises(*)` join pattern'iyle aynı yapı (queries.ts:102), Supabase FK ilişkisi `workout_sets.workout_id → workouts`. Tip için `as unknown as Row[]` kullanılır (mevcut kod stiliyle uyumlu).
