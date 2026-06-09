-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ============ exercises ============
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null,
  equipment text,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.exercises enable row level security;

-- owner_id NULL = herkese açık (hazır) egzersiz; dolu = kullanıcının özel egzersizi
create policy "exercises_select_public_or_own" on public.exercises
  for select using (owner_id is null or owner_id = auth.uid());
create policy "exercises_insert_own" on public.exercises
  for insert with check (owner_id = auth.uid());
create policy "exercises_update_own" on public.exercises
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "exercises_delete_own" on public.exercises
  for delete using (owner_id = auth.uid());

-- ============ workouts ============
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text
);
alter table public.workouts enable row level security;

create policy "workouts_select_own" on public.workouts
  for select using (user_id = auth.uid());
create policy "workouts_insert_own" on public.workouts
  for insert with check (user_id = auth.uid());
create policy "workouts_update_own" on public.workouts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workouts_delete_own" on public.workouts
  for delete using (user_id = auth.uid());

-- ============ workout_sets ============
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number int not null check (set_number > 0),
  reps int not null check (reps >= 0),
  weight_kg numeric not null default 0 check (weight_kg >= 0),
  created_at timestamptz not null default now()
);
alter table public.workout_sets enable row level security;

-- Sahiplik kontrolü ilgili workout üzerinden yapılır
create policy "sets_select_via_workout" on public.workout_sets
  for select using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()));
create policy "sets_insert_via_workout" on public.workout_sets
  for insert with check (
    exists (select 1 from public.workouts w
            where w.id = workout_id and w.user_id = auth.uid())
    and exists (select 1 from public.exercises e
            where e.id = exercise_id and (e.owner_id is null or e.owner_id = auth.uid())));
create policy "sets_update_via_workout" on public.workout_sets
  for update
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()))
  with check (
    exists (select 1 from public.workouts w
            where w.id = workout_id and w.user_id = auth.uid())
    and exists (select 1 from public.exercises e
            where e.id = exercise_id and (e.owner_id is null or e.owner_id = auth.uid())));
create policy "sets_delete_via_workout" on public.workout_sets
  for delete using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()));

-- Performans için indeksler
create index workout_sets_workout_id_idx on public.workout_sets(workout_id);
create index workouts_user_id_idx on public.workouts(user_id);
create index exercises_owner_id_idx on public.exercises(owner_id);
