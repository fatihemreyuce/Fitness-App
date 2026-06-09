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
