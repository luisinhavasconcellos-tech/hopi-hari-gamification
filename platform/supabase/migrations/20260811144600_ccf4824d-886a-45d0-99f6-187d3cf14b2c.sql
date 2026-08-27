CREATE TABLE public.customer_registrations_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  registrations integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'clientes-2018-2019.xlsx',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.customer_registrations_daily TO anon;
GRANT SELECT ON public.customer_registrations_daily TO authenticated;
GRANT ALL ON public.customer_registrations_daily TO service_role;

ALTER TABLE public.customer_registrations_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer registrations readable by anyone"
ON public.customer_registrations_daily FOR SELECT USING (true);

CREATE TRIGGER update_customer_registrations_daily_updated_at
BEFORE UPDATE ON public.customer_registrations_daily
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_customer_registrations_daily_date ON public.customer_registrations_daily(date);