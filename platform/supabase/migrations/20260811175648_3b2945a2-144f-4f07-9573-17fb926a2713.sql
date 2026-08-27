ALTER TABLE public.behavior_events ADD COLUMN IF NOT EXISTS channel text;

CREATE INDEX IF NOT EXISTS behavior_events_channel_idx ON public.behavior_events (channel);

DROP FUNCTION IF EXISTS public.get_behavior_by_segment(integer);

CREATE OR REPLACE FUNCTION public.get_behavior_by_segment(_days integer DEFAULT 30)
RETURNS TABLE(
  day date,
  event_name text,
  age_group text,
  region text,
  cohort text,
  channel text,
  events bigint,
  sessions bigint,
  identities bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    date_trunc('day', e.occurred_at)::date,
    e.event_name,
    COALESCE(s.age_group, 'nao informado'),
    COALESCE(s.cpf_region_label, 'nao informado'),
    COALESCE(s.cohort, 'nao informado'),
    COALESCE(e.channel, 'direto'),
    COUNT(*),
    COUNT(DISTINCT e.session_id),
    COUNT(DISTINCT e.pseudonym_id)
  FROM public.behavior_events e
  LEFT JOIN public.identity_segments s ON s.pseudonym_id = e.pseudonym_id
  WHERE public.is_admin()
    AND e.occurred_at >= now() - make_interval(days => GREATEST(_days, 1))
  GROUP BY 1, 2, 3, 4, 5, 6
  ORDER BY 1 DESC, 7 DESC;
$function$;