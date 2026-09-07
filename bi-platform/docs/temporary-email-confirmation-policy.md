# Temporary email-confirmation policy

Email confirmation is temporarily disabled on the user-owned Supabase authentication project `afqidjbyfrhtxheenhhp`. New accounts receive an authenticated session immediately, but application routes remain protected and organization access still depends on a separate `platform_access` approval record.

The existing Supabase project `ylduczowjvbtxixvakxx` remains the BI data source. This separation avoids migrating or duplicating operational data while allowing the account owner to control the temporary authentication policy.

To re-enable verification, turn **Confirm email** back on under **Authentication → Sign In / Providers** in project `afqidjbyfrhtxheenhhp`, complete the `auth.hopihari.org` Resend/Supabase SMTP setup, and restore the confirmation-pending interface only if the product requires explicit resend controls.
