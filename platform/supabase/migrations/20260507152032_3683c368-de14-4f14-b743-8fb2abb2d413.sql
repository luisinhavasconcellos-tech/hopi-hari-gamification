
-- TikTok posts
CREATE TABLE public.tiktok_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url text NOT NULL,
  shortcode text,
  media_type text,
  caption text,
  thumbnail_url text,
  media_url text,
  like_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  view_count integer,
  timestamp timestamptz,
  owner_username text,
  scrape_status text NOT NULL DEFAULT 'pending',
  scraped_at timestamptz,
  raw_data jsonb,
  ai_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tiktok_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are readable by anyone" ON public.tiktok_posts FOR SELECT USING (true);
CREATE TRIGGER update_tiktok_posts_updated_at BEFORE UPDATE ON public.tiktok_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LinkedIn posts
CREATE TABLE public.linkedin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url text NOT NULL,
  shortcode text,
  media_type text,
  caption text,
  thumbnail_url text,
  media_url text,
  like_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  view_count integer,
  timestamp timestamptz,
  owner_username text,
  scrape_status text NOT NULL DEFAULT 'pending',
  scraped_at timestamptz,
  raw_data jsonb,
  ai_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.linkedin_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are readable by anyone" ON public.linkedin_posts FOR SELECT USING (true);
CREATE TRIGGER update_linkedin_posts_updated_at BEFORE UPDATE ON public.linkedin_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Facebook posts
CREATE TABLE public.facebook_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url text NOT NULL,
  shortcode text,
  media_type text,
  caption text,
  thumbnail_url text,
  media_url text,
  like_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  view_count integer,
  timestamp timestamptz,
  owner_username text,
  scrape_status text NOT NULL DEFAULT 'pending',
  scraped_at timestamptz,
  raw_data jsonb,
  ai_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.facebook_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are readable by anyone" ON public.facebook_posts FOR SELECT USING (true);
CREATE TRIGGER update_facebook_posts_updated_at BEFORE UPDATE ON public.facebook_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
