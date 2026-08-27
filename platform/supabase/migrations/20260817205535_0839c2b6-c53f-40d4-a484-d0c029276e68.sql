DROP INDEX IF EXISTS public.youtube_posts_video_id_uidx;
ALTER TABLE public.youtube_posts ADD CONSTRAINT youtube_posts_video_id_key UNIQUE (video_id);

CREATE TABLE IF NOT EXISTS public.social_content_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  metric text NOT NULL,
  format_label text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  source text NOT NULL DEFAULT 'meta_business_suite',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, metric, format_label, period_start, period_end)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_content_formats TO authenticated;
GRANT ALL ON public.social_content_formats TO service_role;
ALTER TABLE public.social_content_formats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view" ON public.social_content_formats FOR SELECT TO authenticated USING (is_approved());
CREATE POLICY "Admins can insert" ON public.social_content_formats FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update" ON public.social_content_formats FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admins can delete" ON public.social_content_formats FOR DELETE TO authenticated USING (is_admin());

CREATE TRIGGER social_content_formats_updated_at BEFORE UPDATE ON public.social_content_formats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();