-- Settings table to store follower counts per platform (used to compute ER)
CREATE TABLE public.platform_settings (
  platform TEXT PRIMARY KEY,
  follower_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings readable by anyone"
  ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Settings insertable by anyone"
  ON public.platform_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Settings updatable by anyone"
  ON public.platform_settings FOR UPDATE USING (true);

INSERT INTO public.platform_settings (platform, follower_count) VALUES
  ('instagram', 0), ('tiktok', 0), ('facebook', 0), ('linkedin', 0)
ON CONFLICT (platform) DO NOTHING;