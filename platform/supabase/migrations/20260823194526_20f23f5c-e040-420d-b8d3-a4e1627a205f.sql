
CREATE TABLE IF NOT EXISTS public.distributor_goal_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  goal_revenue numeric NOT NULL DEFAULT 0,
  realized_revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

GRANT SELECT ON public.distributor_goal_monthly TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_goal_monthly TO authenticated;
GRANT ALL ON public.distributor_goal_monthly TO service_role;

ALTER TABLE public.distributor_goal_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_all" ON public.distributor_goal_monthly
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage distributor goals insert" ON public.distributor_goal_monthly
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins manage distributor goals update" ON public.distributor_goal_monthly
  FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "admins manage distributor goals delete" ON public.distributor_goal_monthly
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TRIGGER update_distributor_goal_monthly_updated_at
  BEFORE UPDATE ON public.distributor_goal_monthly
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.distributor_goal_monthly (year, month, goal_revenue, realized_revenue) VALUES
(2023,1,114000,227688.38),(2023,2,213053.86,295518.89),(2023,3,778451.54,477273.92),
(2023,4,1122838.64,786750.67),(2023,5,2293000,1743966.18),(2023,6,2569000,1493671.11),
(2023,7,1171000,851629.83),(2023,8,1963368.41,1988603.72),(2023,9,7189577.45,2769560.19),
(2023,10,7623772.09,5364450.07),(2023,11,7623772.09,3739909.98),(2023,12,546079.66,674102.90),
(2024,1,348424.12,284523.68),(2024,2,400000,209793.32),(2024,3,661481.06,491881.59),
(2024,4,616000,680300),(2024,5,1965193.52,1052885.22),(2024,6,1740974.40,1551940.86),
(2024,7,1147414.78,925087.27),(2024,8,1613745.04,1983408.74),(2024,9,2585501.37,3659301.33),
(2024,10,6185525.57,8754303.79),(2024,11,1134170.65,2744874.38),(2024,12,884830,383327.70),
(2025,1,375326.98,379415.16),(2025,2,201295.50,188141.83),(2025,3,578580.50,691300),
(2025,4,725105.31,465890.54),(2025,5,1523386.69,1031951.47),(2025,6,1887642.85,1115134.98),
(2025,7,1084469.26,1221323.96),(2025,8,2386296.29,2623086.03),(2025,9,4468682.18,4672559.10),
(2025,10,9871907.04,10371328.92),(2025,11,2837420.55,2878182.61),(2025,12,1372829.17,1301835.05),
(2026,1,220572.51,250437.63),(2026,2,277559.30,276889.53),(2026,3,323688.67,439729.18),
(2026,4,428809.20,556094.97),(2026,5,1254198.97,817275.94),(2026,6,1895170.43,1629214.31),
(2026,7,1447444.97,487312.95),(2026,8,3486591.00,1561200.44),(2026,9,6207180.00,0),
(2026,10,12360040.00,0),(2026,11,3486591.00,0),(2026,12,2294760.17,0)
ON CONFLICT (year, month) DO UPDATE
  SET goal_revenue = EXCLUDED.goal_revenue, realized_revenue = EXCLUDED.realized_revenue;
