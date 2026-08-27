CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');
CREATE TYPE public.account_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  status public.account_status NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin'); $$;

CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'approved');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _is_first boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first;
  INSERT INTO public.profiles (id, email, full_name, status, approved_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    CASE WHEN _is_first THEN 'approved'::public.account_status ELSE 'pending' END,
    CASE WHEN _is_first THEN now() ELSE NULL END
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN _is_first THEN 'admin'::public.app_role ELSE 'viewer' END);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.protect_profile_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.status := OLD.status;
    NEW.approved_by := OLD.approved_by;
    NEW.approved_at := OLD.approved_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_approval();

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'instagram_posts', 'instagram_reports', 'instagram_insights',
    'tiktok_posts', 'linkedin_posts', 'facebook_posts', 'facebook_insights',
    'youtube_posts', 'youtube_daily_views', 'youtube_channel_daily',
    'youtube_channel_totals', 'platform_settings', 'daily_metrics', 'campaigns',
    'customer_registrations_daily', 'customer_registration_heatmap'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('CREATE POLICY "Approved users can read" ON public.%I FOR SELECT TO authenticated USING (public.is_approved())', t);
    EXECUTE format('CREATE POLICY "Admins can insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', t);
    EXECUTE format('CREATE POLICY "Admins can update" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin())', t);
    EXECUTE format('CREATE POLICY "Admins can delete" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t);
  END LOOP;
END $$;

INSERT INTO public.profiles (id, email, full_name, status, approved_at)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data ->> 'full_name', ''), 'approved', now()
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
       CASE WHEN u.id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
            THEN 'admin'::public.app_role ELSE 'viewer' END
FROM auth.users u
ON CONFLICT (user_id, role) DO NOTHING;

CREATE INDEX idx_profiles_status ON public.profiles(status) WHERE status = 'pending';