DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cifra_diaria','classe_recompensa','codigo','concessao_manual','config','idempotencia','jogador','log_resgate','pool_dia','regra','serie_retirada','staff']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t || '_service_role', t);
  END LOOP;
END $$;