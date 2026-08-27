-- 1) Tabelas de governança de retenção
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  key text PRIMARY KEY,
  description text NOT NULL,
  retention_months integer NOT NULL CHECK (retention_months > 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_retention_policies TO authenticated;
GRANT ALL ON public.data_retention_policies TO service_role;

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retention policies readable by admins"
  ON public.data_retention_policies FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "retention policies managed by admins"
  ON public.data_retention_policies FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_data_retention_policies_updated_at
  BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.data_retention_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  events_deleted integer NOT NULL DEFAULT 0,
  segments_deleted integer NOT NULL DEFAULT 0,
  consents_deleted integer NOT NULL DEFAULT 0,
  triggered_by text NOT NULL DEFAULT 'cron'
);

GRANT SELECT ON public.data_retention_runs TO authenticated;
GRANT ALL ON public.data_retention_runs TO service_role;

ALTER TABLE public.data_retention_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retention runs readable by admins"
  ON public.data_retention_runs FOR SELECT TO authenticated
  USING (public.is_admin());

INSERT INTO public.data_retention_policies (key, description, retention_months)
VALUES
  ('behavior_events', 'Eventos comportamentais pseudonimizados', 12),
  ('identity_segments', 'Junções pseudonimizadas (faixa etária, região, coorte)', 12),
  ('identity_consents', 'Registros de consentimento sem atividade', 12)
ON CONFLICT (key) DO NOTHING;

-- 2) Rotina de expurgo completa (eventos + junções + consentimentos)
CREATE OR REPLACE FUNCTION public.purge_expired_behavior_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _deleted integer;
BEGIN
  SELECT events_deleted INTO _deleted FROM public.run_data_retention('manual');
  RETURN COALESCE(_deleted, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.run_data_retention(_triggered_by text DEFAULT 'cron')
RETURNS TABLE(events_deleted integer, segments_deleted integer, consents_deleted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _events integer := 0;
  _segments integer := 0;
  _consents integer := 0;
  _months_events integer;
  _months_segments integer;
  _months_consents integer;
BEGIN
  SELECT retention_months INTO _months_events
    FROM public.data_retention_policies WHERE key = 'behavior_events' AND enabled;
  SELECT retention_months INTO _months_segments
    FROM public.data_retention_policies WHERE key = 'identity_segments' AND enabled;
  SELECT retention_months INTO _months_consents
    FROM public.data_retention_policies WHERE key = 'identity_consents' AND enabled;

  -- eventos vencidos (TTL gravado na linha) ou fora da janela de retenção
  DELETE FROM public.behavior_events
  WHERE expires_at < now()
     OR (_months_events IS NOT NULL
         AND occurred_at < now() - make_interval(months => _months_events));
  GET DIAGNOSTICS _events = ROW_COUNT;

  -- junções pseudonimizadas sem eventos remanescentes e sem consentimento ativo
  IF _months_segments IS NOT NULL THEN
    DELETE FROM public.identity_segments s
    WHERE s.updated_at < now() - make_interval(months => _months_segments)
      AND NOT EXISTS (SELECT 1 FROM public.behavior_events e WHERE e.pseudonym_id = s.pseudonym_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.identity_consents c
        WHERE c.pseudonym_id = s.pseudonym_id
          AND c.granted_at IS NOT NULL AND c.revoked_at IS NULL
          AND c.granted_at >= now() - make_interval(months => _months_segments)
      );
    GET DIAGNOSTICS _segments = ROW_COUNT;
  END IF;

  -- consentimentos revogados há mais de 30 dias, ou concedidos há mais de N meses sem atividade
  IF _months_consents IS NOT NULL THEN
    DELETE FROM public.identity_consents c
    WHERE NOT EXISTS (SELECT 1 FROM public.behavior_events e WHERE e.pseudonym_id = c.pseudonym_id)
      AND NOT EXISTS (SELECT 1 FROM public.identity_segments s WHERE s.pseudonym_id = c.pseudonym_id)
      AND (
        (c.revoked_at IS NOT NULL AND c.revoked_at < now() - interval '30 days')
        OR (c.revoked_at IS NULL
            AND COALESCE(c.granted_at, c.created_at) < now() - make_interval(months => _months_consents))
      );
    GET DIAGNOSTICS _consents = ROW_COUNT;
  END IF;

  INSERT INTO public.data_retention_runs (events_deleted, segments_deleted, consents_deleted, triggered_by)
  VALUES (_events, _segments, _consents, COALESCE(_triggered_by, 'cron'));

  RETURN QUERY SELECT _events, _segments, _consents;
END;
$function$;

REVOKE ALL ON FUNCTION public.run_data_retention(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.run_data_retention(text) TO service_role;

-- 3) Agendamento diário (quando pg_cron estiver disponível)
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron indisponivel: %', SQLERRM;
    RETURN;
  END;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-data-retention';
  PERFORM cron.schedule(
    'daily-data-retention',
    '0 3 * * *',
    $cron$SELECT public.run_data_retention('cron');$cron$
  );
END;
$$;