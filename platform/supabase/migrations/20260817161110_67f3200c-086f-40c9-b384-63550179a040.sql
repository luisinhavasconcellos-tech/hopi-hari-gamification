create table if not exists public.gsc_daily_totals (
  id            bigserial primary key,
  site_url      text not null,
  date          date not null,
  clicks        integer not null default 0,
  impressions   integer not null default 0,
  ctr           numeric(6,4) not null default 0,
  position      numeric(6,2) not null default 0,
  fetched_at    timestamptz not null default now(),
  constraint gsc_daily_totals_unique unique (site_url, date)
);
create index if not exists gsc_daily_totals_date_idx on public.gsc_daily_totals (site_url, date desc);

create table if not exists public.gsc_daily_queries (
  id            bigserial primary key,
  site_url      text not null,
  date          date not null,
  query         text not null,
  clicks        integer not null default 0,
  impressions   integer not null default 0,
  ctr           numeric(6,4) not null default 0,
  position      numeric(6,2) not null default 0,
  is_brand      boolean not null default false,
  fetched_at    timestamptz not null default now(),
  constraint gsc_daily_queries_unique unique (site_url, date, query)
);
create index if not exists gsc_daily_queries_date_idx on public.gsc_daily_queries (site_url, date desc);
create index if not exists gsc_daily_queries_brand_idx on public.gsc_daily_queries (site_url, is_brand, date desc);

create table if not exists public.gsc_sync_log (
  id            bigserial primary key,
  site_url      text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running',
  days_range    text,
  rows_totals   integer default 0,
  rows_queries  integer default 0,
  error_message text
);

grant select on public.gsc_daily_totals to authenticated;
grant select on public.gsc_daily_queries to authenticated;
grant select on public.gsc_sync_log to authenticated;
grant all on public.gsc_daily_totals to service_role;
grant all on public.gsc_daily_queries to service_role;
grant all on public.gsc_sync_log to service_role;
grant usage, select on sequence public.gsc_daily_totals_id_seq to service_role;
grant usage, select on sequence public.gsc_daily_queries_id_seq to service_role;
grant usage, select on sequence public.gsc_sync_log_id_seq to service_role;

alter table public.gsc_daily_totals  enable row level security;
alter table public.gsc_daily_queries enable row level security;
alter table public.gsc_sync_log      enable row level security;

drop policy if exists "gsc_totals_read" on public.gsc_daily_totals;
create policy "gsc_totals_read" on public.gsc_daily_totals
  for select to authenticated using (public.is_approved());

drop policy if exists "gsc_queries_read" on public.gsc_daily_queries;
create policy "gsc_queries_read" on public.gsc_daily_queries
  for select to authenticated using (public.is_approved());

drop policy if exists "gsc_log_read" on public.gsc_sync_log;
create policy "gsc_log_read" on public.gsc_sync_log
  for select to authenticated using (public.is_approved());

create or replace view public.gsc_brand_split
with (security_invoker = on) as
select
  site_url,
  date,
  sum(clicks)      filter (where is_brand)     as brand_clicks,
  sum(impressions) filter (where is_brand)     as brand_impressions,
  sum(clicks)      filter (where not is_brand) as nonbrand_clicks,
  sum(impressions) filter (where not is_brand) as nonbrand_impressions,
  round(100.0 * sum(impressions) filter (where is_brand) / nullif(sum(impressions), 0), 1) as brand_share_pct
from public.gsc_daily_queries
group by site_url, date;

create or replace view public.gsc_weekly
with (security_invoker = on) as
select
  site_url,
  (date_trunc('week', date + interval '5 days') - interval '5 days')::date as week_start,
  sum(clicks)      as clicks,
  sum(impressions) as impressions,
  round(avg(position), 1) as avg_position,
  round(100.0 * sum(clicks) / nullif(sum(impressions), 0), 2) as ctr_pct
from public.gsc_daily_totals
group by site_url, 2;

grant select on public.gsc_brand_split to authenticated;
grant select on public.gsc_weekly to authenticated;