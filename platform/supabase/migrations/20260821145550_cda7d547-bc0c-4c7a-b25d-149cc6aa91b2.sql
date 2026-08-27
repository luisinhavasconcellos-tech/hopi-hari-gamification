DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname AS tbl
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t.tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS "public_read_all" ON public.%I', t.tbl);
    EXECUTE format('CREATE POLICY "public_read_all" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t.tbl);
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.get_platform_kpis(date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_top_posts(text, date, date, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_wow_growth() TO anon;
GRANT EXECUTE ON FUNCTION public.get_pipeline_health() TO anon;
GRANT EXECUTE ON FUNCTION public.get_reputation_summary(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_business_portfolio_safe() TO anon;
GRANT EXECUTE ON FUNCTION public.get_consent_summary() TO anon;
GRANT EXECUTE ON FUNCTION public.get_behavior_by_segment(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.build_audience_aggregates(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_audience_aggregates(integer, integer) TO anon;

CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT true $$;

CREATE OR REPLACE FUNCTION public.get_consent_summary()
RETURNS TABLE(total_identities bigint, active_consents bigint, revoked_consents bigint, last_granted_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE granted_at IS NOT NULL AND revoked_at IS NULL),
         COUNT(*) FILTER (WHERE revoked_at IS NOT NULL),
         MAX(granted_at)
  FROM public.identity_consents;
$$;

CREATE OR REPLACE FUNCTION public.get_behavior_by_segment(_days integer DEFAULT 30)
RETURNS TABLE(day date, event_name text, age_group text, region text, cohort text, channel text, events bigint, sessions bigint, identities bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT date_trunc('day', e.occurred_at)::date, e.event_name,
    COALESCE(s.age_group, 'nao informado'), COALESCE(s.cpf_region_label, 'nao informado'),
    COALESCE(s.cohort, 'nao informado'), COALESCE(e.channel, 'direto'),
    COUNT(*), COUNT(DISTINCT e.session_id), COUNT(DISTINCT e.pseudonym_id)
  FROM public.behavior_events e
  LEFT JOIN public.identity_segments s ON s.pseudonym_id = e.pseudonym_id
  WHERE e.occurred_at >= now() - make_interval(days => GREATEST(_days, 1))
  GROUP BY 1,2,3,4,5,6
  ORDER BY 1 DESC, 7 DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_audience_aggregates(_days integer DEFAULT 30, _ttl_minutes integer DEFAULT 15)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _key text := 'audience:' || GREATEST(COALESCE(_days, 30), 1);
  _payload jsonb;
BEGIN
  SELECT payload INTO _payload FROM public.segment_aggregate_cache
  WHERE cache_key = _key AND expires_at > now();
  IF _payload IS NOT NULL THEN RETURN _payload || jsonb_build_object('cached', true); END IF;
  _payload := public.build_audience_aggregates(_days);
  INSERT INTO public.segment_aggregate_cache (cache_key, payload, computed_at, expires_at)
  VALUES (_key, _payload, now(), now() + make_interval(mins => GREATEST(COALESCE(_ttl_minutes, 15), 1)))
  ON CONFLICT (cache_key) DO UPDATE
    SET payload = EXCLUDED.payload, computed_at = EXCLUDED.computed_at, expires_at = EXCLUDED.expires_at;
  RETURN _payload || jsonb_build_object('cached', false);
END $$;