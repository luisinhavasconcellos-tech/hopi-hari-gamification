REVOKE EXECUTE ON FUNCTION
  public.audit_identity_consents(),
  public.audit_retention_policies(),
  public.handle_new_user(),
  public.protect_profile_approval(),
  public.update_updated_at_column()
FROM PUBLIC, anon, authenticated;