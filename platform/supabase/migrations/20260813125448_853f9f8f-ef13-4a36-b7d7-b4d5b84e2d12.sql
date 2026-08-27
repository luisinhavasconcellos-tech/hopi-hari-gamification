CREATE TABLE public.park_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text,
  start_date date,
  end_date date,
  image_url text,
  url text,
  highlight boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'site',
  raw_data jsonb,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.park_events TO authenticated;
GRANT ALL ON public.park_events TO service_role;

ALTER TABLE public.park_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view events"
  ON public.park_events FOR SELECT TO authenticated
  USING (public.is_approved());

CREATE POLICY "Admins can insert events"
  ON public.park_events FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update events"
  ON public.park_events FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete events"
  ON public.park_events FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE TRIGGER update_park_events_updated_at
  BEFORE UPDATE ON public.park_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX park_events_start_date_idx ON public.park_events (start_date DESC);