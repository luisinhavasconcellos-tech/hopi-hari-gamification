CREATE TABLE public.distributor_sales_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date date,
  year integer NOT NULL,
  month integer NOT NULL,
  kind text NOT NULL DEFAULT 'daily',
  quantity integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'planilha',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX distributor_sales_daily_key
  ON public.distributor_sales_daily (year, month, kind, COALESCE(sale_date, '1900-01-01'::date));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_sales_daily TO authenticated;
GRANT ALL ON public.distributor_sales_daily TO service_role;

ALTER TABLE public.distributor_sales_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved read distributor_sales_daily"
  ON public.distributor_sales_daily FOR SELECT TO authenticated
  USING (public.is_approved());

CREATE POLICY "admin write distributor_sales_daily"
  ON public.distributor_sales_daily FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_distributor_sales_daily_updated
  BEFORE UPDATE ON public.distributor_sales_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();