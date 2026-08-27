CREATE TABLE public.distributor_business_portfolio (
  id uuid primary key default gen_random_uuid(),
  distributor_name text not null,
  client_name text not null,
  cnpj text,
  contact text,
  phone text,
  city text,
  segment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (distributor_name, client_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_business_portfolio TO authenticated;
GRANT ALL ON public.distributor_business_portfolio TO service_role;
ALTER TABLE public.distributor_business_portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can read business portfolio" ON public.distributor_business_portfolio FOR SELECT TO authenticated USING (is_approved());
CREATE POLICY "Admins can insert business portfolio" ON public.distributor_business_portfolio FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update business portfolio" ON public.distributor_business_portfolio FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete business portfolio" ON public.distributor_business_portfolio FOR DELETE TO authenticated USING (is_admin());
CREATE TRIGGER trg_dbp_updated BEFORE UPDATE ON public.distributor_business_portfolio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();