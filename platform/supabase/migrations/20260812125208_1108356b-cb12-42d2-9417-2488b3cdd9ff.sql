CREATE OR REPLACE FUNCTION public.get_my_access()
RETURNS TABLE (
  status public.account_status,
  roles public.app_role[],
  email text,
  full_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _is_first boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _uid) THEN
    SELECT u.email INTO _email FROM auth.users u WHERE u.id = _uid;
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first;

    INSERT INTO public.profiles (id, email, full_name, status, approved_at)
    VALUES (
      _uid,
      COALESCE(_email, ''),
      '',
      CASE WHEN _is_first THEN 'approved'::public.account_status ELSE 'pending' END,
      CASE WHEN _is_first THEN now() ELSE NULL END
    )
    ON CONFLICT (id) DO NOTHING;

    IF _is_first THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  SELECT _uid, 'viewer'::public.app_role
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _uid);

  RETURN QUERY
  SELECT
    p.status,
    COALESCE(ARRAY(SELECT r.role FROM public.user_roles r WHERE r.user_id = _uid), '{}'::public.app_role[]),
    p.email,
    p.full_name
  FROM public.profiles p
  WHERE p.id = _uid;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_my_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_access() TO authenticated;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() AND status = 'pending');
  END IF;
END $pol$;