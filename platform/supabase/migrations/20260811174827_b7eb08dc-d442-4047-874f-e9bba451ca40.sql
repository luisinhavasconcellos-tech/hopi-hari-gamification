DROP VIEW IF EXISTS public.behavior_by_segment;
DROP VIEW IF EXISTS public.consent_summary;

CREATE OR REPLACE FUNCTION public.get_behavior_by_segment(_days integer DEFAULT 30)
RETURNS TABLE(day date, event_name text, age_group text, region text, cohort text,
              events bigint, sessions bigint, identities bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    date_trunc('day', e.occurred_at)::date,
    e.event_name,
    COALESCE(s.age_group, 'nao informado'),
    COALESCE(s.cpf_region_label, 'nao informado'),
    COALESCE(s.cohort, 'nao informado'),
    COUNT(*),
    COUNT(DISTINCT e.session_id),
    COUNT(DISTINCT e.pseudonym_id)
  FROM public.behavior_events e
  LEFT JOIN public.identity_segments s ON s.pseudonym_id = e.pseudonym_id
  WHERE public.is_admin()
    AND e.occurred_at >= now() - make_interval(days => GREATEST(_days, 1))
  GROUP BY 1, 2, 3, 4, 5
  ORDER BY 1 DESC, 6 DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_consent_summary()
RETURNS TABLE(total_identities bigint, active_consents bigint,
              revoked_consents bigint, last_granted_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE granted_at IS NOT NULL AND revoked_at IS NULL),
    COUNT(*) FILTER (WHERE revoked_at IS NOT NULL),
    MAX(granted_at)
  FROM public.identity_consents
  WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.get_behavior_by_segment(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_consent_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_behavior_by_segment(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_consent_summary() TO authenticated, service_role;