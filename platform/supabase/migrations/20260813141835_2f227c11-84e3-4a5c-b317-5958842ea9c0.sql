-- Tighten RLS on tables that allowed any signed-in user
DROP POLICY IF EXISTS "competitor auth read" ON public.competitor_snapshot;
DROP POLICY IF EXISTS "competitor auth write" ON public.competitor_snapshot;
CREATE POLICY "competitor approved read" ON public.competitor_snapshot FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "competitor admin write" ON public.competitor_snapshot FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "follower_daily auth read" ON public.follower_daily;
DROP POLICY IF EXISTS "follower_daily auth write" ON public.follower_daily;
CREATE POLICY "follower_daily approved read" ON public.follower_daily FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "follower_daily admin write" ON public.follower_daily FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "goal_cycle auth read" ON public.goal_cycle;
DROP POLICY IF EXISTS "goal_cycle auth write" ON public.goal_cycle;
CREATE POLICY "goal_cycle approved read" ON public.goal_cycle FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "goal_cycle admin write" ON public.goal_cycle FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "weekly_insight auth read" ON public.weekly_insight;
DROP POLICY IF EXISTS "weekly_insight auth write" ON public.weekly_insight;
CREATE POLICY "weekly_insight approved read" ON public.weekly_insight FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "weekly_insight admin write" ON public.weekly_insight FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Remove anonymous EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_my_access() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_approved() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.build_audience_aggregates(integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_data_retention(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.write_audit_log(text, text, text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_audience_aggregates(integer, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_behavior_by_segment(integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_consent_summary() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_reputation_summary(integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.invalidate_audience_aggregates() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_expired_behavior_events() FROM anon, PUBLIC;