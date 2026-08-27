CREATE TABLE public.gender_audit_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  predicted_gender text NOT NULL CHECK (predicted_gender IN ('F','M','ND')),
  occurrences integer NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'base_clientes_com_idade',
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (first_name, source)
);

CREATE TABLE public.gender_audit_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL REFERENCES public.gender_audit_samples(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  predicted_gender text NOT NULL,
  actual_gender text NOT NULL CHECK (actual_gender IN ('F','M','ND')),
  is_correct boolean NOT NULL,
  reviewer text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gender_audit_reviews_sample ON public.gender_audit_reviews(sample_id);

GRANT SELECT ON public.gender_audit_samples TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gender_audit_samples TO authenticated;
GRANT ALL ON public.gender_audit_samples TO service_role;

GRANT SELECT, INSERT ON public.gender_audit_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gender_audit_reviews TO authenticated;
GRANT ALL ON public.gender_audit_reviews TO service_role;

ALTER TABLE public.gender_audit_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gender_audit_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gender_audit_samples_read" ON public.gender_audit_samples FOR SELECT USING (true);
CREATE POLICY "gender_audit_samples_update_review" ON public.gender_audit_samples FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "gender_audit_samples_admin_write" ON public.gender_audit_samples FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "gender_audit_samples_admin_delete" ON public.gender_audit_samples FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "gender_audit_reviews_read" ON public.gender_audit_reviews FOR SELECT USING (true);
CREATE POLICY "gender_audit_reviews_insert" ON public.gender_audit_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "gender_audit_reviews_admin_delete" ON public.gender_audit_reviews FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER trg_gender_audit_samples_updated
  BEFORE UPDATE ON public.gender_audit_samples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();