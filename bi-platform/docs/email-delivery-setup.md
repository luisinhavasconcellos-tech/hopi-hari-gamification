# Production authentication email delivery

The live BI platform remains on Supabase project `ylduczowjvbtxixvakxx`. Its default Supabase mailer accepted the confirmation resend request but is restricted to project-team addresses and is not suitable for production delivery.

A dedicated Resend sending domain was created for authentication mail:

- Domain: `auth.hopihari.org`
- Region: `sa-east-1`
- TLS: enforced
- Tracking: disabled

Add these DNS records at the DNS provider for `hopihari.org`:

| Type | Name | Value | Priority |
|---|---|---|---:|
| TXT | `resend._domainkey.auth` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDzM2Q3ZpPSrw6pgt8rsg45UjQhXGDnEznjS5/r7wNJUW236JD/UCkWe8nv6rOBWI/PyIcdvNl1lwibL00OjUZ2OcxcljQjm5MGMj4+pOiMpUF2Pr3saIR2JUH0EeoKUKPgF8QmBmGZuSIgpJhUlUOi7ruhlQzhFQDWajgU4Ar4+wIDAQAB` | — |
| MX | `send.auth` | `feedback-smtp.sa-east-1.amazonses.com` | 10 |
| TXT | `send.auth` | `v=spf1 include:amazonses.com ~all` | — |

After DNS propagation, verify the domain in Resend. Then configure custom SMTP in the existing Supabase project with Resend's SMTP credentials and sender `Hopi Hari Inteligência <no-reply@auth.hopihari.org>`. Keep email confirmation enabled.
