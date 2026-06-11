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
