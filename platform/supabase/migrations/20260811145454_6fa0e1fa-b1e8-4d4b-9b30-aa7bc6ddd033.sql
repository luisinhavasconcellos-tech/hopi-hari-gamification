CREATE TABLE public.customer_registration_heatmap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday smallint NOT NULL,
  hour smallint NOT NULL,
  registrations integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'base-clientes',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (weekday, hour, source)
);

GRANT SELECT ON public.customer_registration_heatmap TO anon;
GRANT SELECT ON public.customer_registration_heatmap TO authenticated;
GRANT ALL ON public.customer_registration_heatmap TO service_role;

ALTER TABLE public.customer_registration_heatmap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Heatmap is publicly readable"
  ON public.customer_registration_heatmap FOR SELECT USING (true);

CREATE TRIGGER update_customer_registration_heatmap_updated_at
  BEFORE UPDATE ON public.customer_registration_heatmap
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();