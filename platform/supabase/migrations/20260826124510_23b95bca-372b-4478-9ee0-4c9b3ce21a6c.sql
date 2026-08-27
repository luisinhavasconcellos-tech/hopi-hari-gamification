INSERT INTO public.website_sales_daily (sale_date, revenue, source) VALUES
('2026-08-01',248538.34,'relatorio-email'),('2026-08-02',128471.36,'relatorio-email'),('2026-08-03',126484.71,'relatorio-email'),
('2026-08-04',140815.73,'relatorio-email'),('2026-08-05',162860.02,'relatorio-email'),('2026-08-06',193238.20,'relatorio-email'),
('2026-08-07',208340.06,'relatorio-email'),('2026-08-08',583139.91,'relatorio-email'),('2026-08-09',223436.00,'relatorio-email'),
('2026-08-10',95362.16,'relatorio-email'),('2026-08-11',134843.15,'relatorio-email'),('2026-08-12',148967.29,'relatorio-email'),
('2026-08-13',188138.33,'relatorio-email'),('2026-08-14',256298.37,'relatorio-email'),('2026-08-15',186375.31,'relatorio-email'),
('2026-08-16',155850.23,'relatorio-email'),('2026-08-17',139332.06,'relatorio-email'),('2026-08-18',146722.66,'relatorio-email'),
('2026-08-19',167276.51,'relatorio-email'),('2026-08-20',347400.25,'relatorio-email'),('2026-08-21',550422.37,'relatorio-email'),
('2026-08-22',372864.27,'relatorio-email'),('2026-08-23',320891.67,'relatorio-email'),('2026-08-24',259999.96,'relatorio-email'),
('2026-08-25',270888.58,'relatorio-email')
ON CONFLICT (sale_date) DO UPDATE SET revenue = EXCLUDED.revenue, source = EXCLUDED.source, updated_at = now();

CREATE TABLE IF NOT EXISTS public.park_visitors_forecast (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  visitors integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'relatorio-email',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.park_visitors_forecast TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_visitors_forecast TO authenticated;
GRANT ALL ON public.park_visitors_forecast TO service_role;
ALTER TABLE public.park_visitors_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_all" ON public.park_visitors_forecast FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write park_visitors_forecast" ON public.park_visitors_forecast FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_park_visitors_forecast_updated BEFORE UPDATE ON public.park_visitors_forecast FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.park_visitors_forecast (date, visitors) VALUES
('2026-08-27',606),('2026-08-28',293),('2026-08-29',3631),('2026-08-30',8345),('2026-08-31',512),
('2026-09-03',156),('2026-09-04',166),('2026-09-05',1155),('2026-09-06',1443),('2026-09-07',350),
('2026-09-10',92),('2026-09-11',101),('2026-09-12',443),('2026-09-13',1331),('2026-09-14',148),
('2026-09-17',74),('2026-09-18',53),('2026-09-19',781),('2026-09-20',351),('2026-09-21',113),
('2026-09-24',57),('2026-09-25',46),('2026-09-26',595),('2026-09-27',958),('2026-09-28',26)
ON CONFLICT (date) DO UPDATE SET visitors = EXCLUDED.visitors, updated_at = now();