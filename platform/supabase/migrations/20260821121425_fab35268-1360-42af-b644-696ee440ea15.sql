CREATE TABLE public.website_sales_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_date date NOT NULL,
  revenue numeric NOT NULL DEFAULT 0,
  orders integer,
  source text NOT NULL DEFAULT 'planilha',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_sales_daily TO authenticated;
GRANT ALL ON public.website_sales_daily TO service_role;
ALTER TABLE public.website_sales_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read website_sales_daily" ON public.website_sales_daily FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "admin write website_sales_daily" ON public.website_sales_daily FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_website_sales_daily_updated BEFORE UPDATE ON public.website_sales_daily FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();