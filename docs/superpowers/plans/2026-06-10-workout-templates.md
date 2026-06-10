# Antrenman Şablonları (Routines) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sık yapılan antrenmanları şablon olarak kaydedip tek dokunuşla ön-dolu (son ağırlıklarla) yeniden başlatmak.

**Architecture:** İki yeni Supabase tablosu (`workout_templates`, `workout_template_sets`) + react-query hook'ları. Şablon, egzersiz iskeletini + yedek değerleri tutar; "Başla" deyince her egzersizin **son antrenmandaki kilosu** geçmişten çekilip `new-workout` draft'ı ön-doldurulur (B/akıllı model). Kayıt mantığı (`useCreateWorkout`) değişmez — şablon yalnız draft'ı besleyen yeni bir giriş noktası. Saf-View bileşenler, native bağımlılık yok → OTA-safe.

**Tech Stack:** Expo SDK 54, React 19, expo-router, @tanstack/react-query, Supabase JS, Postgres (RLS).

**Test note:** Projede jest/test runner YOK. Her kod görevinin doğrulama kapısı `npx tsc --noEmit` (yeşil) + `npx expo-doctor` (18/18). `stats.ts`'teki `templateDraftSets` saf fonksiyondur (prensipte birim-test edilebilir) ama runner olmadığından tsc + manuel ile doğrulanır. Davranış doğrulaması Task 7'de cihazda/manuel.

**Çalışma dizini:** Repo kökü `C:\Users\fatih\fitness-app`. Komutlar `mobile/` içinden; git repo kökünden.

---

## Görev Sırası & Bağımlılık

Kod görevleri (1-6) sıralı: 1 migration dosyası → 2 veri katmanı → 3 bileşenler → 4 ana ekran → 5 new-workout → 6 detay ekranı. Task 7 = migration'ı Supabase'e uygula + manuel doğrulama (kullanıcı katılımı). **Önemli:** Kod (2-6) migration uygulanmadan da tsc'den geçer (sadece tip/sorgu); gerçek çalışma Task 7'den sonra.

## Dosya Yapısı

| Dosya | Sorumluluk | İşlem |
|-------|-----------|-------|
| `supabase/migrations/20260610120000_create_workout_templates.sql` | 2 tablo + RLS + index | Create |
| `mobile/src/lib/stats.ts` | saf `templateDraftSets` helper + `DraftSet`/`TemplateSetRow` tipleri | Modify |
| `mobile/src/lib/queries.ts` | `useTemplates`, `useCreateTemplateFromWorkout`, `useDeleteTemplate`, `useTemplateDraft` | Modify |
| `mobile/src/components/workouts/TemplateCard.tsx` | tek şablon kartı (saf View, lime kenar, çipler, Başla, sil) | Create |
| `mobile/src/components/workouts/TemplatesSection.tsx` | yatay "Şablonlarım" şeridi | Create |
| `mobile/src/app/(app)/index.tsx` | `TemplatesSection` ekle | Modify |
| `mobile/src/app/(app)/new-workout.tsx` | `templateId` param → draft ön-doldur | Modify |
| `mobile/src/app/(app)/workout/[id].tsx` | "Şablon olarak kaydet" butonu + isim modalı | Modify |

---

### Task 1: DB migration dosyası

**Files:**
- Create: `supabase/migrations/20260610120000_create_workout_templates.sql`

- [ ] **Step 1: Migration dosyasını oluştur**

`workout_sets` RLS desenini birebir izler. Dosya içeriği:

```sql
-- ============ workout_templates ============
create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.workout_templates enable row level security;

create policy "templates_select_own" on public.workout_templates
  for select using (user_id = auth.uid());
create policy "templates_insert_own" on public.workout_templates
  for insert with check (user_id = auth.uid());
create policy "templates_update_own" on public.workout_templates
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "templates_delete_own" on public.workout_templates
  for delete using (user_id = auth.uid());

-- ============ workout_template_sets ============
create table public.workout_template_sets (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number int not null check (set_number > 0),
  target_reps int not null check (target_reps >= 0),
  target_weight_kg numeric not null default 0 check (target_weight_kg >= 0),
  created_at timestamptz not null default now()
);
alter table public.workout_template_sets enable row level security;

create policy "tpl_sets_select_via_template" on public.workout_template_sets
  for select using (exists (
    select 1 from public.workout_templates t
    where t.id = template_id and t.user_id = auth.uid()));
create policy "tpl_sets_insert_via_template" on public.workout_template_sets
  for insert with check (
    exists (select 1 from public.workout_templates t
            where t.id = template_id and t.user_id = auth.uid())
    and exists (select 1 from public.exercises e
            where e.id = exercise_id and (e.owner_id is null or e.owner_id = auth.uid())));
create policy "tpl_sets_update_via_template" on public.workout_template_sets
  for update
  using (exists (select 1 from public.workout_templates t
            where t.id = template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_templates t
            where t.id = template_id and t.user_id = auth.uid()));
create policy "tpl_sets_delete_via_template" on public.workout_template_sets
  for delete using (exists (
    select 1 from public.workout_templates t
    where t.id = template_id and t.user_id = auth.uid()));

create index workout_template_sets_template_id_idx on public.workout_template_sets(template_id);
create index workout_templates_user_id_idx on public.workout_templates(user_id);
```

- [ ] **Step 2: Commit** (migration henüz UYGULANMAYACAK — Task 7'de kullanıcı uygular)

```bash
git add supabase/migrations/20260610120000_create_workout_templates.sql
git commit -m "feat(db): workout_templates + workout_template_sets tables with RLS"
```

---

### Task 2: Veri katmanı — stats helper + queries hook'ları

**Files:**
- Modify: `mobile/src/lib/stats.ts` (dosya sonuna ekle)
- Modify: `mobile/src/lib/queries.ts` (dosya sonuna ekle)

- [ ] **Step 1: stats.ts'e saf helper + tipleri ekle**

`mobile/src/lib/stats.ts` dosyasının **sonuna** ekle:

```typescript
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
```

- [ ] **Step 2: queries.ts'e şablon hook'larını ekle**

`mobile/src/lib/queries.ts` dosyasının **sonuna** ekle. (Üstte zaten `useQuery, useMutation, useQueryClient`, `supabase` import'ları var. `templateDraftSets`/`TemplateSetRow`/`DraftSet` için stats import'u eklenecek.)

Önce dosyanın en üstündeki stats import satırını bul:
```typescript
import { weekStartISO, type WorkoutRow } from './stats'
```
ve şununla değiştir:
```typescript
import { weekStartISO, templateDraftSets, type WorkoutRow, type TemplateSetRow, type DraftSet } from './stats'
```

Sonra dosya sonuna ekle:
```typescript
// ============ Antrenman Şablonları ============
export type TemplateWithSets = {
  id: string
  name: string
  created_at: string
  workout_template_sets: { set_number: number; exercise: { name: string } | null }[]
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async (): Promise<TemplateWithSets[]> => {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('id, name, created_at, workout_template_sets(set_number, exercise:exercises(name))')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as TemplateWithSets[]
    },
  })
}

export function useCreateTemplateFromWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      sets: { exercise_id: string; set_number: number; target_reps: number; target_weight_kg: number }[]
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data: tpl, error: tErr } = await supabase
        .from('workout_templates')
        .insert({ user_id: userData.user!.id, name: input.name })
        .select()
        .single()
      if (tErr) throw tErr
      if (input.sets.length > 0) {
        const rows = input.sets.map((s) => ({ ...s, template_id: tpl.id }))
        const { error: sErr } = await supabase.from('workout_template_sets').insert(rows)
        if (sErr) throw sErr
      }
      return tpl
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

// Şablonu new-workout draft'ına çözer (B modeli: son kiloları geçmişten çeker).
export function useTemplateDraft(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template_draft', templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<{ name: string; draft: DraftSet[] }> => {
      const { data: tpl, error: tErr } = await supabase
        .from('workout_templates')
        .select('name, workout_template_sets(set_number, target_reps, target_weight_kg, exercise:exercises(id, name))')
        .eq('id', templateId!)
        .single()
      if (tErr) throw tErr

      const raw = (tpl as unknown as {
        name: string
        workout_template_sets: TemplateSetRow[]
      })
      const sorted = [...(raw.workout_template_sets ?? [])].sort((a, b) => a.set_number - b.set_number)

      // Son kilo: ilgili egzersizlerin set'leri created_at'e göre en yeniden eskiye;
      // RLS workout sahipliği üzerinden kullanıcının set'leriyle sınırlar.
      const exIds = [...new Set(sorted.map((s) => s.exercise?.id).filter(Boolean))] as string[]
      const lastWeight = new Map<string, number>()
      if (exIds.length > 0) {
        const { data: hist, error: hErr } = await supabase
          .from('workout_sets')
          .select('exercise_id, weight_kg, created_at')
          .in('exercise_id', exIds)
          .order('created_at', { ascending: false })
        if (hErr) throw hErr
        for (const row of (hist ?? []) as { exercise_id: string; weight_kg: number }[]) {
          if (!lastWeight.has(row.exercise_id)) lastWeight.set(row.exercise_id, row.weight_kg)
        }
      }

      return { name: raw.name, draft: templateDraftSets(sorted, lastWeight) }
    },
  })
}
```

- [ ] **Step 3: tsc doğrula**

Run (`mobile/`): `npx tsc --noEmit` → Expected: hata yok.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/lib/stats.ts mobile/src/lib/queries.ts
git commit -m "feat(mobile): template data layer (queries + pure draft resolver)"
```

---

### Task 3: TemplateCard + TemplatesSection bileşenleri

**Files:**
- Create: `mobile/src/components/workouts/TemplateCard.tsx`
- Create: `mobile/src/components/workouts/TemplatesSection.tsx`

- [ ] **Step 1: TemplateCard.tsx oluştur**

```tsx
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui'
import { colors, radius, spacing } from '../../theme'

export function TemplateCard({ name, exercises, setCount, onStart, onDelete }: {
  name: string
  exercises: string[]
  setCount: number
  onStart: () => void
  onDelete: () => void
}) {
  const shown = exercises.slice(0, 3)
  const extra = exercises.length - shown.length
  return (
    <View style={{ width: 200, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.accent, borderRadius: radius.lg, padding: spacing.md, marginRight: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="body" style={{ fontWeight: '700', flex: 1 }}>{name}</Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={15} color={colors.textFaint} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm }}>
        {shown.map((nm, i) => (
          <View key={i} style={{ backgroundColor: colors.cardAlt, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 }}>
            <Text variant="label" style={{ fontSize: 10 }}>{nm}</Text>
          </View>
        ))}
        {extra > 0 ? (
          <View style={{ backgroundColor: colors.cardAlt, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7 }}>
            <Text variant="label" style={{ fontSize: 10 }}>+{extra}</Text>
          </View>
        ) : null}
      </View>
      <Text variant="label" style={{ fontSize: 11, marginTop: spacing.sm }}>{exercises.length} egzersiz · {setCount} set</Text>
      <Pressable onPress={onStart} style={{ backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 8, alignItems: 'center', marginTop: spacing.sm }}>
        <Text variant="label" style={{ color: colors.accentText, fontWeight: '800' }}>▶ Başla</Text>
      </Pressable>
    </View>
  )
}
```

- [ ] **Step 2: TemplatesSection.tsx oluştur**

```tsx
import { View, FlatList, Alert } from 'react-native'
import { Text } from '../ui'
import { colors, spacing } from '../../theme'
import { useTemplates, useDeleteTemplate } from '../../lib/queries'
import { TemplateCard } from './TemplateCard'

export function TemplatesSection({ onStart }: { onStart: (templateId: string) => void }) {
  const { data: templates } = useTemplates()
  const deleteTemplate = useDeleteTemplate()

  if (!templates || templates.length === 0) return null

  function confirmDelete(id: string, name: string) {
    Alert.alert('Şablonu sil', `"${name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteTemplate.mutate(id) },
    ])
  }

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text variant="label" style={{ marginBottom: spacing.sm }}>⚡ Şablonlarım</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={templates}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const names: string[] = []
          for (const s of item.workout_template_sets ?? []) {
            const n = s.exercise?.name ?? 'Egzersiz'
            if (!names.includes(n)) names.push(n)
          }
          return (
            <TemplateCard
              name={item.name}
              exercises={names}
              setCount={(item.workout_template_sets ?? []).length}
              onStart={() => onStart(item.id)}
              onDelete={() => confirmDelete(item.id, item.name)}
            />
          )
        }}
      />
    </View>
  )
}
```

- [ ] **Step 3: tsc doğrula** — Run (`mobile/`): `npx tsc --noEmit` → Expected: hata yok.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/workouts/TemplateCard.tsx mobile/src/components/workouts/TemplatesSection.tsx
git commit -m "feat(mobile): TemplateCard + TemplatesSection components"
```

---

### Task 4: Ana ekrana "Şablonlarım" şeridini ekle

**Files:**
- Modify: `mobile/src/app/(app)/index.tsx`

- [ ] **Step 1: Import ekle**

`mobile/src/app/(app)/index.tsx` — `WorkoutCard` import satırının altına ekle:
```tsx
import { TemplatesSection } from '../../components/workouts/TemplatesSection'
```

- [ ] **Step 2: TemplatesSection'ı render et**

Mevcut "Yeni Antrenman" `<Button>` satırı ile `<FlatList>` arasına `<TemplatesSection>` ekle. Hedef bölge şu hale gelsin:

```tsx
      <Button icon="add" title="Yeni Antrenman" onPress={() => router.push('/(app)/new-workout')} />
      <TemplatesSection onStart={(id) => router.push(`/(app)/new-workout?templateId=${id}`)} />
      <FlatList
        style={{ marginTop: spacing.lg }}
        data={workouts}
```

- [ ] **Step 3: tsc doğrula** — Run (`mobile/`): `npx tsc --noEmit` → Expected: hata yok.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/(app)/index.tsx
git commit -m "feat(mobile): show Şablonlarım strip on workouts home"
```

---

### Task 5: new-workout — templateId ile ön-doldurma

**Files:**
- Modify: `mobile/src/app/(app)/new-workout.tsx`

- [ ] **Step 1: Import'ları güncelle**

Üstteki `import { useState } from 'react'` satırını şununla değiştir:
```tsx
import { useEffect, useRef, useState } from 'react'
```

`import { useRouter } from 'expo-router'` satırını şununla değiştir:
```tsx
import { useRouter, useLocalSearchParams } from 'expo-router'
```

`useExercises, useCreateWorkout, type Exercise` import satırını şununla değiştir (useTemplateDraft eklenir):
```tsx
import { useExercises, useCreateWorkout, useTemplateDraft, type Exercise } from '../../lib/queries'
```

- [ ] **Step 2: Yerel DraftSet tipini stats'tan import et**

Mevcut yerel satırı sil:
```tsx
type DraftSet = { exercise_id: string; exercise_name: string; reps: number; weight_kg: number }
```
ve `groupSetsByExercise` import'unu DraftSet tipini de alacak şekilde değiştir. Mevcut:
```tsx
import { groupSetsByExercise } from '../../lib/stats'
```
yerine:
```tsx
import { groupSetsByExercise, type DraftSet } from '../../lib/stats'
```

- [ ] **Step 3: templateId param + ön-doldurma mantığı ekle**

`NewWorkout` bileşeninin içinde, `const router = useRouter()` satırından sonra ekle:
```tsx
  const { templateId } = useLocalSearchParams<{ templateId?: string }>()
  const { data: tplData } = useTemplateDraft(templateId)
  const seeded = useRef(false)
  useEffect(() => {
    if (tplData && !seeded.current) {
      setSets(tplData.draft)
      seeded.current = true
    }
  }, [tplData])
```

- [ ] **Step 4: Şablon adını başlık olarak göster (opsiyonel başlık)**

Mevcut ilk satır:
```tsx
      <Text variant="subtitle" style={{ marginBottom: spacing.sm }}>Egzersiz seç</Text>
```
yerine:
```tsx
      {tplData?.name ? <Text variant="title" style={{ marginBottom: spacing.sm }}>{tplData.name}</Text> : null}
      <Text variant="subtitle" style={{ marginBottom: spacing.sm }}>Egzersiz seç</Text>
```

- [ ] **Step 5: tsc doğrula** — Run (`mobile/`): `npx tsc --noEmit` → Expected: hata yok.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/app/(app)/new-workout.tsx
git commit -m "feat(mobile): pre-fill new-workout from template (smart last-weight)"
```

---

### Task 6: Antrenman detayına "Şablon olarak kaydet"

**Files:**
- Modify: `mobile/src/app/(app)/workout/[id].tsx`

Mevcut dosya: `WorkoutDetail` `useWorkoutSets`'ten `sets` alır, `list = sets ?? []` ile çalışır. Buraya isim modalı + kaydet butonu ekleyeceğiz.

- [ ] **Step 1: Import'ları güncelle**

Mevcut:
```tsx
import { FlatList } from 'react-native'
```
yerine:
```tsx
import { FlatList, Modal, View, Alert } from 'react-native'
```

Mevcut:
```tsx
import { Screen, Text } from '../../../components/ui'
```
yerine:
```tsx
import { Screen, Text, Button, Input } from '../../../components/ui'
```

`react`'ten useState import et — dosyada yoksa en üste ekle:
```tsx
import { useState } from 'react'
```

`useWorkout, useWorkoutSets` import satırını şununla değiştir:
```tsx
import { useWorkout, useWorkoutSets, useCreateTemplateFromWorkout } from '../../../lib/queries'
```

- [ ] **Step 2: State + kaydetme mantığı ekle**

`WorkoutDetail` içinde, `const { data: sets, isLoading } = useWorkoutSets(id)` satırından sonra ekle:
```tsx
  const createTemplate = useCreateTemplateFromWorkout()
  const [modalOpen, setModalOpen] = useState(false)
  const [tplName, setTplName] = useState('')
```

`const groups = ...` satırından sonra (modal kaydetme list'e erişebilsin diye render'dan önce) ekle:
```tsx
  function saveTemplate() {
    const name = tplName.trim() || 'Antrenman'
    const tplSets = list.map((x) => ({
      exercise_id: x.exercise_id,
      set_number: x.set_number,
      target_reps: x.reps,
      target_weight_kg: x.weight_kg,
    }))
    createTemplate.mutate({ name, sets: tplSets }, {
      onSuccess: () => { setModalOpen(false); setTplName(''); Alert.alert('Kaydedildi', 'Şablon oluşturuldu.') },
      onError: (e) => Alert.alert('Hata', String(e)),
    })
  }
```

- [ ] **Step 3: Buton + Modal'ı render et**

`<WorkoutStatHeader ... />` kapanışından **hemen sonra**, `<FlatList ... />`'ten önce ekle:
```tsx
      <Button icon="bookmark" title="Şablon olarak kaydet" variant="ghost" onPress={() => setModalOpen(true)} style={{ marginBottom: spacing.md }} />
```
Bunun için `spacing` import lazım — mevcut `import { colors } from '../../../theme'` satırını şununla değiştir:
```tsx
import { colors, spacing } from '../../../theme'
```

Ve `</Screen>` kapanışından **hemen önce** Modal'ı ekle:
```tsx
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, gap: spacing.md }}>
            <Text variant="subtitle">Şablon adı</Text>
            <Input placeholder="örn. Push Day" value={tplName} onChangeText={setTplName} autoFocus />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Vazgeç" variant="ghost" onPress={() => setModalOpen(false)} style={{ flex: 1 }} />
              <Button title={createTemplate.isPending ? '...' : 'Kaydet'} onPress={saveTemplate} disabled={createTemplate.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
```

- [ ] **Step 4: tsc doğrula** — Run (`mobile/`): `npx tsc --noEmit` → Expected: hata yok.

- [ ] **Step 5: expo-doctor doğrula** — Run (`mobile/`): `npx expo-doctor` → Expected: 18/18 passed.

- [ ] **Step 6: Commit**

```bash
git add "mobile/src/app/(app)/workout/[id].tsx"
git commit -m "feat(mobile): save workout as template (name modal) on detail screen"
```

---

### Task 7: Migration'ı uygula + manuel doğrulama (KULLANICI)

Bu görev Supabase'e migration uygulamayı ve cihaz testini içerir. Kod tamamlandı; bu adımlar kullanıcı (Fatih) ile yapılır.

- [ ] **Step 1: Migration'ı Supabase'e uygula**

İki yoldan biri:
- **CLI (proje linkliyse):** `mobile/`'ın üstünde repo kökünde → `npx supabase db push` (Supabase erişimi/şifre ister, interaktif — kullanıcı çalıştırır).
- **Dashboard (garantili):** Supabase dashboard → proje `basgwbnidemhmxvwpqpb` → SQL Editor → Task 1'deki migration SQL'ini yapıştır → Run.

Doğrula: dashboard → Table Editor'da `workout_templates` ve `workout_template_sets` tabloları görünür, RLS açık.

- [ ] **Step 2: OTA yayınla (native değişiklik yok)**

`mobile/` içinden:
```bash
npx eas-cli update --branch preview --platform android --message "Antrenman şablonları"
```
(`--platform android` şart — web export'u kırık, hafıza notu.)

- [ ] **Step 3: Cihazda manuel doğrulama**

Uygulamayı kapat-aç (OTA iner), sonra:
1. Bir antrenman aç (detay) → "Şablon olarak kaydet" → isim ver ("Push Day") → "Kaydedildi" çıkar.
2. Ana ekran → "⚡ Şablonlarım"da kart görünür (isim, çipler, "N egzersiz · M set").
3. Karta "Başla" → new-workout ön-dolu açılır; ağırlıklar son antrenmandan gelir (B modeli).
4. Tekrar/kilo düzelt → "Antrenmanı Kaydet" → listede yeni antrenman.
5. Şablon kartında çöp ikonu → onayla → kart kaybolur.

- [ ] **Step 4: Doğrulama notu** — Çalışınca hafızaya "Şablonlar shipped (OTA), 2 yeni tablo" notu düş.

---

## Self-Review (plan yazarı kontrolü)

- **Spec coverage:** ✅ İçerik (Task 1 tablolar + Task 2 hook'lar), B modeli (`templateDraftSets` + `useTemplateDraft`), oluşturma (Task 6 detay butonu + `useCreateTemplateFromWorkout`), erişim/şerit (Task 3-4), başlatma/ön-dolu (Task 5), sil (Task 3 `confirmDelete` + `useDeleteTemplate`), edge case'ler (helper'da exercise-null atlama, geçmiş yok→yedek, boş isim→"Antrenman", şablon yok→şerit gizli), OTA (Task 7). Kapsam dışı maddeler (rename/editör/sıralama) planda yok ✅.
- **Placeholder scan:** Yer tutucu yok; tüm adımlarda tam kod. Migration timestamp dosya adı sabitlendi (`20260610120000`).
- **Type consistency:** `DraftSet` tek yerde (stats.ts) tanımlı, queries + new-workout oradan import eder. `TemplateSetRow` stats.ts'te; `useTemplateDraft` select alanları (`set_number, target_reps, target_weight_kg, exercise:exercises(id,name)`) `TemplateSetRow` şekliyle birebir. `useCreateTemplateFromWorkout` input `sets` alanları (`exercise_id, set_number, target_reps, target_weight_kg`) Task 6'daki `tplSets` map'iyle eşleşir. `templateDraftSets(sorted, lastWeight)` imzası tutarlı.
- **Test gerçeği:** jest yok; doğrulama tsc + expo-doctor + manuel — plan boyunca tutarlı.
