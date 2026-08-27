create table if not exists public.follower_daily (
  reading_date date primary key,
  instagram integer not null,
  tiktok integer not null,
  facebook integer not null,
  youtube integer not null,
  linkedin integer not null,
  is_anomaly boolean not null default false,
  anomaly_note text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  total integer generated always as (instagram + tiktok + facebook + youtube + linkedin) stored
);
create index if not exists follower_daily_date_idx on public.follower_daily (reading_date desc);
grant select, insert, update, delete on public.follower_daily to authenticated;
grant all on public.follower_daily to service_role;
alter table public.follower_daily enable row level security;
create policy "follower_daily auth read" on public.follower_daily for select to authenticated using (true);
create policy "follower_daily auth write" on public.follower_daily for all to authenticated using (true) with check (true);

create table if not exists public.competitor_snapshot (
  id bigserial primary key,
  collected_at date not null,
  park_name text not null,
  followers integer not null,
  mentions_index smallint not null check (mentions_index between 0 and 100),
  engagement_index smallint not null check (engagement_index between 0 and 100),
  excluded boolean not null default false,
  exclusion_note text,
  created_at timestamptz not null default now(),
  unique (collected_at, park_name)
);
grant select, insert, update, delete on public.competitor_snapshot to authenticated;
grant all on public.competitor_snapshot to service_role;
alter table public.competitor_snapshot enable row level security;
create policy "competitor auth read" on public.competitor_snapshot for select to authenticated using (true);
create policy "competitor auth write" on public.competitor_snapshot for all to authenticated using (true) with check (true);

create table if not exists public.goal_cycle (
  id bigserial primary key,
  label text not null,
  goal integer not null,
  cycle_start date not null,
  cycle_end date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.goal_cycle to authenticated;
grant all on public.goal_cycle to service_role;
alter table public.goal_cycle enable row level security;
create policy "goal_cycle auth read" on public.goal_cycle for select to authenticated using (true);
create policy "goal_cycle auth write" on public.goal_cycle for all to authenticated using (true) with check (true);

create table if not exists public.weekly_insight (
  week_end date primary key,
  notes jsonb not null,
  script_md text,
  model text not null,
  generated_at timestamptz not null default now(),
  edited_by text,
  edited_at timestamptz
);
grant select, insert, update, delete on public.weekly_insight to authenticated;
grant all on public.weekly_insight to service_role;
alter table public.weekly_insight enable row level security;
create policy "weekly_insight auth read" on public.weekly_insight for select to authenticated using (true);
create policy "weekly_insight auth write" on public.weekly_insight for all to authenticated using (true) with check (true);

insert into public.goal_cycle (label, goal, cycle_start, is_active)
select 'Meta 3M · 2026', 3000000, '2026-06-02'::date, true
where not exists (select 1 from public.goal_cycle where label = 'Meta 3M · 2026');

insert into public.competitor_snapshot (collected_at, park_name, followers, mentions_index, engagement_index) values
 ('2026-07-06','Beto Carrero World',12825839,100,100),
 ('2026-07-06','Beach Park',4945700,54,50),
 ('2026-07-06','Thermas dos Laranjais / São Pedro',1935390,33,32),
 ('2026-07-06','Hot Park',1913778,23,23),
 ('2026-07-06','Wet''n Wild',1153200,20,18),
 ('2026-07-06','Cacau Park',675970,5,6)
on conflict (collected_at, park_name) do nothing;