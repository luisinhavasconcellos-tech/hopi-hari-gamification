-- 1) Revoke execution of all SECURITY DEFINER functions from anon/authenticated by default
REVOKE EXECUTE ON FUNCTION
  public.has_role(uuid, public.app_role),
  public.is_admin(),
  public.is_approved(),
  public.write_audit_log(text, text, text, jsonb),
  public.build_audience_aggregates(integer),
  public.get_audience_aggregates(integer, integer),
  public.invalidate_audience_aggregates(),
  public.get_behavior_by_segment(integer),
  public.get_consent_summary(),
  public.get_reputation_summary(integer),
  public.purge_expired_behavior_events(),
  public.run_data_retention(text)
FROM PUBLIC, anon, authenticated;

-- 2) Re-grant only the functions the signed-in app actually calls
GRANT EXECUTE ON FUNCTION
  public.get_audience_aggregates(integer, integer),
  public.invalidate_audience_aggregates(),
  public.get_behavior_by_segment(integer),
  public.get_consent_summary(),
  public.get_reputation_summary(integer),
  public.purge_expired_behavior_events()
TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.has_role(uuid, public.app_role),
  public.is_admin(),
  public.is_approved(),
  public.write_audit_log(text, text, text, jsonb),
  public.build_audience_aggregates(integer),
  public.get_audience_aggregates(integer, integer),
  public.invalidate_audience_aggregates(),
  public.get_behavior_by_segment(integer),
  public.get_consent_summary(),
  public.get_reputation_summary(integer),
  public.run_data_retention(text)
TO service_role;

-- 3) Prevent self-approval / privilege escalation on profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    public.is_admin()
    OR (
      status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid())
      AND approved_by IS NOT DISTINCT FROM (SELECT p.approved_by FROM public.profiles p WHERE p.id = auth.uid())
      AND approved_at IS NOT DISTINCT FROM (SELECT p.approved_at FROM public.profiles p WHERE p.id = auth.uid())
    )
  )
);

-- keep the defensive trigger that reverts privileged columns for non-admins
DROP TRIGGER IF EXISTS protect_profile_approval ON public.profiles;
CREATE TRIGGER protect_profile_approval
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_approval();