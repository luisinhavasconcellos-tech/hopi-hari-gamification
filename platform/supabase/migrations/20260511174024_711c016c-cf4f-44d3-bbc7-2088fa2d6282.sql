CREATE TABLE IF NOT EXISTS public.facebook_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  source text NOT NULL DEFAULT 'meta_business_suite',
  metrics jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_start, period_end, source)
);
ALTER TABLE public.facebook_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insights readable by anyone" ON public.facebook_insights FOR SELECT USING (true);
GRANT INSERT, UPDATE ON public.facebook_insights TO sandbox_exec;
CREATE TRIGGER facebook_insights_updated_at BEFORE UPDATE ON public.facebook_insights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();