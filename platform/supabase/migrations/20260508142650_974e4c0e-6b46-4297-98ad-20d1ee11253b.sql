CREATE TABLE public.youtube_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_url TEXT NOT NULL,
  shortcode TEXT,
  media_type TEXT,
  caption TEXT,
  thumbnail_url TEXT,
  media_url TEXT,
  like_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  view_count INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE,
  owner_username TEXT,
  scrape_status TEXT NOT NULL DEFAULT 'pending',
  scraped_at TIMESTAMP WITH TIME ZONE,
  raw_data JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are readable by anyone" ON public.youtube_posts FOR SELECT USING (true);

CREATE TRIGGER update_youtube_posts_updated_at
BEFORE UPDATE ON public.youtube_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();