CREATE TABLE IF NOT EXISTS public.segment_aggregate_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);

GRANT SELECT ON public.segment_aggregate_cache TO authenticated;
GRANT ALL ON public.segment_aggregate_cache TO service_role;

ALTER TABLE public.segment_aggregate_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved users read aggregate cache"
  ON public.segment_aggregate_cache FOR SELECT TO authenticated
  USING (public.is_approved());

CREATE INDEX IF NOT EXISTS segment_aggregate_cache_expires_idx
  ON public.segment_aggregate_cache (expires_at);

CREATE OR REPLACE FUNCTION public.build_audience_aggregates(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public.build_audience_aggregates(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.build_audience_aggregates(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.get_audience_aggregates(_days integer DEFAULT 30, _ttl_minutes integer DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _key text := 'audience:' || GREATEST(COALESCE(_days, 30), 1);
  _payload jsonb;
BEGIN
  IF NOT public.is_approved() THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;

  SELECT payload INTO _payload
  FROM public.segment_aggregate_cache
  WHERE cache_key = _key AND expires_at > now();

  IF _payload IS NOT NULL THEN
    RETURN _payload || jsonb_build_object('cached', true);
  END IF;

  _payload := public.build_audience_aggregates(_days);

  INSERT INTO public.segment_aggregate_cache (cache_key, payload, computed_at, expires_at)
  VALUES (_key, _payload, now(), now() + make_interval(mins => GREATEST(COALESCE(_ttl_minutes, 15), 1)))
  ON CONFLICT (cache_key) DO UPDATE
    SET payload = EXCLUDED.payload,
        computed_at = EXCLUDED.computed_at,
        expires_at = EXCLUDED.expires_at;

  RETURN _payload || jsonb_build_object('cached', false);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_audience_aggregates(integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_audience_aggregates(integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.invalidate_audience_aggregates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _n integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'apenas administradores podem limpar o cache';
  END IF;
  DELETE FROM public.segment_aggregate_cache;
  GET DIAGNOSTICS _n = ROW_COUNT;
  INSERT INTO public.audit_logs (action, area, details, actor_id, actor_kind)
  VALUES ('cache_invalidado', 'agregacoes', jsonb_build_object('entradas', _n), auth.uid(), 'user');
  RETURN _n;
END;
$function$;

REVOKE ALL ON FUNCTION public.invalidate_audience_aggregates() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.invalidate_audience_aggregates() TO authenticated, service_role;