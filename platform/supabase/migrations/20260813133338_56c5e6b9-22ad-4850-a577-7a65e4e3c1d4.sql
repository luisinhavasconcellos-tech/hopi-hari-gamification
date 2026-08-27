CREATE TABLE public.sales_revenue_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_revenue_monthly TO authenticated;
GRANT ALL ON public.sales_revenue_monthly TO service_role;
ALTER TABLE public.sales_revenue_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved can read sales revenue" ON public.sales_revenue_monthly FOR SELECT TO authenticated USING (is_approved());
CREATE POLICY "Admins manage sales revenue" ON public.sales_revenue_monthly FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_sales_revenue_monthly_updated BEFORE UPDATE ON public.sales_revenue_monthly FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sales_product_yearly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  product text NOT NULL,
  year integer NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, product, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_product_yearly TO authenticated;
GRANT ALL ON public.sales_product_yearly TO service_role;
ALTER TABLE public.sales_product_yearly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved can read sales products" ON public.sales_product_yearly FOR SELECT TO authenticated USING (is_approved());
CREATE POLICY "Admins manage sales products" ON public.sales_product_yearly FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_sales_product_yearly_updated BEFORE UPDATE ON public.sales_product_yearly FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();