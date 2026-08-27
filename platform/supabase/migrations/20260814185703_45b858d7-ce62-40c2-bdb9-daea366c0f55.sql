CREATE TABLE public.instagram_audience_geo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('uf','city')),
  uf text NOT NULL,
  city text,
  share_pct numeric NOT NULL CHECK (share_pct >= 0),
  followers integer,
  period_label text,
  source text NOT NULL DEFAULT 'meta_business_suite',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX instagram_audience_geo_unique
  ON public.instagram_audience_geo (level, uf, COALESCE(city, ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_audience_geo TO authenticated;
GRANT ALL ON public.instagram_audience_geo TO service_role;

ALTER TABLE public.instagram_audience_geo ENABLE ROW LEVEL SECURITY;

CREATE POLICY ig_audience_geo_select ON public.instagram_audience_geo FOR SELECT TO authenticated USING (is_approved());
CREATE POLICY ig_audience_geo_insert ON public.instagram_audience_geo FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY ig_audience_geo_update ON public.instagram_audience_geo FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY ig_audience_geo_delete ON public.instagram_audience_geo FOR DELETE TO authenticated USING (is_admin());

CREATE TRIGGER instagram_audience_geo_updated_at
  BEFORE UPDATE ON public.instagram_audience_geo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();