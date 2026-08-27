DROP POLICY IF EXISTS ci_weekly_input_select_auth ON public.ci_weekly_input;
CREATE POLICY ci_weekly_input_select_approved ON public.ci_weekly_input
  FOR SELECT TO authenticated USING (public.is_approved());

DROP POLICY IF EXISTS "Approved users can read business portfolio" ON public.distributor_business_portfolio;
CREATE POLICY "Admins can read business portfolio" ON public.distributor_business_portfolio
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE VIEW public.distributor_business_portfolio_safe
WITH (security_invoker = off) AS
SELECT distributor_name, client_name, city, segment, (cnpj IS NOT NULL) AS has_cnpj
FROM public.distributor_business_portfolio
WHERE public.is_approved();

REVOKE ALL ON public.distributor_business_portfolio_safe FROM anon;
GRANT SELECT ON public.distributor_business_portfolio_safe TO authenticated;
GRANT ALL ON public.distributor_business_portfolio_safe TO service_role;