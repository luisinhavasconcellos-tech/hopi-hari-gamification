CREATE TABLE public.customer_cpf_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_digit smallint NOT NULL UNIQUE,
  region_label text NOT NULL,
  states text[] NOT NULL DEFAULT '{}',
  registrations integer NOT NULL DEFAULT 0,
  registrations_2018_2019 integer NOT NULL DEFAULT 0,
  registrations_pos_2023 integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_cpf_regions TO authenticated;
GRANT ALL ON public.customer_cpf_regions TO service_role;

ALTER TABLE public.customer_cpf_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved can read cpf regions" ON public.customer_cpf_regions
  FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "admins insert cpf regions" ON public.customer_cpf_regions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins update cpf regions" ON public.customer_cpf_regions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admins delete cpf regions" ON public.customer_cpf_regions
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_customer_cpf_regions_updated_at
  BEFORE UPDATE ON public.customer_cpf_regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();