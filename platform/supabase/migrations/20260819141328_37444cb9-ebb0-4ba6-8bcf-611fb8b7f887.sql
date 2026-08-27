CREATE TABLE IF NOT EXISTS public.x_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id text NOT NULL UNIQUE,
  url text,
  author_handle text,
  author_name text,
  author_followers integer,
  text text,
  lang text,
  keyword text,
  brand text NOT NULL DEFAULT 'hopi_hari',
  likes integer NOT NULL DEFAULT 0,
  retweets integer NOT NULL DEFAULT 0,
  replies integer NOT NULL DEFAULT 0,
  quotes integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  sentiment text,
  topic text,
  ai_summary text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS x_mentions_published_idx ON public.x_mentions (published_at DESC);
CREATE INDEX IF NOT EXISTS x_mentions_brand_idx ON public.x_mentions (brand);

GRANT SELECT ON public.x_mentions TO authenticated;
GRANT ALL ON public.x_mentions TO service_role;

ALTER TABLE public.x_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "x_mentions_read_authenticated" ON public.x_mentions;
CREATE POLICY "x_mentions_read_authenticated"
ON public.x_mentions FOR SELECT TO authenticated USING (true);