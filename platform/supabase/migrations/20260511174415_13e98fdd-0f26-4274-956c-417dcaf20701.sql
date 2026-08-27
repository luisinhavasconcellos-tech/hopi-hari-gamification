CREATE TABLE IF NOT EXISTS public.instagram_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'meta_business_suite',
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_start, period_end, source)
);

ALTER TABLE public.instagram_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insights readable by anyone"
ON public.instagram_insights FOR SELECT
USING (true);

CREATE TRIGGER update_instagram_insights_updated_at
BEFORE UPDATE ON public.instagram_insights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();