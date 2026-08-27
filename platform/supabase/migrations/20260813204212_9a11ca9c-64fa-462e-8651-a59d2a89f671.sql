CREATE TABLE public.crm_leads_geo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uf text NOT NULL,
  city text NOT NULL,
  leads integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'rd_station',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (uf, city, source)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads_geo TO authenticated;
GRANT ALL ON public.crm_leads_geo TO service_role;
ALTER TABLE public.crm_leads_geo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_geo_select" ON public.crm_leads_geo FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "crm_geo_insert" ON public.crm_leads_geo FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "crm_geo_update" ON public.crm_leads_geo FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "crm_geo_delete" ON public.crm_leads_geo FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER trg_crm_geo_updated BEFORE UPDATE ON public.crm_leads_geo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crm_lead_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension text NOT NULL,
  bucket_key text NOT NULL,
  bucket_label text NOT NULL,
  leads integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'rd_station',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dimension, bucket_key, source)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_lead_dimensions TO authenticated;
GRANT ALL ON public.crm_lead_dimensions TO service_role;
ALTER TABLE public.crm_lead_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_dim_select" ON public.crm_lead_dimensions FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "crm_dim_insert" ON public.crm_lead_dimensions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "crm_dim_update" ON public.crm_lead_dimensions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "crm_dim_delete" ON public.crm_lead_dimensions FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER trg_crm_dim_updated BEFORE UPDATE ON public.crm_lead_dimensions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();