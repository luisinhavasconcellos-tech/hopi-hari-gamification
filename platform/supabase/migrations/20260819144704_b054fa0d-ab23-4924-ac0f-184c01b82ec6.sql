CREATE TABLE public.x_posts (
  id uuid primary key default gen_random_uuid(),
  post_url text not null unique,
  shortcode text,
  media_type text,
  caption text,
  thumbnail_url text,
  media_url text,
  like_count integer default 0,
  comments_count integer default 0,
  share_count integer default 0,
  view_count integer default 0,
  timestamp timestamptz,
  owner_username text,
  ai_analysis jsonb,
  raw_data jsonb,
  scrape_status text not null default 'pending',
  scraped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.x_posts TO authenticated;
GRANT ALL ON public.x_posts TO service_role;

ALTER TABLE public.x_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can read" ON public.x_posts FOR SELECT TO authenticated USING (is_approved());
CREATE POLICY "Admins can insert" ON public.x_posts FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update" ON public.x_posts FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete" ON public.x_posts FOR DELETE TO authenticated USING (is_admin());

CREATE TRIGGER update_x_posts_updated_at BEFORE UPDATE ON public.x_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_x_posts_timestamp ON public.x_posts ("timestamp" DESC);