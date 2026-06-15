# Antrenmanlar — Momentum Hero + Timeline Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Antrenmanlar ekranını "Momentum Hero + Timeline" diline taşı — üstte "bu hafta" özeti (gün noktaları + antrenman/hacim + haftalık seri), sade başlat butonu, şablon şeridi ve geçmiş bir zaman çizelgesi.

**Architecture:** Saf `weekMomentum` helper (haftalık özet + seri) + 2 yeni bileşen (`WeekMomentumHero`, `WorkoutTimelineRow`) üstüne `index.tsx` yeniden kompoze edilir. Geçmiş kart yığını → timeline satırları. Eski `WorkoutCard` silinir. Yeni native modül/DB yok → OTA-safe (runtime 1.0.1).

**Tech Stack:** Expo SDK 54, React 19, expo-router 6, @tanstack/react-query 5. Mevcut: `useWorkouts` (set'ler gömülü), `workoutSummary`/`workoutVolume`/`weekStartISO` (`stats.ts`), `Screen/Text/Button/EmptyState` (ui), `TemplatesSection`. `expo-linear-gradient` 1.0.1 APK'da mevcut → hero'da kullanılabilir.

**Design ref:** `docs/superpowers/specs/2026-06-15-workouts-momentum-redesign-design.md`

**Test notu:** Test runner YOK. Doğrulama: `cd mobile && npx tsc --noEmit` + cihaz. Saf `weekMomentum` manuel akıl-yürütme örnekleriyle doğrulanır.

---

## Agent Split (paralel execution)

Dosyalar çakışmıyor → 4 iş kolu. Agent'lar **commit ETMEZ**; orchestrator tek `tsc` + commit yapar.

- **Agent A — Saf helper:** Task 1. (`lib/stats.ts` — sona helper ekle)
- **Agent B — Hero:** Task 2. (`components/workouts/WeekMomentumHero.tsx`)
- **Agent C — Timeline:** Task 3. (`components/workouts/WorkoutTimelineRow.tsx`)
- **Agent D — Ekran + temizlik:** Task 4, 5. (`app/(app)/index.tsx` rewrite, `WorkoutCard.tsx` sil)

D, A/B/C imzalarına göre kodlar (bu planda kilitli).

## Dosya Yapısı

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `mobile/src/lib/stats.ts` | saf `weekMomentum` + `WeekMomentum` tipi | Modify (sona ekle) |
| `mobile/src/components/workouts/WeekMomentumHero.tsx` | BU HAFTA hero kartı | Create |
| `mobile/src/components/workouts/WorkoutTimelineRow.tsx` | tek timeline satırı | Create |
| `mobile/src/app/(app)/index.tsx` | ekranı yeniden kompoze et | Rewrite |
| `mobile/src/components/workouts/WorkoutCard.tsx` | artık kullanılmıyor | Delete |

---

### Task 1: `weekMomentum` saf helper (Agent A)

**Files:**
- Modify: `mobile/src/lib/stats.ts` (dosyanın sonuna ekle)

`DAY_MS` ve `workoutVolume` bu dosyada zaten tanımlı/mevcut.

- [ ] **Step 1: Tipi + helper'ı yaz**

```ts
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
```

**Manuel akıl-yürütme (doğrulama):**
- Bu hafta Salı + Perşembe antrenman → `dayDots[1]=dayDots[3]=true`, `count=2`, `volumeKg`=iki antrenmanın `workoutVolume` toplamı ✓.
- Seri: bu hafta + geçen hafta aktif, 2 hafta önce yok → en son aktif = bu hafta; cur=thisMon(var)→1, prevMon(var)→2, 2hafta önce(yok)→dur. `streakWeeks=2` ✓.
- Hiç antrenman yok → `count=0`, `volumeKg=0`, tüm noktalar `false`, `streakWeeks=0` ✓.
- Bozuk `started_at` (`Date.parse`=NaN) → atlanır ✓.

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 2: `WeekMomentumHero.tsx` (Agent B)

**Files:**
- Create: `mobile/src/components/workouts/WeekMomentumHero.tsx`

- [ ] **Step 1: Hero kartını yaz**

`expo-linear-gradient` (1.0.1 APK'da mevcut) ile hafif degrade. Gün etiketleri Pzt..Paz baş harfleri.

```tsx
// mobile/src/components/workouts/WeekMomentumHero.tsx
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'

const DAY_LABELS = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'] // Pzt Sal Çar Per Cum Cmt Paz

export function WeekMomentumHero({
  dayDots,
  todayIndex,
  count,
  volumeKg,
  streakWeeks,
}: {
  dayDots: boolean[]
  todayIndex: number
  count: number
  volumeKg: number
  streakWeeks: number
}) {
  return (
    <LinearGradient
      colors={['#1a2410', colors.card]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md }}
    >
      <Text variant="eyebrow" style={{ marginBottom: spacing.md }}>BU HAFTA</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
        {dayDots.map((on, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 5 }}>
            <Text variant="label" color={i === todayIndex ? colors.text : colors.textFaint} style={{ fontSize: 10 }}>
              {DAY_LABELS[i]}
            </Text>
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                backgroundColor: on ? colors.accent : i === todayIndex ? 'transparent' : colors.cardAlt,
                borderWidth: i === todayIndex && !on ? 1 : 0,
                borderColor: colors.accent,
              }}
            />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.lg }}>
        <Text variant="body" color={colors.text} style={{ fontWeight: '800', fontSize: 22 }}>
          {count}
          <Text variant="label"> antrenman</Text>
        </Text>
        <Text variant="body" color={colors.text} style={{ fontWeight: '800', fontSize: 22 }}>
          {(volumeKg / 1000).toFixed(1)}
          <Text variant="label">t hacim</Text>
        </Text>
        {streakWeeks > 0 ? (
          <Text variant="label" color={colors.accent} style={{ marginLeft: 'auto', fontWeight: '700' }}>
            🔥 {streakWeeks} hafta
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 3: `WorkoutTimelineRow.tsx` (Agent C)

**Files:**
- Create: `mobile/src/components/workouts/WorkoutTimelineRow.tsx`

- [ ] **Step 1: Tek timeline satırını yaz**

Satır kendi düğüm noktasını + (son değilse) aşağı inen bağlantı çizgisini çizer → FlatList'te alt alta dizilince sürekli timeline oluşur.

```tsx
// mobile/src/components/workouts/WorkoutTimelineRow.tsx
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'

export type TimelineItem = { id: string; date: Date; setCount: number; volumeKg: number }

export function WorkoutTimelineRow({
  item,
  isFirst,
  isLast,
  onPress,
}: {
  item: TimelineItem
  isFirst: boolean
  isLast: boolean
  onPress: (id: string) => void
}) {
  const dateStr = item.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [{ flexDirection: 'row' }, pressed && { opacity: 0.6 }]}
    >
      <View style={{ width: 22, alignItems: 'center' }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            marginTop: 4,
            backgroundColor: isFirst ? colors.accent : colors.cardAlt,
            borderWidth: isFirst ? 0 : 1,
            borderColor: colors.border,
          }}
        />
        {!isLast ? <View style={{ flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 }} /> : null}
      </View>

      <View style={{ flex: 1, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="body" color={colors.text} style={{ fontWeight: '600' }}>{dateStr}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="label" color={colors.accent} style={{ fontWeight: '700' }}>
              {item.setCount} set · {(item.volumeKg / 1000).toFixed(1)}t
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
          </View>
        </View>
      </View>
    </Pressable>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok.

---

### Task 4: `index.tsx` yeniden kompoze (Agent D)

**Files:**
- Rewrite: `mobile/src/app/(app)/index.tsx`

- [ ] **Step 1: Ekranı yeniden yaz**

`useWorkouts` + `weekMomentum` (Task 1) + `WeekMomentumHero` (Task 2) + `WorkoutTimelineRow` (Task 3) + mevcut `TemplatesSection`. Hero/başlat/şablon `ListHeaderComponent`'te; timeline FlatList satırları.

```tsx
// mobile/src/app/(app)/index.tsx
import { FlatList, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Button, EmptyState } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useWorkouts } from '../../lib/queries'
import { workoutSummary, weekMomentum } from '../../lib/stats'
import { WeekMomentumHero } from '../../components/workouts/WeekMomentumHero'
import { WorkoutTimelineRow, type TimelineItem } from '../../components/workouts/WorkoutTimelineRow'
import { TemplatesSection } from '../../components/workouts/TemplatesSection'

export default function Workouts() {
  const { data: workouts, isLoading, refetch } = useWorkouts()
  const router = useRouter()

  if (isLoading) {
    return (
      <Screen>
        <Text color={colors.textMuted}>Yükleniyor...</Text>
      </Screen>
    )
  }

  const list = workouts ?? []
  const m = weekMomentum(list, Date.now())
  const items: TimelineItem[] = list.map((w) => {
    const s = workoutSummary(w.workout_sets ?? [])
    return { id: w.id, date: new Date(w.started_at), setCount: s.setCount, volumeKg: s.volumeKg }
  })

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        onRefresh={refetch}
        refreshing={isLoading}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text variant="title" style={{ marginBottom: spacing.md }}>Antrenmanlar</Text>
            <WeekMomentumHero
              dayDots={m.dayDots}
              todayIndex={m.todayIndex}
              count={m.count}
              volumeKg={m.volumeKg}
              streakWeeks={m.streakWeeks}
            />
            <Button icon="add" title="Antrenmana Başla" onPress={() => router.push('/(app)/new-workout')} style={{ marginBottom: spacing.md }} />
            <TemplatesSection onStart={(id) => router.push(`/(app)/new-workout?templateId=${id}`)} />
            <Text variant="eyebrow" style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>GEÇMİŞ</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="barbell-outline" label="Henüz antrenman yok" hint="İlk antrenmanını başlat, geçmişin burada görünsün." />
        }
        renderItem={({ item, index }) => (
          <WorkoutTimelineRow
            item={item}
            isFirst={index === 0}
            isLast={index === items.length - 1}
            onPress={(id) => router.push(`/(app)/workout/${id}`)}
          />
        )}
      />
    </Screen>
  )
}
```

- [ ] **Step 2: tsc kapısı**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (Task 1, 2, 3 tamamlanmış olmalı).

---

### Task 5: Eski `WorkoutCard.tsx`'i sil (Agent D)

**Files:**
- Delete: `mobile/src/components/workouts/WorkoutCard.tsx`

- [ ] **Step 1: Dosyayı sil**

`WorkoutCard` artık hiçbir yerde import edilmiyor (eski `index.tsx` tek kullanıcıydı, rewrite'ta kaldırıldı).

Run:
```bash
cd "C:/Users/fatih/fitness-app/mobile"
rm src/components/workouts/WorkoutCard.tsx
```

- [ ] **Step 2: tsc kapısı (kalan import yok)**

Run: `cd mobile && npx tsc --noEmit`
Expected: hata yok (silinmiş bileşene referans kalmadı).

---

### Task 6: Entegrasyon + doğrulama (Orchestrator + KULLANICI)

- [ ] **Step 1: Tek tsc**

Run: `cd mobile && npx tsc --noEmit`
Expected: EXIT 0.

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/fatih/fitness-app"
git add mobile/src/lib/stats.ts mobile/src/components/workouts/WeekMomentumHero.tsx \
  mobile/src/components/workouts/WorkoutTimelineRow.tsx mobile/src/app/\(app\)/index.tsx
git rm mobile/src/components/workouts/WorkoutCard.tsx
git commit -m "feat(workouts): Momentum Hero + Timeline redesign — bu hafta ozeti + zaman cizelgesi gecmis"
```

- [ ] **Step 3: OTA yayını (KULLANICI veya orchestrator)**

Run: `cd mobile && eas update --branch preview --platform android -m "antrenmanlar momentum redesign"`
Expected: update grubu **runtime 1.0.1**'e yayınlanır. (Env `mobile/.env`'den; 3 anahtar mevcut.)

- [ ] **Step 4: Cihaz doğrulaması (KULLANICI)**

1. Antrenmanlar sekmesi → hero "BU HAFTA": gün noktaları (bugün çerçeveli), antrenman sayısı, hacim, 🔥 hafta serisi doğru.
2. "Antrenmana Başla" → yeni antrenman ekranı açılır.
3. Şablon "Başla"/sil eskisi gibi çalışır.
4. Geçmiş timeline: düğümler + tarih + `set · hacim`; bir satıra dokun → antrenman detayı açılır.
5. Hiç antrenman yoksa boş-durum çökmeden görünür.

---

## Self-Review notları

- **Spec coverage:** Hero gün noktaları+özet+seri (Task 1 `weekMomentum` + Task 2) ✓; haftalık seri tanımı (Task 1) ✓; "Antrenmana Başla" tek CTA (Task 4) ✓; TemplatesSection korunur (Task 4) ✓; timeline geçmiş + detay nav (Task 3 + Task 4 renderItem) ✓; WorkoutCard silinir (Task 5) ✓; boş-durum (Task 4 ListEmptyComponent) ✓; OTA (Task 6 Step 3) ✓.
- **Tip tutarlılığı:** `weekMomentum` dönüşü `{count, volumeKg, dayDots, todayIndex, streakWeeks}` ↔ `WeekMomentumHero` props birebir. `TimelineItem {id,date,setCount,volumeKg}` (WorkoutTimelineRow'da tanımlı) ↔ index.tsx `items` map + renderItem aynı. `useWorkouts` `workout_sets` ↔ `weekMomentum` girdisi (`{reps,weight_kg}`) ve `workoutSummary` uyumlu.
- **Placeholder taraması:** Yok — her adımda tam kod + manuel doğrulama.
- **Risk:** (1) `LinearGradient colors` tuple — JSX bağlamında 2-elemanlı literal tuple'a atanır (AuthBackground'da doğrulandı). (2) Hero gradient native modül ama 1.0.1 APK'da gömülü → OTA güvenli (eski 1.0.0 zaten ayrı runtime). (3) Yeni route yok → typedRoutes regen GEREKMEZ.
