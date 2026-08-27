CREATE TABLE public.school_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_name text,
  uf text NOT NULL,
  municipality text NOT NULL,
  network text NOT NULL,
  schools integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (uf, municipality, network, distributor_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_portfolio TO authenticated;
GRANT ALL ON public.school_portfolio TO service_role;
ALTER TABLE public.school_portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can read school portfolio" ON public.school_portfolio FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "Admins can insert school portfolio" ON public.school_portfolio FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update school portfolio" ON public.school_portfolio FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete school portfolio" ON public.school_portfolio FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_school_portfolio_updated_at BEFORE UPDATE ON public.school_portfolio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_school_portfolio_distributor ON public.school_portfolio (distributor_name);
CREATE INDEX idx_school_portfolio_uf ON public.school_portfolio (uf);