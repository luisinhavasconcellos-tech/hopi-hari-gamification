ALTER TABLE public.park_public_monthly ADD COLUMN IF NOT EXISTS open_days integer;

CREATE TABLE IF NOT EXISTS public.park_gate_flow_hourly (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  hour smallint not null,
  entries integer not null default 0,
  exits integer not null default 0,
  created_at timestamptz not null default now(),
  unique (date, hour)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_gate_flow_hourly TO authenticated;
GRANT ALL ON public.park_gate_flow_hourly TO service_role;
ALTER TABLE public.park_gate_flow_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can read gate flow" ON public.park_gate_flow_hourly FOR SELECT TO authenticated USING (is_approved());
CREATE POLICY "Admins can insert gate flow" ON public.park_gate_flow_hourly FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update gate flow" ON public.park_gate_flow_hourly FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete gate flow" ON public.park_gate_flow_hourly FOR DELETE TO authenticated USING (is_admin());

CREATE TABLE IF NOT EXISTS public.park_percapita_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category text not null,
  public integer,
  quantity numeric,
  penetration_pct numeric,
  revenue numeric not null default 0,
  per_capita numeric,
  created_at timestamptz not null default now(),
  unique (date, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_percapita_daily TO authenticated;
GRANT ALL ON public.park_percapita_daily TO service_role;
ALTER TABLE public.park_percapita_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can read percapita" ON public.park_percapita_daily FOR SELECT TO authenticated USING (is_approved());
CREATE POLICY "Admins can insert percapita" ON public.park_percapita_daily FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update percapita" ON public.park_percapita_daily FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete percapita" ON public.park_percapita_daily FOR DELETE TO authenticated USING (is_admin());

CREATE TABLE IF NOT EXISTS public.park_outlet_revenue_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  outlet text not null,
  revenue numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (date, outlet)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_outlet_revenue_daily TO authenticated;
GRANT ALL ON public.park_outlet_revenue_daily TO service_role;
ALTER TABLE public.park_outlet_revenue_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can read outlets" ON public.park_outlet_revenue_daily FOR SELECT TO authenticated USING (is_approved());
CREATE POLICY "Admins can insert outlets" ON public.park_outlet_revenue_daily FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update outlets" ON public.park_outlet_revenue_daily FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete outlets" ON public.park_outlet_revenue_daily FOR DELETE TO authenticated USING (is_admin());