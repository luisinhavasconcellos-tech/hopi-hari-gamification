-- Atrações
CREATE TABLE public.park_attraction_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attraction text NOT NULL,
  area text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  rides integer NOT NULL DEFAULT 0,
  penetration_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attraction, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_attraction_monthly TO authenticated;
GRANT ALL ON public.park_attraction_monthly TO service_role;
ALTER TABLE public.park_attraction_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can read attractions" ON public.park_attraction_monthly FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "Admins can insert attractions" ON public.park_attraction_monthly FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update attractions" ON public.park_attraction_monthly FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete attractions" ON public.park_attraction_monthly FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_park_attraction_monthly_updated_at BEFORE UPDATE ON public.park_attraction_monthly FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Público do parque
CREATE TABLE public.park_public_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  visitors integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_public_monthly TO authenticated;
GRANT ALL ON public.park_public_monthly TO service_role;
ALTER TABLE public.park_public_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can read park public" ON public.park_public_monthly FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "Admins can insert park public" ON public.park_public_monthly FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update park public" ON public.park_public_monthly FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete park public" ON public.park_public_monthly FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_park_public_monthly_updated_at BEFORE UPDATE ON public.park_public_monthly FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Canais de venda (mapa de catraca)
CREATE TABLE public.sales_channel_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_channel_monthly TO authenticated;
GRANT ALL ON public.sales_channel_monthly TO service_role;
ALTER TABLE public.sales_channel_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can read sales channels" ON public.sales_channel_monthly FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "Admins can insert sales channels" ON public.sales_channel_monthly FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update sales channels" ON public.sales_channel_monthly FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete sales channels" ON public.sales_channel_monthly FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_sales_channel_monthly_updated_at BEFORE UPDATE ON public.sales_channel_monthly FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Distribuidores
CREATE TABLE public.distributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_key text NOT NULL UNIQUE,
  name text NOT NULL,
  code text,
  region text,
  phone text,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributors TO authenticated;
GRANT ALL ON public.distributors TO service_role;
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can read distributors" ON public.distributors FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "Admins can insert distributors" ON public.distributors FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update distributors" ON public.distributors FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete distributors" ON public.distributors FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_distributors_updated_at BEFORE UPDATE ON public.distributors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vendas por distribuidor
CREATE TABLE public.distributor_sales_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_key text NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  quantity integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  goal_quantity integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (distributor_key, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_sales_monthly TO authenticated;
GRANT ALL ON public.distributor_sales_monthly TO service_role;
ALTER TABLE public.distributor_sales_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can read distributor sales" ON public.distributor_sales_monthly FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "Admins can insert distributor sales" ON public.distributor_sales_monthly FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update distributor sales" ON public.distributor_sales_monthly FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete distributor sales" ON public.distributor_sales_monthly FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_distributor_sales_monthly_updated_at BEFORE UPDATE ON public.distributor_sales_monthly FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();