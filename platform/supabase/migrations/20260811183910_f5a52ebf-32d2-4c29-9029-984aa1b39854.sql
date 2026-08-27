CREATE TABLE public.reputation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('reclame_aqui','tripadvisor')),
  external_id text NOT NULL,
  url text,
  title text,
  body text,
  author text,
  rating numeric,
  status text,
  category text,
  location text,
  sentiment text CHECK (sentiment IN ('positivo','neutro','negativo')),
  sentiment_score numeric,
  ai_summary text,
  published_at timestamptz,
  responded_at timestamptz,
  response_time_hours numeric,
  resolved boolean NOT NULL DEFAULT false,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reputation_reviews TO authenticated;
GRANT ALL ON public.reputation_reviews TO service_role;

ALTER TABLE public.reputation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aprovados podem ver reputacao" ON public.reputation_reviews
  FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "Admins gerenciam reputacao insert" ON public.reputation_reviews
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins gerenciam reputacao update" ON public.reputation_reviews
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins gerenciam reputacao delete" ON public.reputation_reviews
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_reputation_reviews_updated_at
  BEFORE UPDATE ON public.reputation_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reputation_reviews_source_date ON public.reputation_reviews (source, published_at DESC);

CREATE OR REPLACE FUNCTION public.get_reputation_summary(_days integer DEFAULT 90)
RETURNS TABLE(
  source text,
  reviews bigint,
  negatives bigint,
  positives bigint,
  neutrals bigint,
  avg_rating numeric,
  answered bigint,
  answer_rate_pct numeric,
  avg_response_hours numeric,
  resolved_rate_pct numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.source,
    COUNT(*),
    COUNT(*) FILTER (WHERE r.sentiment = 'negativo'),
    COUNT(*) FILTER (WHERE r.sentiment = 'positivo'),
    COUNT(*) FILTER (WHERE r.sentiment = 'neutro'),
    ROUND(AVG(r.rating)::numeric, 2),
    COUNT(*) FILTER (WHERE r.responded_at IS NOT NULL),
    ROUND(100.0 * COUNT(*) FILTER (WHERE r.responded_at IS NOT NULL) / NULLIF(COUNT(*), 0), 1),
    ROUND(AVG(r.response_time_hours)::numeric, 1),
    ROUND(100.0 * COUNT(*) FILTER (WHERE r.resolved) / NULLIF(COUNT(*), 0), 1)
  FROM public.reputation_reviews r
  WHERE public.is_approved()
    AND (r.published_at IS NULL OR r.published_at >= now() - make_interval(days => GREATEST(COALESCE(_days, 90), 1)))
  GROUP BY r.source
  ORDER BY r.source;
$$;