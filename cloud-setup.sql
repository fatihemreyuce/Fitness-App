-- =====================================================================
-- Fitness App — Bulut Supabase kurulum scripti (tek seferde çalıştır)
-- Supabase Dashboard → SQL Editor → New query → bu dosyanın tamamını
-- yapıştır → "Run". Şema + RLS + trigger + 32 egzersiz yüklenir.
-- =====================================================================

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

-- İndeksler
create index workout_sets_workout_id_idx on public.workout_sets(workout_id);
create index workouts_user_id_idx on public.workouts(user_id);
create index exercises_owner_id_idx on public.exercises(owner_id);

-- ============ Yeni kullanıcı → otomatik profil trigger ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ Hazır egzersiz kütüphanesi (32 adet) ============
insert into public.exercises (name, muscle_group, equipment) values
  ('Bench Press', 'chest', 'barbell'),
  ('Incline Bench Press', 'chest', 'barbell'),
  ('Dumbbell Press', 'chest', 'dumbbell'),
  ('Push Up', 'chest', 'bodyweight'),
  ('Chest Fly', 'chest', 'dumbbell'),
  ('Pull Up', 'back', 'bodyweight'),
  ('Lat Pulldown', 'back', 'cable'),
  ('Barbell Row', 'back', 'barbell'),
  ('Seated Cable Row', 'back', 'cable'),
  ('Deadlift', 'back', 'barbell'),
  ('Overhead Press', 'shoulders', 'barbell'),
  ('Lateral Raise', 'shoulders', 'dumbbell'),
  ('Front Raise', 'shoulders', 'dumbbell'),
  ('Face Pull', 'shoulders', 'cable'),
  ('Barbell Curl', 'biceps', 'barbell'),
  ('Dumbbell Curl', 'biceps', 'dumbbell'),
  ('Hammer Curl', 'biceps', 'dumbbell'),
  ('Tricep Pushdown', 'triceps', 'cable'),
  ('Skull Crusher', 'triceps', 'barbell'),
  ('Dips', 'triceps', 'bodyweight'),
  ('Back Squat', 'legs', 'barbell'),
  ('Front Squat', 'legs', 'barbell'),
  ('Leg Press', 'legs', 'machine'),
  ('Lunge', 'legs', 'dumbbell'),
  ('Leg Curl', 'legs', 'machine'),
  ('Leg Extension', 'legs', 'machine'),
  ('Calf Raise', 'legs', 'machine'),
  ('Romanian Deadlift', 'legs', 'barbell'),
  ('Plank', 'core', 'bodyweight'),
  ('Crunch', 'core', 'bodyweight'),
  ('Hanging Leg Raise', 'core', 'bodyweight'),
  ('Russian Twist', 'core', 'bodyweight');
