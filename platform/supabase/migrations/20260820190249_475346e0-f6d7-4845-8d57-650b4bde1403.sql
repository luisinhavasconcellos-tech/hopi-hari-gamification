CREATE TABLE public.sales_meeting_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  scope text NOT NULL,
  channel text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  goal numeric NOT NULL DEFAULT 0,
  realized_current numeric NOT NULL DEFAULT 0,
  realized_previous numeric NOT NULL DEFAULT 0,
  forecast numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_date, channel)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_meeting_channels TO authenticated;
GRANT ALL ON public.sales_meeting_channels TO service_role;
ALTER TABLE public.sales_meeting_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read sales_meeting_channels" ON public.sales_meeting_channels FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "admin insert sales_meeting_channels" ON public.sales_meeting_channels FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin update sales_meeting_channels" ON public.sales_meeting_channels FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin delete sales_meeting_channels" ON public.sales_meeting_channels FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_sales_meeting_channels_updated_at BEFORE UPDATE ON public.sales_meeting_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ecommerce_funnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  visits bigint NOT NULL DEFAULT 0,
  product_views bigint NOT NULL DEFAULT 0,
  add_to_cart bigint NOT NULL DEFAULT 0,
  purchases bigint NOT NULL DEFAULT 0,
  conversion_rate numeric,
  revenue numeric NOT NULL DEFAULT 0,
  avg_ticket numeric,
  source text NOT NULL DEFAULT 'reuniao_vendas',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_start, period_end)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_funnel TO authenticated;
GRANT ALL ON public.ecommerce_funnel TO service_role;
ALTER TABLE public.ecommerce_funnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read ecommerce_funnel" ON public.ecommerce_funnel FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "admin insert ecommerce_funnel" ON public.ecommerce_funnel FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin update ecommerce_funnel" ON public.ecommerce_funnel FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin delete ecommerce_funnel" ON public.ecommerce_funnel FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_ecommerce_funnel_updated_at BEFORE UPDATE ON public.ecommerce_funnel FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();