-- 1) Consentimentos por identificador pseudonimizado
CREATE TABLE public.identity_consents (
  pseudonym_id text PRIMARY KEY,
  purposes text[] NOT NULL DEFAULT '{}',
  policy_version text NOT NULL DEFAULT 'v1',
  source text NOT NULL DEFAULT 'web',
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.identity_consents TO service_role;
ALTER TABLE public.identity_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read consents" ON public.identity_consents
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE TRIGGER update_identity_consents_updated_at
  BEFORE UPDATE ON public.identity_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Atributos agregáveis do identificador (sem CPF)
CREATE TABLE public.identity_segments (
  pseudonym_id text PRIMARY KEY REFERENCES public.identity_consents(pseudonym_id) ON DELETE CASCADE,
  age_group text,
  cpf_region_label text,
  cohort text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.identity_segments TO service_role;
ALTER TABLE public.identity_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read identity segments" ON public.identity_segments
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE TRIGGER update_identity_segments_updated_at
  BEFORE UPDATE ON public.identity_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Eventos comportamentais pseudonimizados, com retencao de 12 meses
CREATE TABLE public.behavior_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pseudonym_id text REFERENCES public.identity_consents(pseudonym_id) ON DELETE CASCADE,
  session_id text,
  event_name text NOT NULL,
  page_path text,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '12 months'
);

CREATE INDEX behavior_events_pseudonym_idx ON public.behavior_events (pseudonym_id);
CREATE INDEX behavior_events_occurred_idx ON public.behavior_events (occurred_at);
CREATE INDEX behavior_events_expires_idx ON public.behavior_events (expires_at);

GRANT ALL ON public.behavior_events TO service_role;
ALTER TABLE public.behavior_events ENABLE ROW LEVEL SECURITY;
-- sem policy para anon/authenticated: leitura apenas via visoes agregadas

-- 4) Visoes agregadas (unica superficie exposta ao app)
CREATE VIEW public.behavior_by_segment AS
  SELECT
    date_trunc('day', e.occurred_at)::date        AS day,
    e.event_name,
    COALESCE(s.age_group, 'nao informado')        AS age_group,
    COALESCE(s.cpf_region_label, 'nao informado') AS region,
    COALESCE(s.cohort, 'nao informado')           AS cohort,
    COUNT(*)                                      AS events,
    COUNT(DISTINCT e.session_id)                  AS sessions,
    COUNT(DISTINCT e.pseudonym_id)                AS identities
  FROM public.behavior_events e
  LEFT JOIN public.identity_segments s ON s.pseudonym_id = e.pseudonym_id
  GROUP BY 1, 2, 3, 4, 5
  HAVING COUNT(DISTINCT e.pseudonym_id) >= 1
  ORDER BY 1 DESC;

CREATE VIEW public.consent_summary AS
  SELECT
    COUNT(*)                                                        AS total_identities,
    COUNT(*) FILTER (WHERE granted_at IS NOT NULL AND revoked_at IS NULL) AS active_consents,
    COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)                  AS revoked_consents,
    MAX(granted_at)                                                 AS last_granted_at
  FROM public.identity_consents;

GRANT SELECT ON public.behavior_by_segment TO authenticated;
GRANT SELECT ON public.consent_summary TO authenticated;
GRANT SELECT ON public.behavior_by_segment TO service_role;
GRANT SELECT ON public.consent_summary TO service_role;

-- 5) Limpeza por retencao
CREATE OR REPLACE FUNCTION public.purge_expired_behavior_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted integer;
BEGIN
  DELETE FROM public.behavior_events WHERE expires_at < now();
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_behavior_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_behavior_events() TO service_role;