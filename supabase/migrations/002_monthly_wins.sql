-- Monthly wins: one crowned winner per group per completed calendar month

create table public.monthly_wins (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  month date not null, -- first day of the month
  calories double precision not null default 0,
  decided_at timestamptz not null default now(),
  primary key (group_id, month)
);

alter table public.monthly_wins enable row level security;

create policy "Members can view their group's monthly wins"
  on public.monthly_wins for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

-- Recompute winners for every completed month for a group.
-- Winner = member with the highest total calories that month
-- (ties broken by higher total miles, then user_id). Months where
-- nobody burned any calories are skipped/removed.
create or replace function public.recompute_monthly_wins(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Drop wins for months that no longer qualify (e.g. activity deleted)
  delete from public.monthly_wins mw
  where mw.group_id = p_group_id
    and not exists (
      select 1
      from public.daily_stats ds
      join public.group_members gm
        on gm.user_id = ds.user_id and gm.group_id = p_group_id
      where date_trunc('month', ds.stat_date)::date = mw.month
        and ds.calories > 0
    );

  insert into public.monthly_wins as mw (group_id, user_id, month, calories, decided_at)
  select distinct on (totals.month)
    p_group_id,
    totals.user_id,
    totals.month,
    totals.calories,
    now()
  from (
    select
      ds.user_id,
      date_trunc('month', ds.stat_date)::date as month,
      coalesce(sum(ds.calories), 0) as calories,
      coalesce(sum(ds.miles), 0) as miles
    from public.daily_stats ds
    join public.group_members gm
      on gm.user_id = ds.user_id and gm.group_id = p_group_id
    where date_trunc('month', ds.stat_date) < date_trunc('month', current_date)
    group by ds.user_id, date_trunc('month', ds.stat_date)
  ) totals
  where totals.calories > 0
  order by totals.month, totals.calories desc, totals.miles desc, totals.user_id
  on conflict (group_id, month) do update set
    user_id = excluded.user_id,
    calories = excluded.calories,
    decided_at = now();
end;
$$;
