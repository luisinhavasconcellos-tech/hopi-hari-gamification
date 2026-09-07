# Security

This document describes the security layer of the Hopi Hari BI platform, how to
configure it, and the known residual risks. Report vulnerabilities privately to
the platform owner; do not open public issues with exploit details.

## Threat model

The platform is an internal executive dashboard. Its sensitive assets are:

- park sales, attendance and CRM aggregates (business-confidential);
- the MySQL/TiDB database, Google Drive service account, X API token and the
  Forge/LLM API key (credentials);
- daily briefing narrations and generated images in object storage.

Users authenticate with Supabase e-mail/password; every account starts as
`pending` and an administrator must approve it in **Gestão de Usuários**.

## Server-side controls (`server/_core/security.ts`)

| Control | What it does | Configuration |
| --- | --- | --- |
| Environment validation | Fails fast in production without `DATABASE_URL` or a `JWT_SECRET` of at least 16 chars; warns on weak settings. | `validateEnv()` at startup |
| Hardened headers | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, HSTS (HTTPS only), `Cache-Control: no-store` on `/api`. | always on |
| Content-Security-Policy | `default-src 'self'`, no inline/eval scripts, allow-listed Supabase / Graph API / Forge hosts, `frame-ancestors 'self'`. | `CSP_MODE`, `CSP_CONNECT_SRC`, `ALLOWED_FRAME_ANCESTORS` |
| CSRF origin guard | Cross-site `POST/PUT/PATCH/DELETE` to `/api/*` are rejected (403) unless the `Origin` is the app itself or in `ALLOWED_ORIGINS`. | `ALLOWED_ORIGINS` |
| CORS | No CORS by default (same-origin app). Allow-listed origins get credentialed CORS + preflight. | `ALLOWED_ORIGINS` |
| Rate limiting | Per-IP: 300 req/min on `/api`, 60 req/min on auth endpoints, 10 req/10 min on expensive sync/generate endpoints. `429` + `Retry-After`. | `TRUST_PROXY`, `RATE_LIMIT_DISABLED` |
| Body limits | 1 MB default; 30 MB only on the scheduled narration-audio callback. Oversized → 413, malformed → 400. | `BODY_LIMIT` |
| Session cookie | `HttpOnly`, `SameSite=Lax` (CSRF-safe), `Secure` on HTTPS; JWT audience (`appId`) verified; never signs with an empty secret. | `SESSION_COOKIE_SAME_SITE` |
| Storage proxy | Keys validated (no traversal); only top-level brand assets are public, everything under a directory requires an approved session. | `PUBLIC_STORAGE_PREFIXES` |
| Error handling | Route errors return generic messages; details (SQL, upstream URLs, stack traces) only go to server logs. Unknown `/api` routes answer JSON 404. | — |
| Audit log | Denied requests (401/403/429) are logged with method, path, IP and request id — never tokens or bodies. | — |
| Access management | Approvals and roles live in `platform_access` and are changed only through admin-only tRPC procedures with lock-out guards. | — |

## Client-side controls

- Route gating (`ProtectedRoute`) plus **server-side** enforcement: every tRPC
  procedure and REST route re-checks the Supabase token and the approval status.
- No secrets in the bundle: `VITE_*` variables are public. The Instagram app
  secret flow was removed from the client.
- Sign-out clears the react-query cache and session caches so the next user in
  the same tab never sees cached data.
- PDF/CSV exports neutralise spreadsheet formula injection.

## Secrets handling

- Never commit `.env`, `.project-config.json` or platform export archives.
  `scripts/check-secrets.mjs` runs in CI and blocks known credential patterns.
- **If a credential has ever been shared in an archive, screenshot or chat,
  rotate it**: database password, Google service-account key, Google OAuth
  client secret, Forge API keys, `JWT_SECRET`, X bearer token.
- Prefer short-lived, least-privilege credentials (a read-only DB user for the
  BI queries; a service account scoped to the campaign Drive folder).

## Known residual risks

1. **Supabase data project is read with the anon key from the browser.** The
   dashboard queries the data project directly; access is enforced by that
   project's Row Level Security, not by this server. If RLS allows `anon`
   reads, anyone with the (public) anon key can query those tables. Long-term
   fix: route data access through tRPC `protectedProcedure`s or issue
   per-user JWTs for the data project and lock RLS to `authenticated` +
   approved users.
2. `react-router-dom` 6 has published advisories that only affect SSR /
   `<Link>` with backslashes; the app is a pure SPA. Upgrade to v7 when the
   route tree is migrated.
3. Rate limiting is in-memory per process; behind multiple replicas the
   limits apply per replica.
4. `xlsx` (SheetJS 0.18.5 on npm) has unpatched prototype-pollution/ReDoS
   advisories; the patched builds are only distributed from cdn.sheetjs.com.
   It is used solely to parse TikTok export workbooks supplied by operators
   (never end-user uploads). Switch to the CDN build when the network policy
   allows it.

## Reporting

Contact the platform owner directly. Include steps to reproduce and impact.
