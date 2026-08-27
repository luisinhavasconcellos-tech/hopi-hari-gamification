-- Table to store Instagram posts scraped from PhantomBuster
CREATE TABLE public.instagram_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_url TEXT NOT NULL UNIQUE,
  shortcode TEXT,
  media_type TEXT, -- IMAGE | VIDEO | CAROUSEL_ALBUM
  caption TEXT,
  thumbnail_url TEXT,
  media_url TEXT,
  like_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  view_count INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE,
  owner_username TEXT,
  scrape_status TEXT NOT NULL DEFAULT 'pending', -- pending | scraped | failed
  scraped_at TIMESTAMP WITH TIME ZONE,
  raw_data JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_instagram_posts_timestamp ON public.instagram_posts(timestamp DESC);
CREATE INDEX idx_instagram_posts_status ON public.instagram_posts(scrape_status);

-- Table for global AI reports
CREATE TABLE public.instagram_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'global', -- global | segment
  summary TEXT,
  insights JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS; app is single-user so data is public-readable from the client
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are readable by anyone"
ON public.instagram_posts FOR SELECT USING (true);

CREATE POLICY "Reports are readable by anyone"
ON public.instagram_reports FOR SELECT USING (true);

-- Writes happen only from edge functions using the service role key,
-- so we intentionally do NOT add INSERT/UPDATE/DELETE policies for anon.

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_instagram_posts_updated_at
BEFORE UPDATE ON public.instagram_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();