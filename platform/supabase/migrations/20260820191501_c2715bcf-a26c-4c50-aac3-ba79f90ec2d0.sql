DROP VIEW IF EXISTS public.distributor_business_portfolio_safe;

CREATE OR REPLACE FUNCTION public.get_business_portfolio_safe()
RETURNS TABLE(distributor_name text, client_name text, city text, segment text, has_cnpj boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.distributor_name, p.client_name, p.city, p.segment, (p.cnpj IS NOT NULL)
  FROM public.distributor_business_portfolio p
  WHERE public.is_approved();
$$;

REVOKE ALL ON FUNCTION public.get_business_portfolio_safe() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_portfolio_safe() TO authenticated, service_role;