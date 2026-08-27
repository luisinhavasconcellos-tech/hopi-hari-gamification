CREATE INDEX IF NOT EXISTS idx_tiktok_posts_timestamp   ON public.tiktok_posts   ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_timestamp ON public.linkedin_posts ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_timestamp ON public.facebook_posts ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_posts_timestamp  ON public.youtube_posts  ("timestamp" DESC);

CREATE OR REPLACE VIEW public.unified_posts
WITH (security_invoker = true) AS
SELECT id, 'instagram'::text AS platform, post_url, caption, media_type,
       thumbnail_url, like_count, comments_count,
       COALESCE(share_count, 0) AS share_count, view_count,
       "timestamp", scrape_status, ai_analysis
FROM public.instagram_posts
UNION ALL
SELECT id, 'tiktok', post_url, caption, media_type,
       thumbnail_url, like_count, comments_count,
       COALESCE(share_count, 0), view_count,
       "timestamp", scrape_status, ai_analysis
FROM public.tiktok_posts
UNION ALL
SELECT id, 'facebook', post_url, caption, media_type,
       thumbnail_url, like_count, comments_count,
       COALESCE(share_count, 0), view_count,
       "timestamp", scrape_status, ai_analysis
FROM public.facebook_posts
UNION ALL
SELECT id, 'linkedin', post_url, caption, media_type,
       thumbnail_url, like_count, comments_count,
       COALESCE(share_count, 0), view_count,
       "timestamp", scrape_status, ai_analysis
FROM public.linkedin_posts
UNION ALL
SELECT id, 'youtube', post_url, caption, media_type,
       thumbnail_url, like_count, comments_count,
       COALESCE(share_count, 0), view_count,
       "timestamp", scrape_status, ai_analysis
FROM public.youtube_posts;

GRANT SELECT ON public.unified_posts TO authenticated;
GRANT ALL ON public.unified_posts TO service_role;

CREATE OR REPLACE FUNCTION public.get_platform_kpis(
  _start date DEFAULT (current_date - 30),
  _end   date DEFAULT current_date
)
RETURNS TABLE (
  platform text,
  posts bigint,
  total_likes bigint,
  total_comments bigint,
  total_shares bigint,
  total_views bigint,
  total_interactions bigint,
  avg_interactions_per_post numeric,
  follower_count integer,
  engagement_rate_pct numeric
)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT
    up.platform,
    COUNT(*)                                   AS posts,
    COALESCE(SUM(up.like_count), 0)            AS total_likes,
    COALESCE(SUM(up.comments_count), 0)        AS total_comments,
    COALESCE(SUM(up.share_count), 0)           AS total_shares,
    COALESCE(SUM(up.view_count), 0)            AS total_views,
    COALESCE(SUM(up.like_count + up.comments_count + up.share_count), 0) AS total_interactions,
    ROUND(COALESCE(AVG(up.like_count + up.comments_count + up.share_count), 0), 1) AS avg_interactions_per_post,
    ps.follower_count,
    CASE WHEN COALESCE(ps.follower_count, 0) > 0
      THEN ROUND(100.0 * SUM(up.like_count + up.comments_count + up.share_count)
                 / (COUNT(*) * ps.follower_count), 2)
      ELSE NULL
    END AS engagement_rate_pct
  FROM public.unified_posts up
  LEFT JOIN public.platform_settings ps ON ps.platform = up.platform
  WHERE up."timestamp" >= _start
    AND up."timestamp" < _end + 1
  GROUP BY up.platform, ps.follower_count
  ORDER BY total_interactions DESC;
$$;

CREATE OR REPLACE VIEW public.daily_engagement
WITH (security_invoker = true) AS
SELECT
  platform,
  ("timestamp" AT TIME ZONE 'America/Sao_Paulo')::date AS day,
  COUNT(*)                              AS posts,
  SUM(like_count)                       AS likes,
  SUM(comments_count)                   AS comments,
  SUM(share_count)                      AS shares,
  SUM(COALESCE(view_count, 0))          AS views,
  SUM(like_count + comments_count + share_count) AS interactions
FROM public.unified_posts
WHERE "timestamp" IS NOT NULL
GROUP BY platform, ("timestamp" AT TIME ZONE 'America/Sao_Paulo')::date;

GRANT SELECT ON public.daily_engagement TO authenticated;
GRANT ALL ON public.daily_engagement TO service_role;

CREATE OR REPLACE FUNCTION public.get_top_posts(
  _platform text DEFAULT NULL,
  _start date DEFAULT (current_date - 30),
  _end   date DEFAULT current_date,
  _limit int  DEFAULT 10
)
RETURNS SETOF public.unified_posts
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT *
  FROM public.unified_posts
  WHERE (_platform IS NULL OR platform = _platform)
    AND "timestamp" >= _start
    AND "timestamp" < _end + 1
  ORDER BY (like_count + comments_count + share_count) DESC
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.get_wow_growth()
RETURNS TABLE (
  platform text,
  this_week_interactions bigint,
  last_week_interactions bigint,
  growth_pct numeric
)
LANGUAGE sql STABLE SET search_path = public
AS $$
  WITH weekly AS (
    SELECT
      platform,
      SUM(interactions) FILTER (WHERE day >= current_date - 7)  AS this_week,
      SUM(interactions) FILTER (WHERE day >= current_date - 14
                                  AND day <  current_date - 7)  AS last_week
    FROM public.daily_engagement
    GROUP BY platform
  )
  SELECT
    platform,
    COALESCE(this_week, 0),
    COALESCE(last_week, 0),
    CASE WHEN COALESCE(last_week, 0) > 0
      THEN ROUND(100.0 * (COALESCE(this_week, 0) - last_week) / last_week, 1)
      ELSE NULL
    END
  FROM weekly
  ORDER BY platform;
$$;

CREATE OR REPLACE FUNCTION public.get_pipeline_health()
RETURNS TABLE (
  platform text,
  total_posts bigint,
  scraped bigint,
  pending bigint,
  failed bigint,
  last_scraped_at timestamptz,
  newest_post timestamptz,
  stale boolean
)
LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT
    platform,
    COUNT(*) AS total_posts,
    COUNT(*) FILTER (WHERE scrape_status = 'scraped') AS scraped,
    COUNT(*) FILTER (WHERE scrape_status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE scrape_status = 'failed')  AS failed,
    MAX("timestamp") FILTER (WHERE scrape_status = 'scraped') AS last_scraped_at,
    MAX("timestamp") AS newest_post,
    COALESCE(MAX("timestamp") < now() - interval '7 days', true) AS stale
  FROM public.unified_posts
  GROUP BY platform
  ORDER BY platform;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_kpis(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_posts(text, date, date, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wow_growth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pipeline_health() TO authenticated;