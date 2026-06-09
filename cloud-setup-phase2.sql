-- Aşama 2 — Bulut kurulum: SQL Editor → New query → yapıştır → Run.
-- (Aşama 1'deki tablolar zaten kurulu; bu yalnızca beslenme tablolarını + profil hedef kolonlarını + besinleri ekler.)

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

create index food_entries_user_date_idx on public.food_entries(user_id, entry_date);
create index foods_owner_id_idx on public.foods(owner_id);

-- ============ profiles hedef kolonları ============
alter table public.profiles add column daily_calorie_goal int;
alter table public.profiles add column daily_protein_goal int;

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
  ('Pirinç Patlağı', 387, 7.0, 87.0, 1.0),
  ('Köfte (ızgara)', 235, 18.0, 5.0, 16.0),
  ('Simit', 307, 9.0, 56.0, 4.5);
