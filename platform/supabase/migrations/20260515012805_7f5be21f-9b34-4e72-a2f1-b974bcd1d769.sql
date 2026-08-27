CREATE TABLE public.daily_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  date DATE NOT NULL,
  posted BOOLEAN DEFAULT false,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  notes TEXT,
  post_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (platform, date)
);

ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily metrics readable by anyone"
ON public.daily_metrics FOR SELECT
USING (true);

CREATE INDEX idx_daily_metrics_platform_date ON public.daily_metrics(platform, date DESC);

CREATE TRIGGER update_daily_metrics_updated_at
BEFORE UPDATE ON public.daily_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();