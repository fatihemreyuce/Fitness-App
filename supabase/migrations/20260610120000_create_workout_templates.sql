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
