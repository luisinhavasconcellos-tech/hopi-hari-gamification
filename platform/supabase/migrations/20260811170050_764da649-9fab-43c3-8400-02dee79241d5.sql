CREATE TABLE public.customer_demographics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension text NOT NULL,
  bucket_key text NOT NULL,
  bucket_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  customers integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'base_clientes_idade',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dimension, bucket_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_demographics TO authenticated;
GRANT ALL ON public.customer_demographics TO service_role;

ALTER TABLE public.customer_demographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can read demographics"
  ON public.customer_demographics FOR SELECT TO authenticated
  USING (public.is_approved());

CREATE POLICY "Admins can insert demographics"
  ON public.customer_demographics FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update demographics"
  ON public.customer_demographics FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete demographics"
  ON public.customer_demographics FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE TRIGGER update_customer_demographics_updated_at
  BEFORE UPDATE ON public.customer_demographics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();