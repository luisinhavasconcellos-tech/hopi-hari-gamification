
CREATE OR REPLACE FUNCTION public.build_audience_aggregates(_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'window_days', GREATEST(COALESCE(_days, 30), 1),
    'demographics', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'dimension', dimension, 'bucket_key', bucket_key,
        'bucket_label', bucket_label, 'sort_order', sort_order,
        'customers', customers
      ) ORDER BY dimension, sort_order)
      FROM public.customer_demographics
    ), '[]'::jsonb),
    'cpf_regions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'region_digit', region_digit, 'region_label', region_label, 'states', states,
        'registrations', registrations,
        'registrations_2018_2019', registrations_2018_2019,
        'registrations_pos_2023', registrations_pos_2023
      ) ORDER BY registrations DESC)
      FROM public.customer_cpf_regions
    ), '[]'::jsonb),
    'registrations_daily', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', date, 'registrations', registrations) ORDER BY date)
      FROM public.customer_registrations_daily
    ), '[]'::jsonb),
    'heatmap', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('weekday', weekday, 'hour', hour, 'registrations', registrations)
             ORDER BY weekday, hour)
      FROM public.customer_registration_heatmap
    ), '[]'::jsonb),
    'behavior', COALESCE((
      SELECT jsonb_agg(to_jsonb(b))
      FROM public.get_behavior_by_segment(GREATEST(COALESCE(_days, 30), 1)) b
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'customers_with_age', COALESCE((
        SELECT SUM(customers) FROM public.customer_demographics WHERE dimension = 'age_group'), 0),
      'cpfs', COALESCE((SELECT SUM(registrations) FROM public.customer_cpf_regions), 0),
      'registrations', COALESCE((SELECT SUM(registrations) FROM public.customer_registrations_daily), 0)
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_behavior_by_segment(_days integer DEFAULT 30)
 RETURNS TABLE(day date, event_name text, age_group text, region text, cohort text, channel text, events bigint, sessions bigint, identities bigint)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT date_trunc('day', e.occurred_at)::date, e.event_name,
    COALESCE(s.age_group, 'nao informado'), COALESCE(s.cpf_region_label, 'nao informado'),
    COALESCE(s.cohort, 'nao informado'), COALESCE(e.channel, 'direto'),
    COUNT(*), COUNT(DISTINCT e.session_id), COUNT(DISTINCT e.pseudonym_id)
  FROM public.behavior_events e
  LEFT JOIN public.identity_segments s ON s.pseudonym_id = e.pseudonym_id
  WHERE e.occurred_at >= now() - make_interval(days => GREATEST(_days, 1))
  GROUP BY 1,2,3,4,5,6
  ORDER BY 1 DESC, 7 DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_consent_summary()
 RETURNS TABLE(total_identities bigint, active_consents bigint, revoked_consents bigint, last_granted_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE granted_at IS NOT NULL AND revoked_at IS NULL),
         COUNT(*) FILTER (WHERE revoked_at IS NOT NULL),
         MAX(granted_at)
  FROM public.identity_consents;
$function$;

CREATE OR REPLACE FUNCTION public.get_reputation_summary(_days integer DEFAULT 90)
 RETURNS TABLE(source text, reviews bigint, negatives bigint, positives bigint, neutrals bigint, avg_rating numeric, answered bigint, answer_rate_pct numeric, avg_response_hours numeric, resolved_rate_pct numeric)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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
  WHERE (r.published_at IS NULL OR r.published_at >= now() - make_interval(days => GREATEST(COALESCE(_days, 90), 1)))
  GROUP BY r.source
  ORDER BY r.source;
$function$;

CREATE OR REPLACE FUNCTION public.get_business_portfolio_safe()
 RETURNS TABLE(distributor_name text, client_name text, city text, segment text, has_cnpj boolean)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT p.distributor_name, p.client_name, p.city, p.segment, (p.cnpj IS NOT NULL)
  FROM public.distributor_business_portfolio p;
$function$;

CREATE OR REPLACE FUNCTION public.get_audience_aggregates(_days integer DEFAULT 30, _ttl_minutes integer DEFAULT 15)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
DECLARE
  _key text := 'audience:' || GREATEST(COALESCE(_days, 30), 1);
  _payload jsonb;
BEGIN
  SELECT payload INTO _payload FROM public.segment_aggregate_cache
  WHERE cache_key = _key AND expires_at > now();
  IF _payload IS NOT NULL THEN RETURN _payload || jsonb_build_object('cached', true); END IF;
  _payload := public.build_audience_aggregates(_days);
  BEGIN
    INSERT INTO public.segment_aggregate_cache (cache_key, payload, computed_at, expires_at)
    VALUES (_key, _payload, now(), now() + make_interval(mins => GREATEST(COALESCE(_ttl_minutes, 15), 1)))
    ON CONFLICT (cache_key) DO UPDATE
      SET payload = EXCLUDED.payload, computed_at = EXCLUDED.computed_at, expires_at = EXCLUDED.expires_at;
  EXCEPTION WHEN insufficient_privilege OR others THEN
    NULL;
  END;
  RETURN _payload || jsonb_build_object('cached', false);
END $function$;
