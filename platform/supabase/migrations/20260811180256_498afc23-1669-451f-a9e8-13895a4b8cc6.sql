CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  area text NOT NULL,
  record_ref text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  actor_kind text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit logs readable by admins"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.write_audit_log(
  _action text, _area text, _record_ref text DEFAULT NULL, _details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_logs (action, area, record_ref, details, actor_id, actor_kind)
  VALUES (_action, _area, _record_ref, COALESCE(_details, '{}'::jsonb), auth.uid(),
          CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END);
END;
$function$;

REVOKE ALL ON FUNCTION public.write_audit_log(text, text, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, text, jsonb) TO service_role;

-- trigger: consentimentos
CREATE OR REPLACE FUNCTION public.audit_identity_consents()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'consentimento_concedido';
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'consentimento_excluido';
  ELSIF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    _action := 'consentimento_revogado';
  ELSE
    _action := 'consentimento_atualizado';
  END IF;

  INSERT INTO public.audit_logs (action, area, record_ref, details, actor_id, actor_kind)
  VALUES (
    _action,
    'identidade',
    left(COALESCE(NEW.pseudonym_id, OLD.pseudonym_id), 12) || '…',
    jsonb_build_object(
      'purposes', COALESCE(NEW.purposes, OLD.purposes),
      'policy_version', COALESCE(NEW.policy_version, OLD.policy_version),
      'source', COALESCE(NEW.source, OLD.source)
    ),
    auth.uid(),
    CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS audit_identity_consents ON public.identity_consents;
CREATE TRIGGER audit_identity_consents
  AFTER INSERT OR UPDATE OR DELETE ON public.identity_consents
  FOR EACH ROW EXECUTE FUNCTION public.audit_identity_consents();

-- trigger: políticas de retenção
CREATE OR REPLACE FUNCTION public.audit_retention_policies()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_logs (action, area, record_ref, details, actor_id, actor_kind)
  VALUES (
    'politica_retencao_alterada', 'retencao', NEW.key,
    jsonb_build_object('de_meses', OLD.retention_months, 'para_meses', NEW.retention_months,
                       'ativa', NEW.enabled),
    auth.uid(), CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS audit_retention_policies ON public.data_retention_policies;
CREATE TRIGGER audit_retention_policies
  AFTER UPDATE ON public.data_retention_policies
  FOR EACH ROW WHEN (OLD.retention_months IS DISTINCT FROM NEW.retention_months
                     OR OLD.enabled IS DISTINCT FROM NEW.enabled)
  EXECUTE FUNCTION public.audit_retention_policies();

-- rotina de retenção passa a auditar e a limpar os próprios logs
INSERT INTO public.data_retention_policies (key, description, retention_months)
VALUES ('audit_logs', 'Logs de auditoria de dados pessoais', 24)
ON CONFLICT (key) DO NOTHING;

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
  _logs integer := 0;
  _months_events integer;
  _months_segments integer;
  _months_consents integer;
  _months_logs integer;
BEGIN
  SELECT retention_months INTO _months_events
    FROM public.data_retention_policies WHERE key = 'behavior_events' AND enabled;
  SELECT retention_months INTO _months_segments
    FROM public.data_retention_policies WHERE key = 'identity_segments' AND enabled;
  SELECT retention_months INTO _months_consents
    FROM public.data_retention_policies WHERE key = 'identity_consents' AND enabled;
  SELECT retention_months INTO _months_logs
    FROM public.data_retention_policies WHERE key = 'audit_logs' AND enabled;

  DELETE FROM public.behavior_events
  WHERE expires_at < now()
     OR (_months_events IS NOT NULL
         AND occurred_at < now() - make_interval(months => _months_events));
  GET DIAGNOSTICS _events = ROW_COUNT;

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

  IF _months_logs IS NOT NULL THEN
    DELETE FROM public.audit_logs
    WHERE created_at < now() - make_interval(months => _months_logs);
    GET DIAGNOSTICS _logs = ROW_COUNT;
  END IF;

  INSERT INTO public.data_retention_runs (events_deleted, segments_deleted, consents_deleted, triggered_by)
  VALUES (_events, _segments, _consents, COALESCE(_triggered_by, 'cron'));

  INSERT INTO public.audit_logs (action, area, details, actor_id, actor_kind)
  VALUES ('expurgo_executado', 'retencao',
          jsonb_build_object('eventos', _events, 'juncoes', _segments,
                             'consentimentos', _consents, 'logs', _logs,
                             'origem', COALESCE(_triggered_by, 'cron')),
          auth.uid(), CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END);

  RETURN QUERY SELECT _events, _segments, _consents;
END;
$function$;

REVOKE ALL ON FUNCTION public.run_data_retention(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.run_data_retention(text) TO service_role;