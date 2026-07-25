-- SweatItOn initial schema

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  strava_athlete_id bigint unique,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Strava OAuth tokens (server-only via service role / RLS deny)
create table public.strava_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  is_private boolean not null default false,
  password_hash text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.activities (
  id bigint primary key, -- Strava activity id
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport_kind text not null check (sport_kind in ('run', 'walk')),
  strava_type text not null,
  start_date timestamptz not null,
  activity_date date not null,
  distance_meters double precision not null default 0,
  moving_time_sec integer not null default 0,
  calories double precision not null default 0,
  synced_at timestamptz not null default now()
);

create index activities_user_date_idx on public.activities (user_id, activity_date);
create index activities_start_date_idx on public.activities (start_date);

create table public.daily_stats (
  user_id uuid not null references public.profiles (id) on delete cascade,
  stat_date date not null,
  calories double precision not null default 0,
  miles double precision not null default 0,
  run_miles double precision not null default 0,
  walk_miles double precision not null default 0,
  run_moving_time_sec integer not null default 0,
  walk_moving_time_sec integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, stat_date)
);

create index daily_stats_date_idx on public.daily_stats (stat_date);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Athlete'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Recompute daily_stats for a user/date from activities
create or replace function public.recompute_daily_stats(p_user_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  meters_per_mile constant double precision := 1609.344;
begin
  insert into public.daily_stats as ds (
    user_id,
    stat_date,
    calories,
    miles,
    run_miles,
    walk_miles,
    run_moving_time_sec,
    walk_moving_time_sec,
    updated_at
  )
  select
    p_user_id,
    p_date,
    coalesce(sum(a.calories), 0),
    coalesce(sum(a.distance_meters), 0) / meters_per_mile,
    coalesce(sum(a.distance_meters) filter (where a.sport_kind = 'run'), 0) / meters_per_mile,
    coalesce(sum(a.distance_meters) filter (where a.sport_kind = 'walk'), 0) / meters_per_mile,
    coalesce(sum(a.moving_time_sec) filter (where a.sport_kind = 'run'), 0)::integer,
    coalesce(sum(a.moving_time_sec) filter (where a.sport_kind = 'walk'), 0)::integer,
    now()
  from public.activities a
  where a.user_id = p_user_id and a.activity_date = p_date
  on conflict (user_id, stat_date) do update set
    calories = excluded.calories,
    miles = excluded.miles,
    run_miles = excluded.run_miles,
    walk_miles = excluded.walk_miles,
    run_moving_time_sec = excluded.run_moving_time_sec,
    walk_moving_time_sec = excluded.walk_moving_time_sec,
    updated_at = now();

  -- If no activities remain for that day, wipe the rollup
  if not exists (
    select 1 from public.activities where user_id = p_user_id and activity_date = p_date
  ) then
    delete from public.daily_stats where user_id = p_user_id and stat_date = p_date;
  end if;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.strava_tokens enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.activities enable row level security;
alter table public.daily_stats enable row level security;

-- Profiles
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Strava tokens: no policies for authenticated — only service role
-- (intentional empty client access)

-- Groups listing: authenticated users can see group metadata (never expose password_hash in app queries)
create policy "Authenticated users can read groups"
  on public.groups for select to authenticated
  using (true);

create policy "Users can create groups"
  on public.groups for insert to authenticated
  with check (auth.uid() = created_by);

create policy "Owners can update groups"
  on public.groups for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "Owners can delete groups"
  on public.groups for delete to authenticated
  using (created_by = auth.uid());

-- Group members (helper avoids recursive RLS on group_members)
create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

create policy "Members can view membership of their groups"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

create policy "Users can join groups"
  on public.group_members for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can leave groups"
  on public.group_members for delete to authenticated
  using (auth.uid() = user_id or exists (
    select 1 from public.groups g
    where g.id = group_members.group_id and g.created_by = auth.uid()
  ));

-- Activities: own + shared group members
create policy "Users can view own activities"
  on public.activities for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.group_members mine
      join public.group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = auth.uid() and theirs.user_id = activities.user_id
    )
  );

create policy "Users insert own activities via service only"
  on public.activities for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users update own activities"
  on public.activities for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Daily stats
create policy "Users can view relevant daily stats"
  on public.daily_stats for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.group_members mine
      join public.group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = auth.uid() and theirs.user_id = daily_stats.user_id
    )
  );

create policy "Users upsert own daily stats"
  on public.daily_stats for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users update own daily stats"
  on public.daily_stats for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users delete own daily stats"
  on public.daily_stats for delete to authenticated
  using (user_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.daily_stats;
