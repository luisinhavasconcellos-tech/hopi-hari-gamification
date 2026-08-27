CREATE TABLE public.sales_funnel_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  stage text NOT NULL,
  company text NOT NULL,
  pax integer,
  event_date date,
  event_type text,
  status text,
  loss_reason text,
  total_value numeric NOT NULL DEFAULT 0,
  paid_value numeric,
  contact_channel text,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_funnel_deals TO authenticated;
GRANT ALL ON public.sales_funnel_deals TO service_role;
ALTER TABLE public.sales_funnel_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved can read funnel deals" ON public.sales_funnel_deals FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "Admins manage funnel deals" ON public.sales_funnel_deals FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER update_sales_funnel_deals_updated_at BEFORE UPDATE ON public.sales_funnel_deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sales_funnel_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_funnel_monthly TO authenticated;
GRANT ALL ON public.sales_funnel_monthly TO service_role;
ALTER TABLE public.sales_funnel_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved can read funnel monthly" ON public.sales_funnel_monthly FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "Admins manage funnel monthly" ON public.sales_funnel_monthly FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER update_sales_funnel_monthly_updated_at BEFORE UPDATE ON public.sales_funnel_monthly FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();