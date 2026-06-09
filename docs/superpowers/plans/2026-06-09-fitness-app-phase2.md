# Fitness Uygulaması — Aşama 2 Uygulama Planı (Beslenme + Tasarım Sistemi)

> **Agentic worker'lar için:** GEREKLİ ALT-SKILL: Bu planı görev görev uygulamak için
> `superpowers:subagent-driven-development` (önerilen) veya `superpowers:executing-plans`
> kullanın. Adımlar checkbox (`- [ ]`) sözdizimi kullanır.

**Goal:** Hazır besin veritabanı + öğün bazlı kalori/makro takibi eklemek ve tüm uygulamayı tutarlı bir koyu temalı tasarım sistemine ("B stili": koyu zemin + neon lime) taşımak.

**Architecture:** Backend hem yerel Supabase (Docker, migration) hem **bulut** Supabase projesinde (`basgwbnidemhmxvwpqpb`) güncellenir; `foods` ve `food_entries` tabloları Aşama 1'in `exercises`/`workout_sets` RLS desenini birebir izler. Mobil tarafta `src/theme` (tasarım token'ları) + `src/components/ui` (yeniden kullanılabilir bileşenler) kurulur; tüm ekranlar (mevcut + yeni) bu sisteme taşınır. Günlük toplamlar istemcide hesaplanır.

**Tech Stack:** Supabase (Postgres, RLS), Expo SDK 54 (expo-router, src/), TanStack Query, TypeScript, EAS Build (APK).

> **Platform notu:** Windows 11 + PowerShell. Backend `C:\Users\fatih\fitness-app`, mobil `C:\Users\fatih\fitness-app\mobile`. Uygulama bulut Supabase'e bağlı; yerel Docker test/şema geliştirme için kullanılır. Cihaz testi EAS APK ile yapılır.

> **Renk paleti (B stili):** bg `#0d0f12`, kart `#16191f`, kartAlt/çizgi `#23272f`, vurgu(lime) `#c8ff00`, metin `#ffffff`, soluk metin `#9aa0ab`/`#6b7280`, protein `#c8ff00`, karb `#5b86d6`, yağ `#e0a05d`, tehlike `#ff6b6b`.

---

## Dosya Yapısı

```
supabase/
  migrations/<ts>_create_nutrition.sql      # foods, food_entries, RLS, profile goal kolonları
  seed.sql                                   # mevcut egzersizler + YENİ besinler eklenir
cloud-setup-phase2.sql                       # bulut SQL Editöründe çalıştırılacak (şema+seed)
mobile/src/
  theme/index.ts                             # colors, spacing, radius, typography
  components/ui/
    Screen.tsx  Text.tsx  Card.tsx  Button.tsx  Input.tsx  ProgressBar.tsx  StatChip.tsx
    index.ts                                 # barrel export
  lib/queries.ts                             # + besin/öğün/hedef hook'ları (mevcut dosyaya eklenir)
  app/(app)/
    _layout.tsx                              # + Beslenme sekmesi (yeniden stillendirilir)
    nutrition.tsx                            # YENİ: Beslenme/Bugün günlüğü
    add-food.tsx                             # YENİ: besin ara + miktar + öğüne ekle
    new-food.tsx                             # YENİ: özel besin oluştur
    index.tsx new-workout.tsx workout/[id].tsx exercises.tsx profile.tsx  # tasarım sistemine refactor
  app/(auth)/login.tsx signup.tsx            # tasarım sistemine refactor
```

---

# BÖLÜM 1 — Backend (Beslenme şeması)

### Task 1: Beslenme tabloları + RLS + profil hedef kolonları (yerel migration)

**Files:**
- Create: `supabase/migrations/<timestamp>_create_nutrition.sql`

- [ ] **Step 1: Migration dosyası oluştur**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app
supabase migration new create_nutrition
```
Expected: `supabase/migrations/<timestamp>_create_nutrition.sql` oluşur.

- [ ] **Step 2: Migration'ı şu SQL ile doldur**

```sql
-- ============ foods ============
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  calories_per_100g numeric not null check (calories_per_100g >= 0),
  protein_g numeric not null default 0 check (protein_g >= 0),
  carb_g numeric not null default 0 check (carb_g >= 0),
  fat_g numeric not null default 0 check (fat_g >= 0),
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.foods enable row level security;

create policy "foods_select_public_or_own" on public.foods
  for select using (owner_id is null or owner_id = auth.uid());
create policy "foods_insert_own" on public.foods
  for insert with check (owner_id = auth.uid());
create policy "foods_update_own" on public.foods
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "foods_delete_own" on public.foods
  for delete using (owner_id = auth.uid());

-- ============ food_entries ============
create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_id uuid not null references public.foods(id),
  quantity_g numeric not null check (quantity_g > 0),
  created_at timestamptz not null default now()
);
alter table public.food_entries enable row level security;

create policy "entries_select_own" on public.food_entries
  for select using (user_id = auth.uid());
create policy "entries_insert_own" on public.food_entries
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.foods f
                where f.id = food_id and (f.owner_id is null or f.owner_id = auth.uid())));
create policy "entries_update_own" on public.food_entries
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.foods f
                where f.id = food_id and (f.owner_id is null or f.owner_id = auth.uid())));
create policy "entries_delete_own" on public.food_entries
  for delete using (user_id = auth.uid());

-- İndeksler
create index food_entries_user_date_idx on public.food_entries(user_id, entry_date);
create index foods_owner_id_idx on public.foods(owner_id);

-- ============ profiles hedef kolonları ============
alter table public.profiles add column daily_calorie_goal int;
alter table public.profiles add column daily_protein_goal int;
```

- [ ] **Step 3: Yerelde uygula**

Run:
```powershell
supabase db reset
```
Expected: Tüm migration'lar sırayla uygulanır, `Finished supabase db reset`. (Henüz besin seed'i yok; o Task 2'de.)

- [ ] **Step 4: Tabloları doğrula**

Run:
```powershell
docker exec supabase_db_fitness-app psql -U postgres -d postgres -c "\dt public.*"
```
Expected: listede `foods` ve `food_entries` görünür. Kolon kontrolü:
```powershell
docker exec supabase_db_fitness-app psql -U postgres -d postgres -c "select column_name from information_schema.columns where table_name='profiles' and column_name like 'daily_%';"
```
Expected: `daily_calorie_goal`, `daily_protein_goal`.

- [ ] **Step 5: Commit**

```powershell
git add supabase/migrations
git commit -m "feat(db): nutrition schema (foods, food_entries) with RLS + profile goals"
```

---

### Task 2: Besin seed verisi

**Files:**
- Modify: `supabase/seed.sql` (mevcut egzersiz seed'inin SONUNA eklenir)

- [ ] **Step 1: seed.sql sonuna besinleri ekle**

`supabase/seed.sql` dosyasının mevcut içeriğini KORU, en sonuna şunu ekle:
```sql

-- ============ Hazır besin kütüphanesi (100g başına) ============
insert into public.foods (name, calories_per_100g, protein_g, carb_g, fat_g) values
  ('Yulaf', 389, 16.9, 66.3, 6.9),
  ('Yumurta (tam)', 155, 13.0, 1.1, 11.0),
  ('Yumurta Beyazı', 52, 11.0, 0.7, 0.2),
  ('Tavuk Göğsü (ızgara)', 165, 31.0, 0.0, 3.6),
  ('Tavuk But', 209, 26.0, 0.0, 11.0),
  ('Hindi Göğsü', 135, 30.0, 0.0, 1.0),
  ('Dana Kıyma (%15 yağ)', 254, 17.0, 0.0, 20.0),
  ('Dana Biftek', 271, 25.0, 0.0, 19.0),
  ('Somon', 208, 20.0, 0.0, 13.0),
  ('Ton Balığı (suda)', 116, 26.0, 0.0, 1.0),
  ('Pirinç (pişmiş)', 130, 2.7, 28.0, 0.3),
  ('Bulgur (pişmiş)', 83, 3.1, 18.6, 0.2),
  ('Makarna (pişmiş)', 158, 5.8, 31.0, 0.9),
  ('Tam Buğday Ekmeği', 247, 13.0, 41.0, 3.4),
  ('Beyaz Ekmek', 265, 9.0, 49.0, 3.2),
  ('Patates (haşlanmış)', 87, 1.9, 20.0, 0.1),
  ('Tatlı Patates', 86, 1.6, 20.0, 0.1),
  ('Mercimek (pişmiş)', 116, 9.0, 20.0, 0.4),
  ('Nohut (pişmiş)', 164, 8.9, 27.0, 2.6),
  ('Kuru Fasulye (pişmiş)', 127, 8.7, 22.8, 0.5),
  ('Yoğurt (tam yağlı)', 61, 3.5, 4.7, 3.3),
  ('Yoğurt (light)', 56, 5.7, 7.7, 0.2),
  ('Süzme Yoğurt', 96, 10.0, 4.0, 5.0),
  ('Süt (tam yağlı)', 61, 3.2, 4.8, 3.3),
  ('Süt (yağsız)', 34, 3.4, 5.0, 0.1),
  ('Beyaz Peynir', 264, 18.0, 1.5, 21.0),
  ('Kaşar Peyniri', 330, 25.0, 2.0, 26.0),
  ('Lor Peyniri', 98, 11.0, 3.4, 4.3),
  ('Muz', 89, 1.1, 23.0, 0.3),
  ('Elma', 52, 0.3, 14.0, 0.2),
  ('Portakal', 47, 0.9, 12.0, 0.1),
  ('Çilek', 32, 0.7, 7.7, 0.3),
  ('Üzüm', 69, 0.7, 18.0, 0.2),
  ('Avokado', 160, 2.0, 9.0, 15.0),
  ('Domates', 18, 0.9, 3.9, 0.2),
  ('Salatalık', 15, 0.7, 3.6, 0.1),
  ('Brokoli', 34, 2.8, 7.0, 0.4),
  ('Ispanak', 23, 2.9, 3.6, 0.4),
  ('Havuç', 41, 0.9, 10.0, 0.2),
  ('Badem', 579, 21.0, 22.0, 50.0),
  ('Ceviz', 654, 15.0, 14.0, 65.0),
  ('Fıstık Ezmesi', 588, 25.0, 20.0, 50.0),
  ('Zeytinyağı', 884, 0.0, 0.0, 100.0),
  ('Tereyağı', 717, 0.9, 0.1, 81.0),
  ('Bal', 304, 0.3, 82.0, 0.0),
  ('Çikolata (sütlü)', 535, 7.6, 59.0, 30.0),
  ('Protein Tozu (whey)', 400, 80.0, 8.0, 6.0),
  ('Whey Protein (1 ölçek 30g)', 400, 80.0, 8.0, 6.0),
  ('Pirinç Patlağı', 387, 7.0, 87.0, 1.0),
  ('Köfte (ızgara)', 235, 18.0, 5.0, 16.0);
```

- [ ] **Step 2: Uygula ve doğrula**

Run:
```powershell
supabase db reset
docker exec supabase_db_fitness-app psql -U postgres -d postgres -c "select count(*) from public.foods;"
```
Expected: `50` (eklenen besin sayısı). Egzersizler de hâlâ 32 olmalı.

- [ ] **Step 3: Commit**

```powershell
git add supabase/seed.sql
git commit -m "feat(db): seed predefined food library (50 foods)"
```

---

### Task 3: Bulut için SQL kurulum dosyası

**Files:**
- Create: `cloud-setup-phase2.sql`

> Bu dosya bulut Supabase SQL Editöründe çalıştırılacak (Task 18). İçeriği Task 1 + Task 2'deki SQL'in birleşimidir — bulutta `supabase db reset` çalışmadığı için ayrı tutulur.

- [ ] **Step 1: cloud-setup-phase2.sql oluştur**

Task 1 Step 2'deki tüm SQL (foods + food_entries + RLS + profil kolonları) ardından Task 2 Step 1'deki besin `insert`'ünün TAMAMINI tek dosyaya yaz. Başına şu yorumu ekle:
```sql
-- Aşama 2 — Bulut kurulum: SQL Editor → New query → yapıştır → Run.
-- (Aşama 1'deki tablolar zaten kurulu; bu yalnızca beslenme tablolarını + profil hedef kolonlarını ekler.)
```
Geri kalanı Task 1 Step 2 + Task 2 Step 1 SQL'inin birebir kopyası.

- [ ] **Step 2: Commit**

```powershell
git add cloud-setup-phase2.sql
git commit -m "chore(cloud): phase 2 SQL setup script for cloud Supabase"
```

---

# BÖLÜM 2 — Tasarım Sistemi

### Task 4: Tema token'ları

**Files:**
- Create: `mobile/src/theme/index.ts`

- [ ] **Step 1: Tema dosyasını yaz**

```ts
export const colors = {
  bg: '#0d0f12',
  card: '#16191f',
  cardAlt: '#23272f',
  border: '#23272f',
  accent: '#c8ff00',
  accentText: '#0d0f12',
  text: '#ffffff',
  textMuted: '#9aa0ab',
  textFaint: '#6b7280',
  protein: '#c8ff00',
  carb: '#5b86d6',
  fat: '#e0a05d',
  danger: '#ff6b6b',
} as const

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const
export const radius = { sm: 8, md: 12, lg: 16, xl: 20 } as const
```

- [ ] **Step 2: Tip kontrolü + commit**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add mobile/src/theme
git commit -m "feat(ui): add design system theme tokens"
```

---

### Task 5: UI bileşenleri

**Files:**
- Create: `mobile/src/components/ui/Text.tsx`, `Screen.tsx`, `Card.tsx`, `Button.tsx`, `Input.tsx`, `ProgressBar.tsx`, `StatChip.tsx`, `index.ts`

- [ ] **Step 1: Text.tsx**

```tsx
import { Text as RNText, type TextProps } from 'react-native'
import { colors } from '../../theme'

type Variant = 'title' | 'subtitle' | 'body' | 'label' | 'stat'
const styles: Record<Variant, { fontSize: number; fontWeight: '400' | '600' | '700' | '800'; color: string }> = {
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, fontWeight: '400', color: colors.text },
  label: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  stat: { fontSize: 28, fontWeight: '800', color: colors.text },
}

export function Text({ variant = 'body', color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  const base = styles[variant]
  return <RNText {...rest} style={[base, color ? { color } : null, style]} />
}
```

- [ ] **Step 2: Screen.tsx**

```tsx
import { type ReactNode } from 'react'
import { ScrollView, View, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '../../theme'

export function Screen({ children, scroll = false, style }: { children: ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const inner = { flex: 1, backgroundColor: colors.bg, padding: spacing.lg } as ViewStyle
  if (scroll) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[{ padding: spacing.lg }, style]}>
          {children}
        </ScrollView>
      </SafeAreaView>
    )
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={[inner, style]}>{children}</View>
    </SafeAreaView>
  )
}
```

- [ ] **Step 3: Card.tsx**

```tsx
import { type ReactNode } from 'react'
import { View, type ViewStyle } from 'react-native'
import { colors, radius, spacing } from '../../theme'

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg }, style]}>
      {children}
    </View>
  )
}
```

- [ ] **Step 4: Button.tsx**

```tsx
import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native'
import { colors, radius, spacing } from '../../theme'

export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false, style }:
  { title: string; onPress: () => void; variant?: 'primary' | 'ghost'; disabled?: boolean; loading?: boolean; style?: ViewStyle }) {
  const isPrimary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
        isPrimary ? { backgroundColor: colors.accent } : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
        (disabled || loading) ? { opacity: 0.5 } : null,
        pressed ? { opacity: 0.8 } : null,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={isPrimary ? colors.accentText : colors.text} />
        : <Text style={{ fontWeight: '700', fontSize: 15, color: isPrimary ? colors.accentText : colors.text }}>{title}</Text>}
    </Pressable>
  )
}
```

- [ ] **Step 5: Input.tsx**

```tsx
import { TextInput, type TextInputProps } from 'react-native'
import { colors, radius, spacing } from '../../theme'

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      {...props}
      style={[
        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 15 },
        props.style,
      ]}
    />
  )
}
```

- [ ] **Step 6: ProgressBar.tsx**

```tsx
import { View } from 'react-native'
import { colors, radius } from '../../theme'

export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, isFinite(value) ? value : 0))
  return (
    <View style={{ height: 8, backgroundColor: colors.cardAlt, borderRadius: radius.sm, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: radius.sm }} />
    </View>
  )
}
```

- [ ] **Step 7: StatChip.tsx**

```tsx
import { View } from 'react-native'
import { colors, radius, spacing } from '../../theme'
import { Text } from './Text'

export function StatChip({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }}>
      <Text variant="subtitle" color={color}>{value}</Text>
      <Text variant="label">{label}</Text>
    </View>
  )
}
```

- [ ] **Step 8: index.ts (barrel)**

```ts
export { Text } from './Text'
export { Screen } from './Screen'
export { Card } from './Card'
export { Button } from './Button'
export { Input } from './Input'
export { ProgressBar } from './ProgressBar'
export { StatChip } from './StatChip'
```

- [ ] **Step 9: Tip kontrolü + commit**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add mobile/src/components/ui
git commit -m "feat(ui): reusable design-system components (Screen, Text, Card, Button, Input, ProgressBar, StatChip)"
```

---

# BÖLÜM 3 — Veri katmanı (beslenme hook'ları)

### Task 6: queries.ts'e besin/öğün/hedef hook'ları

**Files:**
- Modify: `mobile/src/lib/queries.ts` (mevcut içeriğin SONUNA eklenir)

- [ ] **Step 1: queries.ts sonuna ekle**

```ts
// ============ Beslenme ============
export type Food = {
  id: string
  name: string
  brand: string | null
  calories_per_100g: number
  protein_g: number
  carb_g: number
  fat_g: number
  owner_id: string | null
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type FoodEntry = {
  id: string
  user_id: string
  entry_date: string
  meal_type: MealType
  food_id: string
  quantity_g: number
}

export function useFoods(search: string) {
  return useQuery({
    queryKey: ['foods', search],
    queryFn: async (): Promise<Food[]> => {
      let q = supabase.from('foods').select('*').order('name').limit(50)
      if (search.trim()) q = q.ilike('name', `%${search.trim()}%`)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useAddCustomFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; calories_per_100g: number; protein_g: number; carb_g: number; fat_g: number }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('foods')
        .insert({ ...input, owner_id: userData.user!.id }).select().single()
      if (error) throw error
      return data as Food
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['foods'] }),
  })
}

export function useDayEntries(date: string) {
  return useQuery({
    queryKey: ['food_entries', date],
    queryFn: async (): Promise<(FoodEntry & { food: Food })[]> => {
      const { data, error } = await supabase
        .from('food_entries')
        .select('*, food:foods(*)')
        .eq('entry_date', date)
        .order('created_at')
      if (error) throw error
      return data as unknown as (FoodEntry & { food: Food })[]
    },
  })
}

export function useAddFoodEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { entry_date: string; meal_type: MealType; food_id: string; quantity_g: number }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('food_entries').insert({ ...input, user_id: userData.user!.id })
      if (error) throw error
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['food_entries', vars.entry_date] }),
  })
}

export function useDeleteFoodEntry(date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('food_entries').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food_entries', date] }),
  })
}

export type Goals = { daily_calorie_goal: number | null; daily_protein_goal: number | null }

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async (): Promise<Goals> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('profiles')
        .select('daily_calorie_goal, daily_protein_goal').eq('id', userData.user!.id).single()
      if (error) throw error
      return data as Goals
    },
  })
}

export function useUpdateGoals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Goals) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('profiles').update(input).eq('id', userData.user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

// Bir entry'nin makro/kalori katkısını hesaplar (miktar * 100g değeri / 100)
export function entryMacros(e: FoodEntry & { food: Food }) {
  const r = e.quantity_g / 100
  return {
    calories: e.food.calories_per_100g * r,
    protein: e.food.protein_g * r,
    carb: e.food.carb_g * r,
    fat: e.food.fat_g * r,
  }
}
```

- [ ] **Step 2: Tip kontrolü + commit**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add mobile/src/lib/queries.ts
git commit -m "feat(mobile): nutrition data hooks (foods, entries, goals)"
```

---

# BÖLÜM 4 — Beslenme ekranları

### Task 7: Sekme düzenine Beslenme ekle (+ tema)

**Files:**
- Modify: `mobile/src/app/(app)/_layout.tsx`

- [ ] **Step 1: _layout.tsx içeriğini değiştir**

```tsx
import { Tabs } from 'expo-router'
import { colors } from '../../theme'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Antrenmanlar' }} />
      <Tabs.Screen name="exercises" options={{ title: 'Egzersizler' }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Beslenme' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
      <Tabs.Screen name="new-workout" options={{ href: null, title: 'Yeni Antrenman' }} />
      <Tabs.Screen name="workout/[id]" options={{ href: null, title: 'Detay' }} />
      <Tabs.Screen name="add-food" options={{ href: null, title: 'Besin Ekle' }} />
      <Tabs.Screen name="new-food" options={{ href: null, title: 'Özel Besin' }} />
    </Tabs>
  )
}
```

- [ ] **Step 2: Commit** (ekranlar sonraki task'larda; tsc bu aşamada eksik ekran nedeniyle hata vermez çünkü dosya bazlı router runtime'dır, ama yine de kontrol et)

```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(app)/_layout.tsx"
git commit -m "feat(mobile): add Beslenme tab and themed tab bar"
```

---

### Task 8: Beslenme / Bugün ekranı

**Files:**
- Create: `mobile/src/app/(app)/nutrition.tsx`

- [ ] **Step 1: nutrition.tsx yaz**

```tsx
import { useMemo, useState } from 'react'
import { FlatList, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Card, ProgressBar, StatChip } from '../../components/ui'
import { colors, spacing, radius } from '../../theme'
import { useDayEntries, useGoals, entryMacros, type MealType } from '../../lib/queries'

const MEALS: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: '🍳 Kahvaltı' },
  { type: 'lunch', label: '☀️ Öğle' },
  { type: 'dinner', label: '🌙 Akşam' },
  { type: 'snack', label: '🍎 Ara' },
]

function todayISO() {
  // Yerel tarihi YYYY-MM-DD olarak verir
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export default function Nutrition() {
  const [date] = useState(todayISO())
  const { data: entries, isLoading, refetch } = useDayEntries(date)
  const { data: goals } = useGoals()
  const router = useRouter()

  const totals = useMemo(() => {
    const t = { calories: 0, protein: 0, carb: 0, fat: 0 }
    for (const e of entries ?? []) {
      const m = entryMacros(e)
      t.calories += m.calories; t.protein += m.protein; t.carb += m.carb; t.fat += m.fat
    }
    return t
  }, [entries])

  const calGoal = goals?.daily_calorie_goal ?? 2400
  const remaining = Math.round(calGoal - totals.calories)

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  return (
    <Screen scroll>
      <Text variant="label">{new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      <Text variant="title" style={{ marginBottom: spacing.lg }}>Bugün</Text>

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text variant="stat">{Math.round(totals.calories).toLocaleString('tr-TR')}</Text>
            <Text variant="label">/ {calGoal.toLocaleString('tr-TR')} kcal · kalan {remaining}</Text>
          </View>
        </View>
        <View style={{ marginVertical: spacing.md }}>
          <ProgressBar value={totals.calories / calGoal} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatChip label="PROTEİN" value={`${Math.round(totals.protein)}g`} color={colors.protein} />
          <StatChip label="KARB" value={`${Math.round(totals.carb)}g`} color={colors.carb} />
          <StatChip label="YAĞ" value={`${Math.round(totals.fat)}g`} color={colors.fat} />
        </View>
      </Card>

      {MEALS.map((meal) => {
        const items = (entries ?? []).filter((e) => e.meal_type === meal.type)
        const cal = items.reduce((s, e) => s + entryMacros(e).calories, 0)
        return (
          <View key={meal.type} style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text variant="subtitle">{meal.label}</Text>
              <Pressable onPress={() => router.push(`/(app)/add-food?meal=${meal.type}&date=${date}`)}>
                <Text variant="label" color={colors.accent}>+ Ekle  ({Math.round(cal)} kcal)</Text>
              </Pressable>
            </View>
            {items.length === 0 ? (
              <Card style={{ borderStyle: 'dashed' }}>
                <Text variant="label">Henüz besin eklenmedi</Text>
              </Card>
            ) : (
              <Card style={{ padding: spacing.md }}>
                {items.map((e) => (
                  <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                    <Text variant="body">{e.food.name} · {e.quantity_g}g</Text>
                    <Text variant="body" color={colors.textMuted}>{Math.round(entryMacros(e).calories)} kcal</Text>
                  </View>
                ))}
              </Card>
            )}
          </View>
        )
      })}
    </Screen>
  )
}
```

- [ ] **Step 2: Tip kontrolü**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0. (`add-food` henüz yok ama `router.push` string'i typedRoutes'ta sorun çıkarırsa Task 9'dan sonra tekrar kontrol edilir; çıkarsa geçici olarak `as any` eklenmez — Task 9 dosyayı oluşturunca düzelir.)

- [ ] **Step 3: Commit**

```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(app)/nutrition.tsx"
git commit -m "feat(mobile): nutrition daily diary screen"
```

---

### Task 9: Besin Ekle ekranı (ara + miktar + öğüne ekle)

**Files:**
- Create: `mobile/src/app/(app)/add-food.tsx`

- [ ] **Step 1: add-food.tsx yaz**

```tsx
import { useState } from 'react'
import { Alert, FlatList, Pressable, View } from 'react-native'
import { useLocalSearchParams, useRouter, Link } from 'expo-router'
import { Screen, Text, Card, Input, Button } from '../../components/ui'
import { colors, spacing, radius } from '../../theme'
import { useFoods, useAddFoodEntry, type Food, type MealType } from '../../lib/queries'

export default function AddFood() {
  const { meal, date } = useLocalSearchParams<{ meal: MealType; date: string }>()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { data: foods, isLoading } = useFoods(search)
  const [selected, setSelected] = useState<Food | null>(null)
  const [qty, setQty] = useState('100')
  const addEntry = useAddFoodEntry()

  const ratio = (Number(qty) || 0) / 100
  function save() {
    if (!selected) return
    const q = Number(qty)
    if (!q || q <= 0) { Alert.alert('Geçersiz', 'Miktar 0’dan büyük olmalı'); return }
    addEntry.mutate(
      { entry_date: date, meal_type: meal, food_id: selected.id, quantity_g: q },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('Hata', String(e)) }
    )
  }

  return (
    <Screen>
      <Input placeholder="Besin ara (örn. tavuk)" value={search} onChangeText={setSearch} autoCapitalize="none" />
      <Link href="/(app)/new-food" style={{ marginTop: spacing.sm }}>
        <Text variant="label" color={colors.accent}>+ Listede yok mu? Özel besin oluştur</Text>
      </Link>

      <FlatList
        style={{ marginTop: spacing.md, flexGrow: 0, maxHeight: 320 }}
        data={foods}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text variant="label">{isLoading ? 'Aranıyor...' : 'Sonuç yok'}</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item)}>
            <Card style={{ padding: spacing.md, marginBottom: spacing.sm, borderColor: selected?.id === item.id ? colors.accent : colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="body">{item.name} {item.owner_id ? '⭐' : ''}</Text>
                <Text variant="body" color={colors.accent}>{Math.round(item.calories_per_100g)}</Text>
              </View>
              <Text variant="label">100g · P {item.protein_g} · K {item.carb_g} · Y {item.fat_g}</Text>
            </Card>
          </Pressable>
        )}
      />

      {selected && (
        <Card style={{ marginTop: spacing.md }}>
          <Text variant="subtitle" style={{ marginBottom: spacing.sm }}>{selected.name} · miktar (g)</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Input keyboardType="numeric" value={qty} onChangeText={setQty} style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' }} />
            <Text variant="label">
              = {Math.round(selected.calories_per_100g * ratio)} kcal{'\n'}P {Math.round(selected.protein_g * ratio)}g
            </Text>
          </View>
          <Button title={addEntry.isPending ? 'Ekleniyor...' : 'Öğüne Ekle'} onPress={save} disabled={addEntry.isPending} style={{ marginTop: spacing.md }} />
        </Card>
      )}
    </Screen>
  )
}
```

- [ ] **Step 2: Tip kontrolü + commit**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(app)/add-food.tsx"
git commit -m "feat(mobile): add-food screen (search, quantity, add to meal)"
```

---

### Task 10: Özel Besin Oluştur ekranı

**Files:**
- Create: `mobile/src/app/(app)/new-food.tsx`

- [ ] **Step 1: new-food.tsx yaz**

```tsx
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Input, Button } from '../../components/ui'
import { spacing } from '../../theme'
import { useAddCustomFood } from '../../lib/queries'

export default function NewFood() {
  const router = useRouter()
  const add = useAddCustomFood()
  const [name, setName] = useState('')
  const [cal, setCal] = useState('')
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [f, setF] = useState('')

  function save() {
    if (!name || !cal) { Alert.alert('Eksik', 'En az isim ve kalori gerekli'); return }
    add.mutate(
      { name, calories_per_100g: Number(cal) || 0, protein_g: Number(p) || 0, carb_g: Number(c) || 0, fat_g: Number(f) || 0 },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('Hata', String(e)) }
    )
  }

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Özel Besin</Text>
      <Text variant="label" style={{ marginBottom: spacing.lg }}>Değerler 100 gram başına girilir.</Text>
      <View style={{ gap: spacing.md }}>
        <Input placeholder="Besin adı" value={name} onChangeText={setName} />
        <Input placeholder="Kalori (kcal / 100g)" keyboardType="numeric" value={cal} onChangeText={setCal} />
        <Input placeholder="Protein (g / 100g)" keyboardType="numeric" value={p} onChangeText={setP} />
        <Input placeholder="Karbonhidrat (g / 100g)" keyboardType="numeric" value={c} onChangeText={setC} />
        <Input placeholder="Yağ (g / 100g)" keyboardType="numeric" value={f} onChangeText={setF} />
        <Button title={add.isPending ? 'Kaydediliyor...' : 'Kaydet'} onPress={save} disabled={add.isPending} />
      </View>
    </Screen>
  )
}
```

- [ ] **Step 2: Tip kontrolü + commit**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(app)/new-food.tsx"
git commit -m "feat(mobile): create custom food screen"
```

---

# BÖLÜM 5 — Mevcut ekranların tasarım sistemine refactor'ü

> Her task bir ekranı yeni bileşenlerle yeniden stillendirir. **Mantık aynı kalır.** Her task sonunda `npx tsc --noEmit` EXIT 0 olmalı.

### Task 11: Profil ekranı + kalori/protein hedefi

**Files:**
- Modify: `mobile/src/app/(app)/profile.tsx`

- [ ] **Step 1: profile.tsx içeriğini değiştir**

```tsx
import { useEffect, useState } from 'react'
import { Alert, View } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Screen, Text, Card, Input, Button } from '../../components/ui'
import { spacing, colors } from '../../theme'
import { useGoals, useUpdateGoals } from '../../lib/queries'

export default function Profile() {
  const { session } = useAuth()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const { data: goals } = useGoals()
  const updateGoals = useUpdateGoals()
  const [cal, setCal] = useState('')
  const [prot, setProt] = useState('')

  useEffect(() => {
    if (!session) return
    supabase.from('profiles').select('display_name').eq('id', session.user.id).single()
      .then(({ data }) => setDisplayName(data?.display_name ?? null))
  }, [session])

  useEffect(() => {
    if (goals) { setCal(goals.daily_calorie_goal?.toString() ?? ''); setProt(goals.daily_protein_goal?.toString() ?? '') }
  }, [goals])

  function saveGoals() {
    updateGoals.mutate(
      { daily_calorie_goal: cal ? Number(cal) : null, daily_protein_goal: prot ? Number(prot) : null },
      { onSuccess: () => Alert.alert('Kaydedildi', 'Hedeflerin güncellendi'), onError: (e) => Alert.alert('Hata', String(e)) }
    )
  }

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: spacing.lg }}>Profil</Text>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="label">AD</Text>
        <Text variant="subtitle" style={{ marginBottom: spacing.md }}>{displayName ?? '...'}</Text>
        <Text variant="label">E-POSTA</Text>
        <Text variant="subtitle">{session?.user.email}</Text>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Günlük Hedefler</Text>
        <View style={{ gap: spacing.md }}>
          <Input placeholder="Kalori hedefi (kcal)" keyboardType="numeric" value={cal} onChangeText={setCal} />
          <Input placeholder="Protein hedefi (g)" keyboardType="numeric" value={prot} onChangeText={setProt} />
          <Button title={updateGoals.isPending ? 'Kaydediliyor...' : 'Hedefleri Kaydet'} onPress={saveGoals} disabled={updateGoals.isPending} />
        </View>
      </Card>

      <Button title="Çıkış Yap" variant="ghost" onPress={() => supabase.auth.signOut()} />
    </Screen>
  )
}
```

- [ ] **Step 2: Tip kontrolü + commit**

```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(app)/profile.tsx"
git commit -m "feat(mobile): restyle profile + add calorie/protein goals"
```

---

### Task 12: Antrenman geçmişi (index) refactor

**Files:**
- Modify: `mobile/src/app/(app)/index.tsx`

- [ ] **Step 1: index.tsx içeriğini değiştir**

```tsx
import { FlatList, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Card, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useWorkouts } from '../../lib/queries'

export default function Workouts() {
  const { data: workouts, isLoading, refetch } = useWorkouts()
  const router = useRouter()

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Antrenmanlar</Text>
      <Button title="+ Yeni Antrenman" onPress={() => router.push('/(app)/new-workout')} />
      <FlatList
        style={{ marginTop: spacing.lg }}
        data={workouts}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={<Text color={colors.textMuted}>Henüz antrenman yok.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(app)/workout/${item.id}`)} style={{ marginBottom: spacing.sm }}>
            <Card style={{ padding: spacing.md }}>
              <Text variant="body">{new Date(item.started_at).toLocaleString('tr-TR')}</Text>
              {item.notes ? <Text variant="label">{item.notes}</Text> : null}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  )
}
```

- [ ] **Step 2: Tip kontrolü + commit**

```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(app)/index.tsx"
git commit -m "feat(mobile): restyle workout history with design system"
```

---

### Task 13: Yeni Antrenman ekranı refactor

**Files:**
- Modify: `mobile/src/app/(app)/new-workout.tsx`

- [ ] **Step 1: new-workout.tsx içeriğini değiştir**

```tsx
import { useState } from 'react'
import { Alert, FlatList, Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Text, Card, Input, Button } from '../../components/ui'
import { colors, spacing, radius } from '../../theme'
import { useExercises, useCreateWorkout, type Exercise } from '../../lib/queries'

type DraftSet = { exercise_id: string; exercise_name: string; reps: number; weight_kg: number }

export default function NewWorkout() {
  const { data: exercises } = useExercises()
  const createWorkout = useCreateWorkout()
  const router = useRouter()
  const [sets, setSets] = useState<DraftSet[]>([])
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')

  function addSet() {
    if (!selected || !reps) { Alert.alert('Eksik', 'Egzersiz ve tekrar gerekli'); return }
    setSets((prev) => [...prev, { exercise_id: selected.id, exercise_name: selected.name, reps: Number(reps), weight_kg: Number(weight) || 0 }])
    setReps(''); setWeight('')
  }

  function save() {
    if (sets.length === 0) { Alert.alert('Boş', 'En az bir set ekle'); return }
    const numbered = sets.map((s, i) => ({ exercise_id: s.exercise_id, set_number: i + 1, reps: s.reps, weight_kg: s.weight_kg }))
    createWorkout.mutate({ notes: null, sets: numbered }, { onSuccess: () => router.replace('/(app)'), onError: (e) => Alert.alert('Hata', String(e)) })
  }

  return (
    <Screen>
      <Text variant="subtitle" style={{ marginBottom: spacing.sm }}>Egzersiz seç</Text>
      <FlatList
        horizontal data={exercises} keyExtractor={(i) => i.id} showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item)}
            style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginRight: spacing.sm, borderRadius: radius.md, backgroundColor: selected?.id === item.id ? colors.accent : colors.cardAlt }}>
            <Text variant="body" color={selected?.id === item.id ? colors.accentText : colors.text}>{item.name}</Text>
          </Pressable>
        )}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md }}>
        <Input placeholder="Tekrar" keyboardType="numeric" value={reps} onChangeText={setReps} style={{ flex: 1 }} />
        <Input placeholder="Kilo (kg)" keyboardType="numeric" value={weight} onChangeText={setWeight} style={{ flex: 1 }} />
        <Button title="Set Ekle" onPress={addSet} />
      </View>
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
    </Screen>
  )
}
```

- [ ] **Step 2: Tip kontrolü + commit**

```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(app)/new-workout.tsx"
git commit -m "feat(mobile): restyle new-workout with design system"
```

---

### Task 14: Antrenman Detay refactor

**Files:**
- Modify: `mobile/src/app/(app)/workout/[id].tsx`

- [ ] **Step 1: [id].tsx içeriğini değiştir**

```tsx
import { FlatList, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Screen, Text, Card } from '../../../components/ui'
import { colors, spacing } from '../../../theme'
import { useWorkoutSets } from '../../../lib/queries'

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: sets, isLoading } = useWorkoutSets(id)

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Antrenman Detayı</Text>
      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text color={colors.textMuted}>Bu antrenmanda set yok.</Text>}
        renderItem={({ item }) => (
          <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
            <Text variant="body">{item.set_number}. {item.exercise.name}</Text>
            <Text variant="label">{item.reps} tekrar × {item.weight_kg} kg</Text>
          </Card>
        )}
      />
    </Screen>
  )
}
```

- [ ] **Step 2: Tip kontrolü + commit**

```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(app)/workout"
git commit -m "feat(mobile): restyle workout detail with design system"
```

---

### Task 15: Egzersiz kütüphanesi refactor

**Files:**
- Modify: `mobile/src/app/(app)/exercises.tsx`

- [ ] **Step 1: exercises.tsx içeriğini değiştir**

```tsx
import { useState } from 'react'
import { Alert, FlatList, View } from 'react-native'
import { Screen, Text, Card, Input, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'
import { useExercises, useAddExercise } from '../../lib/queries'

export default function Exercises() {
  const { data: exercises, isLoading } = useExercises()
  const addExercise = useAddExercise()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('')

  function onAdd() {
    if (!name || !muscle) { Alert.alert('Eksik', 'İsim ve kas grubu gerekli'); return }
    addExercise.mutate({ name, muscle_group: muscle, equipment: null },
      { onSuccess: () => { setName(''); setMuscle('') }, onError: (e) => Alert.alert('Hata', String(e)) })
  }

  if (isLoading) return <Screen><Text color={colors.textMuted}>Yükleniyor...</Text></Screen>

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: spacing.md }}>Egzersizler</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Input placeholder="Egzersiz adı" value={name} onChangeText={setName} style={{ flex: 1 }} />
        <Input placeholder="Kas grubu" value={muscle} onChangeText={setMuscle} style={{ flex: 1 }} />
        <Button title="Ekle" onPress={onAdd} />
      </View>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
            <Text variant="body">{item.name} {item.owner_id ? '⭐' : ''}</Text>
            <Text variant="label">{item.muscle_group}{item.equipment ? ` · ${item.equipment}` : ''}</Text>
          </Card>
        )}
      />
    </Screen>
  )
}
```

- [ ] **Step 2: Tip kontrolü + commit**

```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(app)/exercises.tsx"
git commit -m "feat(mobile): restyle exercise library with design system"
```

---

### Task 16: Giriş ekranı refactor

**Files:**
- Modify: `mobile/src/app/(auth)/login.tsx`

- [ ] **Step 1: login.tsx içeriğini değiştir**

```tsx
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Screen, Text, Input, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Giriş hatası', error.message)
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md }}>
        <Text variant="title" style={{ marginBottom: spacing.sm }}>Giriş Yap</Text>
        <Input placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input placeholder="Şifre" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title={loading ? '...' : 'Giriş Yap'} onPress={signInWithEmail} disabled={loading} />
        <Link href="/(auth)/signup" style={{ marginTop: spacing.sm }}>
          <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Hesabın yok mu? Kayıt ol</Text>
        </Link>
      </View>
    </Screen>
  )
}
```

- [ ] **Step 2: Tip kontrolü + commit**

```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(auth)/login.tsx"
git commit -m "feat(mobile): restyle login with design system"
```

---

### Task 17: Kayıt ekranı refactor

**Files:**
- Modify: `mobile/src/app/(auth)/signup.tsx`

- [ ] **Step 1: signup.tsx içeriğini değiştir**

```tsx
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { Screen, Text, Input, Button } from '../../components/ui'
import { colors, spacing } from '../../theme'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUp() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) Alert.alert('Kayıt hatası', error.message)
    else Alert.alert('Başarılı', 'Hesap oluşturuldu. Giriş yapabilirsin.')
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md }}>
        <Text variant="title" style={{ marginBottom: spacing.sm }}>Kayıt Ol</Text>
        <Input placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input placeholder="Şifre (en az 6 karakter)" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title={loading ? '...' : 'Kayıt Ol'} onPress={signUp} disabled={loading} />
        <Link href="/(auth)/login" style={{ marginTop: spacing.sm }}>
          <Text variant="label" color={colors.accent} style={{ textAlign: 'center' }}>Zaten hesabın var mı? Giriş yap</Text>
        </Link>
      </View>
    </Screen>
  )
}
```

- [ ] **Step 2: Tip kontrolü + commit**

```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.
```powershell
Set-Location C:\Users\fatih\fitness-app
git add "mobile/src/app/(auth)/signup.tsx"
git commit -m "feat(mobile): restyle signup with design system"
```

---

# BÖLÜM 6 — Bulut + APK + Doğrulama

### Task 18: Bulut şemasını güncelle

**Files:** (yok — bulut paneli + doğrulama)

- [ ] **Step 1: Kullanıcıdan bulut SQL'ini çalıştırmasını iste**

Kullanıcı: `cloud-setup-phase2.sql` (Task 3) içeriğini Supabase bulut paneli → **SQL Editor → New query** → yapıştır → **Run**. Beslenme tabloları + profil hedef kolonları + besinler buluta yüklenir.

- [ ] **Step 2: Bulut doğrulaması (besinler geldi mi)**

Run (anon key herkese açık besinleri okuyabilir):
```powershell
$url="https://basgwbnidemhmxvwpqpb.supabase.co"
$key="<bulut anon key>"  # mobile/.env içindeki EXPO_PUBLIC_SUPABASE_ANON_KEY
$h=@{ apikey=$key; Authorization="Bearer $key"; Prefer="count=exact" }
(Invoke-WebRequest -Uri "$url/rest/v1/foods?select=name&limit=1" -Headers $h -UseBasicParsing).Headers['Content-Range']
```
Expected: `0-0/50` (bulutta 50 besin).

---

### Task 19: TypeScript + bundle doğrulaması

**Files:** (yok)

- [ ] **Step 1: Tam tip kontrolü**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx tsc --noEmit
```
Expected: EXIT 0.

- [ ] **Step 2: Android bundle smoke test**

Run:
```powershell
Set-Location C:\Users\fatih\fitness-app\mobile; npx expo export --platform android --output-dir dist-check
```
Expected: "Android Bundled ... " ve "Exported: dist-check", hata yok. Sonra:
```powershell
Remove-Item -Recurse -Force dist-check
```

---

### Task 20: Yeni APK derle

**Files:** (yok — EAS)

- [ ] **Step 1: APK derlemesini başlat**

Run (EXPO_TOKEN gerekli):
```powershell
$env:EXPO_TOKEN="<expo access token>"
Set-Location C:\Users\fatih\fitness-app\mobile
npx eas-cli@latest build --platform android --profile preview --non-interactive --no-wait
```
Expected: "Build details: https://expo.dev/.../builds/<id>" linki döner.

- [ ] **Step 2: Derleme bitince APK linkini al ve kullanıcıya ver**

Run (durum kontrolü):
```powershell
$env:EXPO_TOKEN="<expo access token>"
Set-Location C:\Users\fatih\fitness-app\mobile
npx eas-cli@latest build:view <id> --json
```
Expected: `status: FINISHED` ve `artifacts.applicationArchiveUrl`. Bu linki kullanıcıya ver → telefona indir/kur → uçtan uca test.

- [ ] **Step 3: Cihazda uçtan uca test (kullanıcı)**

- Yeni APK'yı kur, giriş yap → tüm ekranlar **koyu B stilinde** görünüyor mu?
- **Beslenme** sekmesi → besin ara (örn. "tavuk") → 150g Öğle'ye ekle → Bugün ekranında kalori/makro doğru mu?
- Özel besin oluştur → aramada ⭐ ile çıkıyor mu?
- Profil → kalori/protein hedefi kaydet → Beslenme ekranında ilerleme çubuğu hedefe göre mi?
- Antrenman ekleme hâlâ çalışıyor mu (regresyon yok)?

---

## Plan Öz-Değerlendirmesi (yazar kontrolü)

- **Spec kapsamı:** foods/food_entries + RLS (Task 1), profil hedefleri (Task 1, 11), seed (Task 2), bulut SQL (Task 3, 18), tema (Task 4), UI bileşenleri (Task 5), veri hook'ları (Task 6), Beslenme sekmesi (Task 7), 3 yeni ekran (Task 8-10), tüm ekran refactor'leri (Task 11-17), APK (Task 20). Spec'in 8 bölümü kapsandı. ✅
- **Placeholder taraması:** "TBD/TODO/uygun hata yönetimi" yok; her kod adımı tam kod içeriyor. Task 18/20'deki `<bulut anon key>` / `<expo access token>` / `<id>` gerçek değer yer tutucularıdır (gizli/duruma özel), kod placeholder'ı değil. ✅
- **Tip tutarlılığı:** `Food`, `FoodEntry`, `MealType`, `Goals` tipleri ve hook isimleri (`useFoods`, `useDayEntries`, `useAddFoodEntry`, `useAddCustomFood`, `useGoals`, `useUpdateGoals`, `entryMacros`) tüm ekranlarda birebir aynı kullanıldı. UI bileşen API'leri (`Screen scroll`, `Text variant/color`, `Button variant/loading`, `ProgressBar value`, `StatChip label/value/color`) tutarlı. ✅
- **Başarı kriterleri:** Spec'teki 8 kriter Task 18-20 doğrulama adımlarıyla karşılanıyor. ✅
