REVOKE ALL ON FUNCTION public.purge_expired_behavior_events() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.purge_expired_behavior_events() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.purge_expired_behavior_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _deleted integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'apenas administradores podem executar o expurgo manual';
  END IF;
  SELECT events_deleted INTO _deleted FROM public.run_data_retention('manual');
  RETURN COALESCE(_deleted, 0);
END;
$function$;