-- Add YouTube Studio KPI columns to youtube_posts
ALTER TABLE public.youtube_posts
  ADD COLUMN IF NOT EXISTS watch_time_hours numeric,
  ADD COLUMN IF NOT EXISTS impressions integer,
  ADD COLUMN IF NOT EXISTS ctr numeric,
  ADD COLUMN IF NOT EXISTS subscribers_gained integer,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS video_id text;

CREATE UNIQUE INDEX IF NOT EXISTS youtube_posts_video_id_uidx ON public.youtube_posts(video_id) WHERE video_id IS NOT NULL;

-- Daily views per video (from "Dados do gráfico")
CREATE TABLE IF NOT EXISTS public.youtube_daily_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  date date NOT NULL,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, date)
);
ALTER TABLE public.youtube_daily_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily views readable by anyone" ON public.youtube_daily_views FOR SELECT USING (true);

-- Channel-level daily totals (from "Total")
CREATE TABLE IF NOT EXISTS public.youtube_channel_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.youtube_channel_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channel daily readable by anyone" ON public.youtube_channel_daily FOR SELECT USING (true);

-- Channel totals snapshot (from "Total" row of table CSV)
CREATE TABLE IF NOT EXISTS public.youtube_channel_totals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  views bigint NOT NULL DEFAULT 0,
  watch_time_hours numeric NOT NULL DEFAULT 0,
  subscribers_gained integer NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'youtube_studio_csv',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.youtube_channel_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Totals readable by anyone" ON public.youtube_channel_totals FOR SELECT USING (true);
