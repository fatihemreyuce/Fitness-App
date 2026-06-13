# Kilo Takibi (Body Weight Tracking) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (önerilen) veya superpowers:executing-plans ile bu planı görev-görev uygulayın. Adımlar checkbox (`- [ ]`) ile işaretlenir.

**Goal:** Kullanıcının vücut kilosunu günlük kaydedip (upsert), trendini saf-View çizgi grafiğinde görmesi ve hedef kiloya ilerlemesini takip etmesi — Profil ekranında izole bir "Kilo Takibi" kartı.

**Architecture:** Yeni `body_weights` tablosu (per-user RLS, `(user_id, entry_date)` benzersiz → upsert) + `profiles.target_weight_kg` kolonu. react-query hook'ları veri katmanını, saf `stats.ts` helper'ları özet/grafik serisini, `react-native-svg` kullanmayan saf-View `WeightLineChart` grafiği besler. Mevcut hiçbir şey (auth, `useCreateWorkout`, `useUpdateGoals`) değişmez — yeni, eklemeli bir bölüm. Native bağımlılık yok → OTA-safe.

**Tech Stack:** Expo SDK 54, React 19, expo-router, @tanstack/react-query 5, Supabase JS, Postgres (RLS).

**Test notu:** Projede test runner yok (jest/vitest kurulu değil, hiç `*.test.ts` yok). Önceki tüm fazlar gibi doğrulama kapısı `npx tsc --noEmit` (+ `npx expo-doctor`) ve spec'teki görsel kabuldür. Saf helper'lar (`weightSummary`, `weightChartPoints`) React/Supabase'siz, izole ve tip-kontrollü yazılır; her adımda manuel akıl-yürütme örnekleri verilir.

---

## Dosya Yapısı

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `supabase/migrations/20260611100000_create_body_weights.sql` | `body_weights` tablosu + RLS + index + `profiles.target_weight_kg` | Create |
| `mobile/src/lib/stats.ts` | saf `BodyWeightRow` tipi + `weightSummary` + `weightChartPoints` | Modify (sona ekle) |
| `mobile/src/lib/queries.ts` | `BodyWeight` tipi + `useBodyWeights`, `useUpsertBodyWeight`, `useDeleteBodyWeight`, `useTargetWeight`, `useUpdateTargetWeight` | Modify (sona ekle) |
| `mobile/src/components/charts/WeightLineChart.tsx` | saf-View çizgi grafiği (nokta + döndürülmüş segment + hedef çizgisi) | Create |
| `mobile/src/components/WeightSection.tsx` | "Kilo Takibi" kartı — tüm parçaları birleştirir | Create |
| `mobile/src/app/(app)/profile.tsx` | `WeightSection`'ı ekranda göster | Modify |

**Sıra:** 1 (migration) → 2 (saf helper) → 3 (hook) → 4 (grafik) → 5 (kart) → 6 (ekran) → 7 (migration uygula + cihaz doğrulama, KULLANICI). Kod (2–6) migration uygulanmadan da `tsc`'den geçer (yalnız tip/sorgu); gerçek veri akışı Task 7'den sonra.

---

### Task 1: DB migration dosyası

**Files:**
- Create: `supabase/migrations/20260611100000_create_body_weights.sql`

- [ ] **Step 1: Migration dosyasını oluştur**

`food_entries` desenini birebir izler (per-user, `entry_date date`, per-user RLS). `unique (user_id, entry_date)` upsert anahtarıdır. `profiles.target_weight_kg` nullable hedef kilodur.

```sql
-- ============ body_weights ============
-- Günde bir vücut kilosu kaydı. (user_id, entry_date) benzersiz → aynı güne
-- ikinci giriş upsert ile üstüne yazar (sabah-tartısı mantığı).
create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);
alter table public.body_weights enable row level security;

create policy "body_weights_select_own" on public.body_weights
  for select using (user_id = auth.uid());
create policy "body_weights_insert_own" on public.body_weights
  for insert with check (user_id = auth.uid());
create policy "body_weights_update_own" on public.body_weights
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "body_weights_delete_own" on public.body_weights
  for delete using (user_id = auth.uid());

create index body_weights_user_date_idx on public.body_weights(user_id, entry_date);

-- ============ profiles: hedef kilo ============
alter table public.profiles
  add column target_weight_kg numeric check (target_weight_kg is null or target_weight_kg > 0);
```

- [ ] **Step 2: Commit** (migration HENÜZ UYGULANMAYACAK — Task 7'de kullanıcı uygular)

```bash
git add supabase/migrations/20260611100000_create_body_weights.sql
git commit -m "feat(db): body_weights table + profiles.target_weight_kg"
```

---

### Task 2: Saf helper'lar — `weightSummary` + `weightChartPoints`

**Files:**
- Modify: `mobile/src/lib/stats.ts` (dosyanın **sonuna** ekle)

`stats.ts` içinde zaten `DAY_MS`, `parseISODate`, `todayISO` mevcut (yeniden tanımlama). `parseISODate` ve `DAY_MS` aynı modülde olduğu için doğrudan kullanılır. React/Supabase importu YOK — saf.

- [ ] **Step 1: Tip + iki helper'ı dosya sonuna ekle**

```ts
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
  return { current, change7d: Number((current - best.weight_kg).toFixed(1)) }
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
```

- [ ] **Step 2: Mantığı elle doğrula** (test runner yok — örnekle akıl yürüt)

`weightSummary`'yi şu girdilerle zihinde çalıştır:
- `[]` → `{ current: null, change7d: null }` ✓ (ilk guard).
- `[{2026-06-11, 80}]` → `{ current: 80, change7d: null }` ✓ (length < 2).
- `[{2026-06-04, 82}, {2026-06-11, 80}]` → current 80; target = 06-11 − 7g = 06-04; en yakın (tek aday) 06-04 = 82; change7d = 80 − 82 = **−2** ✓.
- `weightChartPoints([{06-01,83},{06-04,82},{06-11,80}], 30)` → pencere 06-11..(geriye 30g) hepsini kapsar → `[83, 82, 80]` kronolojik ✓.

- [ ] **Step 3: tsc kontrolü**

Run: `cd mobile; npx tsc --noEmit`
Expected: hata yok (PASS). Yeni export'lar tip uyumlu.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/lib/stats.ts
git commit -m "feat(stats): pure weightSummary + weightChartPoints helpers"
```

---

### Task 3: react-query hook'ları

**Files:**
- Modify: `mobile/src/lib/queries.ts` (dosyanın **sonuna** ekle)

Üstte zaten `useQuery, useMutation, useQueryClient` ve `supabase` import'ları var. Yeni import GEREKMEZ.

- [ ] **Step 1: `BodyWeight` tipi + 5 hook'u dosya sonuna ekle**

```ts
// ============ Kilo Takibi ============
export type BodyWeight = {
  id: string
  user_id: string
  entry_date: string
  weight_kg: number
  created_at: string
}

// Tüm kilo kayıtları, ARTAN entry_date (grafik kronolojik kullanır;
// liste için tüketici .reverse() alır).
export function useBodyWeights() {
  return useQuery({
    queryKey: ['body_weights'],
    queryFn: async (): Promise<BodyWeight[]> => {
      const { data, error } = await supabase
        .from('body_weights')
        .select('*')
        .order('entry_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as BodyWeight[]
    },
  })
}

// Aynı güne tekrar girişte üstüne yazar (onConflict: user_id,entry_date).
export function useUpsertBodyWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { entry_date: string; weight_kg: number }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('body_weights')
        .upsert({ ...input, user_id: userData.user!.id }, { onConflict: 'user_id,entry_date' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body_weights'] }),
  })
}

export function useDeleteBodyWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('body_weights').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body_weights'] }),
  })
}

// Hedef kilo — yalnız profiles.target_weight_kg okur (kalori/protein hedefleri ayrı).
export function useTargetWeight() {
  return useQuery({
    queryKey: ['target_weight'],
    queryFn: async (): Promise<number | null> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('profiles')
        .select('target_weight_kg')
        .eq('id', userData.user!.id)
        .single()
      if (error) throw error
      return (data as { target_weight_kg: number | null }).target_weight_kg
    },
  })
}

// Yalnız target_weight_kg günceller — useUpdateGoals'a DOKUNMAZ.
export function useUpdateTargetWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (target_weight_kg: number | null) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('profiles')
        .update({ target_weight_kg })
        .eq('id', userData.user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['target_weight'] }),
  })
}
```

- [ ] **Step 2: tsc kontrolü**

Run: `cd mobile; npx tsc --noEmit`
Expected: hata yok (PASS).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/queries.ts
git commit -m "feat(queries): body weight + target weight hooks"
```

---

### Task 4: `WeightLineChart` — saf-View çizgi grafiği

**Files:**
- Create: `mobile/src/components/charts/WeightLineChart.tsx`

`react-native-svg` KULLANILMAZ. Genişlik `onLayout` ile ölçülür; ölçek pencere min–max'ına yakınlaştırılır (sıfırdan değil — kilo az değişir). Her ardışık çift `atan2` ile döndürülmüş ince View segmenti. `BarChart.tsx`'teki kesik hedef-çizgisi deseni (borderTopWidth + dashed) yeniden kullanılır.

- [ ] **Step 1: Bileşeni oluştur**

```tsx
import { useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import { Text } from '../ui'
import { colors } from '../../theme'

// Saf-View çizgi grafiği (OTA-safe, native yok).
// points: kronolojik kilo dizisi. goal: opsiyonel hedef çizgisi.
export function WeightLineChart({
  points,
  goal,
  height = 96,
}: {
  points: number[]
  goal?: number
  height?: number
}) {
  const [width, setWidth] = useState(0)
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)

  if (points.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center' }}>
        <Text variant="label">Yeterli veri yok</Text>
      </View>
    )
  }

  // Ölçek: nokta(+hedef) min–max'ına tampon ekleyerek yakınlaştır.
  const values = goal != null ? [...points, goal] : points
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  } else {
    const pad = (max - min) * 0.15
    min -= pad
    max += pad
  }

  const n = points.length
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * width : width / 2)
  const y = (v: number) => height - ((v - min) / (max - min)) * height

  const segments: { left: number; top: number; width: number; angle: number }[] = []
  for (let i = 0; i < n - 1; i++) {
    const x1 = x(i)
    const y1 = y(points[i])
    const x2 = x(i + 1)
    const y2 = y(points[i + 1])
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    segments.push({ left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - 1, width: len, angle })
  }

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 ? (
        <>
          {goal != null ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: y(goal),
                borderTopWidth: 1.5,
                borderColor: colors.fat,
                borderStyle: 'dashed',
              }}
            />
          ) : null}
          {segments.map((s, i) => (
            <View
              key={`s${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: s.left,
                top: s.top,
                width: s.width,
                height: 2,
                borderRadius: 1,
                backgroundColor: colors.accent,
                transform: [{ rotate: `${s.angle}deg` }],
              }}
            />
          ))}
          {points.map((v, i) => (
            <View
              key={`p${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: x(i) - 3,
                top: y(v) - 3,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.accent,
              }}
            />
          ))}
        </>
      ) : null}
    </View>
  )
}
```

- [ ] **Step 2: tsc kontrolü**

Run: `cd mobile; npx tsc --noEmit`
Expected: hata yok (PASS).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/charts/WeightLineChart.tsx
git commit -m "feat(charts): pure-View WeightLineChart (no svg, OTA-safe)"
```

---

### Task 5: `WeightSection` — "Kilo Takibi" kartı

**Files:**
- Create: `mobile/src/components/WeightSection.tsx`

`StatsSection.tsx` + `profile.tsx` desenlerini izler. Ekleme/silme/hedef akışlarını ve grafiği birleştirir. `Number(...replace(',', '.'))` ile virgül-ondalık girişleri kabul eder. `weight_kg`/`target_weight_kg` Supabase'den number gelir (mevcut `workout_sets.weight_kg` gibi).

- [ ] **Step 1: Bileşeni oluştur**

```tsx
import { useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, Card, Input, Button } from './ui'
import { colors, spacing } from '../theme'
import { WeightLineChart } from './charts/WeightLineChart'
import {
  useBodyWeights,
  useUpsertBodyWeight,
  useDeleteBodyWeight,
  useTargetWeight,
  useUpdateTargetWeight,
} from '../lib/queries'
import { weightSummary, weightChartPoints, todayISO } from '../lib/stats'

export function WeightSection() {
  const { data: entries, isLoading } = useBodyWeights()
  const { data: target } = useTargetWeight()
  const upsert = useUpsertBodyWeight()
  const del = useDeleteBodyWeight()
  const updateTarget = useUpdateTargetWeight()
  const [weight, setWeight] = useState('')
  const [goalInput, setGoalInput] = useState('')

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
      <Ionicons name="scale-outline" size={20} color={colors.accent} />
      <Text variant="title">Kilo Takibi</Text>
    </View>
  )

  if (isLoading) {
    return (
      <View style={{ marginBottom: spacing.lg }}>
        {header}
        <Card><Text color={colors.textMuted}>Yükleniyor...</Text></Card>
      </View>
    )
  }

  const list = entries ?? []
  const { current, change7d } = weightSummary(list)
  const points = weightChartPoints(list, 30)
  const recent = [...list].reverse().slice(0, 10) // son → eski
  const remaining =
    current != null && target != null ? Number((current - target).toFixed(1)) : null

  function addWeight() {
    const kg = Number(weight.replace(',', '.'))
    if (!weight.trim() || !Number.isFinite(kg) || kg <= 0) {
      Alert.alert('Geçersiz', "Lütfen 0'dan büyük bir kilo gir")
      return
    }
    upsert.mutate(
      { entry_date: todayISO(), weight_kg: kg },
      { onSuccess: () => setWeight(''), onError: (e) => Alert.alert('Hata', String(e)) },
    )
  }

  function saveGoal() {
    const kg = goalInput.trim() ? Number(goalInput.replace(',', '.')) : null
    if (kg !== null && (!Number.isFinite(kg) || kg <= 0)) {
      Alert.alert('Geçersiz', "Hedef 0'dan büyük olmalı")
      return
    }
    updateTarget.mutate(kg, {
      onSuccess: () => {
        setGoalInput('')
        Alert.alert('Kaydedildi', kg ? `Hedef ${kg} kg` : 'Hedef kaldırıldı')
      },
      onError: (e) => Alert.alert('Hata', String(e)),
    })
  }

  function removeEntry(id: string, date: string) {
    Alert.alert('Sil', `${date} kaydını sil?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => del.mutate(id) },
    ])
  }

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {header}

      <Card style={{ marginBottom: spacing.md }}>
        {current != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginBottom: spacing.md }}>
            <Text variant="stat" color={colors.accent}>{current} kg</Text>
            {change7d != null ? (
              <Text variant="label" color={change7d <= 0 ? colors.accent : colors.fat} style={{ marginBottom: 6 }}>
                {change7d > 0 ? '+' : ''}{change7d} kg / 7g
              </Text>
            ) : null}
          </View>
        ) : (
          <Text color={colors.textMuted} style={{ marginBottom: spacing.md }}>
            Henüz kilo kaydı yok — bugünkü kilonu ekle.
          </Text>
        )}

        {target != null ? (
          <Text variant="label" style={{ marginBottom: spacing.md }}>
            🎯 Hedef {target} kg
            {remaining != null ? ` · ${Math.abs(remaining)} kg ${remaining > 0 ? 'kaldı' : 'aşıldı'}` : ''}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input placeholder="Bugünkü kilo (kg)" keyboardType="numeric" value={weight} onChangeText={setWeight} style={{ flex: 1 }} />
          <Button title="Ekle" onPress={addWeight} loading={upsert.isPending} />
        </View>
      </Card>

      {points.length >= 1 ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Text variant="label" style={{ marginBottom: spacing.md }}>Son 30 gün</Text>
          <WeightLineChart points={points} goal={target ?? undefined} />
        </Card>
      ) : null}

      <Card style={{ marginBottom: spacing.md }}>
        <Text variant="label" style={{ marginBottom: spacing.sm }}>Hedef kilo</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input
            placeholder={target != null ? String(target) : 'Hedef kilo (kg)'}
            keyboardType="numeric"
            value={goalInput}
            onChangeText={setGoalInput}
            style={{ flex: 1 }}
          />
          <Button title="Kaydet" variant="ghost" onPress={saveGoal} loading={updateTarget.isPending} />
        </View>
      </Card>

      {recent.length > 0 ? (
        <Card>
          <Text variant="label" style={{ marginBottom: spacing.sm }}>Son kayıtlar</Text>
          <View style={{ gap: spacing.xs }}>
            {recent.map((e) => (
              <View
                key={e.id}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
              >
                <Text>{e.entry_date}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Text variant="subtitle">{e.weight_kg} kg</Text>
                  <Pressable onPress={() => removeEntry(e.id, e.entry_date)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </View>
  )
}
```

- [ ] **Step 2: tsc kontrolü**

Run: `cd mobile; npx tsc --noEmit`
Expected: hata yok (PASS).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/WeightSection.tsx
git commit -m "feat(mobile): WeightSection — kilo takibi kartı"
```

---

### Task 6: Profil ekranına ekle

**Files:**
- Modify: `mobile/src/app/(app)/profile.tsx`

`WeightSection`'ı "Günlük Hedefler" kartından **sonra**, `<StatsSection />`'dan **önce** ekle (spec yerleşimi: tek `<Screen scroll>` içinde).

- [ ] **Step 1: Import ekle**

`profile.tsx` üst importlarına (mevcut `StatsSection` importunun yanına) ekle:

```tsx
import { WeightSection } from '../../components/WeightSection'
```

Sonuç (mevcut satır 8 civarı):

```tsx
import { StatsSection } from '../../components/StatsSection'
import { WeightSection } from '../../components/WeightSection'
```

- [ ] **Step 2: JSX'e yerleştir**

Mevcut JSX'te "Günlük Hedefler" `</Card>`'ı ile `<StatsSection />` arasına `<WeightSection />` ekle. Hedef kesit (mevcut satır 53–55):

```tsx
      </Card>

      <WeightSection />

      <StatsSection />
```

- [ ] **Step 3: tsc kontrolü**

Run: `cd mobile; npx tsc --noEmit`
Expected: hata yok (PASS).

- [ ] **Step 4: Commit**

```bash
git add "mobile/src/app/(app)/profile.tsx"
git commit -m "feat(mobile): show WeightSection on profile screen"
```

---

### Task 7: Migration'ı uygula + cihaz doğrulama (KULLANICI — Fatih)

Kod tamam; bu görev Supabase'e migration uygulamayı, doğrulamayı ve OTA yayınını içerir. Kullanıcı ile yapılır.

- [ ] **Step 1: Migration'ı Supabase'e uygula**

İki yoldan biri:
- **CLI (proje linkli):** repo kökünde → `npx supabase db push` (Supabase erişim/şifre ister, interaktif — kullanıcı çalıştırır).
- **Dashboard (garantili):** Supabase dashboard → proje **`basgwbnidemhmxvwpqpb`** → SQL Editor → Task 1'deki migration SQL'ini yapıştır → Run.

- [ ] **Step 2: Tip + doctor kapısı**

Run: `cd mobile; npx tsc --noEmit`
Expected: PASS.
Run: `cd mobile; npx expo-doctor`
Expected: **18/18** geçer (native bağımlılık eklenmedi).

- [ ] **Step 3: Görsel kabul (cihazda / Expo Go)**

1. Profil → **Kilo Takibi** kartı görünür; kayıt yokken "Henüz kilo kaydı yok" + grafikte "Yeterli veri yok".
2. "Bugünkü kilo" gir → **Ekle** → güncel kilo (`X kg`) görünür; aynı gün tekrar farklı değer ekle → **üstüne yazar** (Son kayıtlarda tek satır kalır, yeni satır yok).
3. Birkaç farklı güne kayıt ekle (gerekirse geçmişi DB'den ekleyerek test et) → çizgi grafik trendi gösterir.
4. **Hedef kilo** gir → **Kaydet** → "🎯 Hedef X kg · Y kg kaldı/aşıldı" + grafikte kesik yatay hedef çizgisi.
5. **Son kayıtlar**'da 🗑 → onay → silinir, kart + grafik güncellenir.
6. Geçersiz giriş (boş/0/negatif) → uyarı, kayıt oluşmaz.

- [ ] **Step 4: OTA yayını**

**Migration önce uygulanmış olmalı (Step 1).** OTA-safe (yalnız JS).

```bash
cd mobile
eas update --branch preview --platform android --message "feat: kilo takibi"
```

> **DİKKAT:** `eas update` env'i `mobile/.env`'den okur (eas.json'dan değil). O dosyada `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` dahil 3 anahtarın bulunduğunu doğrula, yoksa OTA Google login'i bozar.

- [ ] **Step 5: Memory güncelle**

`MEMORY.md` / `ui-polish-in-progress.md`: "Kilo takibi: DONE & SHIPPED (OTA)" olarak işaretle.

---

## Self-Review

**1. Spec coverage:**
- Granülerlik/upsert → Task 1 (`unique`), Task 3 (`useUpsertBodyWeight onConflict`) ✓
- Saf-View grafik, svg yok, min–max yakınlaştırma → Task 4 ✓
- Hedef kilo (`profiles.target_weight_kg`, kart içi ayar, "X kg kaldı", hedef çizgisi) → Task 1, Task 3 (`useTargetWeight`/`useUpdateTargetWeight`), Task 5, Task 4 ✓
- Düzenlenebilir geçmiş + silme → Task 5 (`recent` + Pressable trash + onaylı `useDeleteBodyWeight`) ✓
- Yerleşim (profile.tsx, tek Screen scroll) → Task 6 ✓
- `weightSummary`/`weightChartPoints` saf helper → Task 2 ✓
- Edge case'ler (kayıt yok / tek kayıt / hedef yok / geçersiz giriş / aynı gün / geçmiş silme) → Task 5 + Task 4 boş/tek-nokta davranışı ✓
- `useUpdateGoals`'a dokunulmadı (ayrı `useUpdateTargetWeight`) ✓
- Doğrulama (tsc, expo-doctor 18/18, migration, görsel) → Task 7 ✓
- OTA notu (`mobile/.env`, `--platform android`, migration önce) → Task 7 ✓

**2. Placeholder scan:** Yer tutucu yok; tüm kod adımları tam. Migration timestamp sabit (`20260611100000`). Proje ref sabit (`basgwbnidemhmxvwpqpb`).

**3. Type consistency:** `BodyWeight` (queries) ⊃ `BodyWeightRow` (stats) — `weightSummary`/`weightChartPoints` yalnız `entry_date`+`weight_kg` okur, `BodyWeight` yapısal olarak uyumlu; doğrudan geçirilir. Hook adları kart kullanımıyla birebir: `useBodyWeights`, `useUpsertBodyWeight`, `useDeleteBodyWeight`, `useTargetWeight`, `useUpdateTargetWeight`. `WeightLineChart` props (`points`, `goal?`, `height?`) Task 5 çağrısıyla eşleşiyor. `todayISO`/`weightSummary`/`weightChartPoints` `stats.ts`'ten export'lu.
