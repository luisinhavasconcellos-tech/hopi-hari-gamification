CREATE TABLE public.ci_weekly_input (
  id BIGSERIAL PRIMARY KEY,
  week DATE NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  instagram BIGINT,
  tiktok BIGINT,
  facebook BIGINT,
  youtube BIGINT,
  linkedin BIGINT,
  total_followers BIGINT,
  mentions NUMERIC,
  engagement NUMERIC,
  sentiment NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week, slug)
);

GRANT SELECT ON public.ci_weekly_input TO authenticated;
GRANT ALL ON public.ci_weekly_input TO service_role;

ALTER TABLE public.ci_weekly_input ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_weekly_input_select_auth" ON public.ci_weekly_input
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ci_weekly_input_admin_write" ON public.ci_weekly_input
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ci_weekly_input_updated_at
  BEFORE UPDATE ON public.ci_weekly_input
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();