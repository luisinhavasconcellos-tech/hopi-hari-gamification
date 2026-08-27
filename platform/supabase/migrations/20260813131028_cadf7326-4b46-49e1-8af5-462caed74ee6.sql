ALTER TABLE public.park_events
  ADD COLUMN IF NOT EXISTS ai_insights jsonb,
  ADD COLUMN IF NOT EXISTS insights_generated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.park_event_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  triggered_by text NOT NULL DEFAULT 'cron',
  scraped integer NOT NULL DEFAULT 0,
  saved integer NOT NULL DEFAULT 0,
  new_events integer NOT NULL DEFAULT 0,
  updated_events integer NOT NULL DEFAULT 0,
  insights_generated integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.park_event_sync_runs TO authenticated;
GRANT ALL ON public.park_event_sync_runs TO service_role;

ALTER TABLE public.park_event_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can read sync runs"
  ON public.park_event_sync_runs FOR SELECT TO authenticated
  USING (public.is_approved());