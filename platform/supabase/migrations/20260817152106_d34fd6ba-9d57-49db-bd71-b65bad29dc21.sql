create table if not exists public.ci_competitors (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  is_self boolean not null default false,
  trends_query text not null,
  instagram text,
  tiktok text,
  youtube text,
  exclude_flags jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ci_trend_scores (
  id bigint generated always as identity primary key,
  competitor_id uuid not null references public.ci_competitors(id) on delete cascade,
  date date not null,
  score numeric not null,
  raw_score numeric,
  batch text,
  captured_at timestamptz not null default now(),
  unique (competitor_id, date)
);

create table if not exists public.ci_social_snapshots (
  id bigint generated always as identity primary key,
  competitor_id uuid not null references public.ci_competitors(id) on delete cascade,
  platform text not null check (platform in ('instagram','tiktok','youtube','facebook','linkedin')),
  followers bigint,
  posts_count bigint,
  avg_likes numeric,
  avg_comments numeric,
  engagement_rate numeric,
  raw jsonb,
  captured_at timestamptz not null default now()
);
create index if not exists idx_ci_social_comp_platform
  on public.ci_social_snapshots (competitor_id, platform, captured_at desc);

create table if not exists public.ci_posts (
  id bigint generated always as identity primary key,
  competitor_id uuid not null references public.ci_competitors(id) on delete cascade,
  platform text not null,
  external_id text not null,
  posted_at timestamptz,
  caption text,
  likes bigint default 0,
  comments bigint default 0,
  views bigint,
  url text,
  captured_at timestamptz not null default now(),
  unique (platform, external_id)
);

create table if not exists public.ci_insights (
  id bigint generated always as identity primary key,
  week_ending date not null,
  headline text not null,
  body_ptbr text not null,
  ranking jsonb,
  model text not null default 'google/gemini-2.5-flash',
  created_at timestamptz not null default now()
);

grant select on public.ci_competitors to authenticated;
grant insert, update, delete on public.ci_competitors to authenticated;
grant select on public.ci_trend_scores to authenticated;
grant select on public.ci_social_snapshots to authenticated;
grant select on public.ci_posts to authenticated;
grant select on public.ci_insights to authenticated;
grant all on public.ci_competitors to service_role;
grant all on public.ci_trend_scores to service_role;
grant all on public.ci_social_snapshots to service_role;
grant all on public.ci_posts to service_role;
grant all on public.ci_insights to service_role;

alter table public.ci_competitors enable row level security;
alter table public.ci_trend_scores enable row level security;
alter table public.ci_social_snapshots enable row level security;
alter table public.ci_posts enable row level security;
alter table public.ci_insights enable row level security;

create policy "ci_competitors_select" on public.ci_competitors for select to authenticated using (public.is_approved());
create policy "ci_competitors_admin_write" on public.ci_competitors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ci_trend_scores_select" on public.ci_trend_scores for select to authenticated using (public.is_approved());
create policy "ci_social_snapshots_select" on public.ci_social_snapshots for select to authenticated using (public.is_approved());
create policy "ci_posts_select" on public.ci_posts for select to authenticated using (public.is_approved());
create policy "ci_insights_select" on public.ci_insights for select to authenticated using (public.is_approved());

create or replace view public.ci_weekly_ranking
with (security_invoker = true) as
with latest as (
  select distinct on (competitor_id, platform)
    competitor_id, platform, followers, engagement_rate, captured_at
  from public.ci_social_snapshots
  order by competitor_id, platform, captured_at desc
),
prev as (
  select distinct on (s.competitor_id, s.platform)
    s.competitor_id, s.platform, s.followers as prev_followers
  from public.ci_social_snapshots s
  join latest l on l.competitor_id = s.competitor_id and l.platform = s.platform
  where s.captured_at < l.captured_at - interval '5 days'
  order by s.competitor_id, s.platform, s.captured_at desc
),
agg as (
  select
    c.id, c.slug, c.name, c.is_self,
    sum(l.followers) as total_followers,
    sum(coalesce(p.prev_followers, l.followers)) as prev_total,
    avg(l.engagement_rate) as avg_engagement
  from public.ci_competitors c
  join latest l on l.competitor_id = c.id
  left join prev p on p.competitor_id = c.id and p.platform = l.platform
  where c.active
  group by c.id, c.slug, c.name, c.is_self
),
trend as (
  select competitor_id, avg(score) as trend_7d
  from public.ci_trend_scores
  where date >= current_date - 7
  group by competitor_id
)
select
  a.slug, a.name, a.is_self,
  a.total_followers,
  a.total_followers - a.prev_total as weekly_delta,
  round(a.avg_engagement::numeric, 4) as avg_engagement,
  round(coalesce(t.trend_7d, 0)::numeric, 1) as trend_7d,
  round((0.57 * coalesce(t.trend_7d,0)
       + 0.43 * least(coalesce(a.avg_engagement,0) * 1000, 100))::numeric, 1) as composite_score
from agg a
left join trend t on t.competitor_id = a.id
order by composite_score desc;

grant select on public.ci_weekly_ranking to authenticated;
grant select on public.ci_weekly_ranking to service_role;

insert into public.ci_competitors (slug, name, is_self, trends_query, instagram, tiktok, exclude_flags) values
  ('hopi-hari',        'Hopi Hari',            true,  'Hopi Hari',            'hopihari',            'hopihari',            '{}'),
  ('beto-carrero',     'Beto Carrero World',   false, 'Beto Carrero World',   'betocarreroworld',    'betocarreroworld',    '{}'),
  ('beach-park',       'Beach Park',           false, 'Beach Park',           'beachpark',           'beachpark',           '{}'),
  ('hot-park',         'Hot Park',             false, 'Hot Park',             'hotpark',             'hotpark',             '{}'),
  ('thermas-laranjais','Thermas dos Laranjais',false, 'Thermas dos Laranjais','thermasdoslaranjais', 'thermasdoslaranjais', '{}'),
  ('wet-n-wild',       'Wet''n Wild',          false, 'Wet n Wild São Paulo', 'wetnwildsp',          'wetnwildsp',          '{}'),
  ('cacau-park',       'Cacau Park',           false, 'Cacau Park',           'cacaupark',           'cacaupark',           '{"linkedin": true}')
on conflict (slug) do nothing;