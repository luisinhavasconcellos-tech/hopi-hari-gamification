# Hopi Hari BI Platform — Final Live Validation Plan

## Goal

Complete the final release validation for the permanent, protected Hopi Hari BI platform at `https://hopihari.org/`, using the already-approved account only for a controlled browser session. Confirm that the deployed dashboard renders authenticated operational data, verify the Operational Pulse component against the normalized database, and capture safe evidence for the daily Portuguese voice-briefing schedule and persisted audio artifact. Do not expose, log, commit, or write the supplied password to project files.

## Current state

The platform is already deployed as a managed full-stack application with React, Express, tRPC, MySQL/Drizzle, Supabase authentication, normalized operational tables, the protected dashboard, and the daily briefing workflow. The imported production facts include the three Google Sheets and the 27 August 2026 18:00, 19:00, and 20:00 revenue/attendance snapshots. The latest checkpoint is `c4f86701`; the permanent domains are `hopihari.org`, `www.hopihari.org`, and the managed `manus.space` domain.

Automated validation already passed: TypeScript checks, production build, 66 tests, focused Operational Pulse rendering with an authenticated mock session, the full protected-route contract, and anonymous rejection of `/api/operational/summary`. The database contains an audio-backed 27 August briefing record and an active `America/Sao_Paulo` daily schedule. The remaining gap is real authenticated browser evidence plus directly captured scheduled-run evidence.

## Execution phases after approval

### 1. Authenticate in the already-open browser

Use the live Hopi Hari login page at `https://hopihari.org/` and the existing approved account. Enter the password only into the browser’s password field, not into shell commands, files, logs, chat, or source code. If the browser session cannot complete login, stop and request a user takeover rather than attempting to bypass authentication.

### 2. Validate the protected dashboard visually and functionally

After login, open the main dashboard and verify that the authenticated shell, Hopi Hari 2025 branding, Fraunces typography, semantic green/cream/gold tokens, sidebar/navigation, and responsive layout render correctly. Confirm the new **Operational Pulse** card is visible and displays the latest normalized figures: 27 August 2026 gross revenue of R$ 937,958.35, attendance of 4,772, current in-park count of 3,769, and the reconciled source count. Verify that the data is loaded from the protected endpoint and that no credentials or sensitive tokens are exposed in the browser.

Capture a screenshot or browser observation of the authenticated dashboard for internal validation only. Do not publish credentials or attach sensitive browser artifacts in the final handoff.

### 3. Validate protected briefing access and audio playback

Open the Daily Briefing page from authenticated navigation. Confirm that the latest report is available in Portuguese, the report history is visible, the audio control is present when an audio artifact exists, and the audio endpoint remains protected. Confirm that direct anonymous access to the dashboard, briefing, and operational summary continues to redirect or return an authorization failure.

### 4. Capture scheduled-agent evidence safely

Inspect the live scheduled-task execution history for the task named `Briefing diário de voz · Hopi Hari`, using the platform’s owner-level schedule/history controls. Capture only safe metadata: task name, enabled status, `America/Sao_Paulo` timezone, 07:00 local schedule, execution timestamp, success/skipped/failed status, report date, and audio-ready result. Never reveal the task cookie, connector credentials, audio base64, or password.

If the live schedule has no successful run record, use the platform’s supported Run Now control only after confirming the current release is deployed. If Run Now is unavailable, do not modify the permanent schedule or create a duplicate schedule; report the limitation and retain the existing 07:00 schedule. When a callback succeeds, query the briefing record read-only and confirm `audio_url`, `audio_key`, `audio_generated_at`, and duration metadata are populated.

### 5. Final quality gate and release checkpoint

Run the complete TypeScript check, full test suite, and production build again after all implementation changes. Confirm the managed server is healthy, the permanent domains return the Hopi Hari application shell, the protected API returns 401 without a session, and no new runtime errors appear after restart. Mark only genuinely completed checklist items as complete in `todo.md`.

Read `todo.md` before saving the final checkpoint. Save a final checkpoint only after the real dashboard session and scheduled-run evidence are captured, with a concise message documenting the validated release. Return the permanent website URL and the checkpoint reference in the final handoff.

## Test plan

| Area | Validation | Expected result |
|---|---|---|
| Authentication | Login using the approved account in the live browser | Session is established without email-confirmation blocking |
| Route protection | Anonymous requests to `/`, dashboard, briefing, and operational summary | Redirect to `/auth` or return 401/403; no data leakage |
| Dashboard | Authenticated visual check | Operational Pulse renders current revenue, attendance, in-park, and source reconciliation values |
| Briefing | Authenticated page and history check | Portuguese report, highlights, freshness, history, and audio state are visible |
| Audio | Authenticated playback endpoint | Persisted narration is reachable only with a valid session; metadata is present |
| Scheduler | Live task history or safe Run Now | Existing daily 07:00 Brasília schedule remains active and a safe success record is captured |
| Regression | `pnpm check`, `pnpm test`, `pnpm build` | All checks pass; no blocking runtime/build errors |
| Deployment | Permanent domain checks | `hopihari.org` and `www.hopihari.org` serve the current deployed release |

## Assumptions

The approved email account remains authorized in `platform_access`, the latest checkpoint is deployed to the permanent domains, and the browser is already positioned on the Hopi Hari login page. The supplied password is treated as transient authentication input and will not be persisted. The intended schedule remains daily at 07:00 in `America/Sao_Paulo`; no permanent schedule change is required.

## Open risks and handling

The platform’s AGENT schedule history may not be exposed through the local heartbeat CLI; if so, use the owner management view or report the limitation rather than guessing. The custom domain may be subject to cache propagation; compare it with the managed domain and allow the deployment to settle before treating a transient mismatch as an application failure. If login requires a CAPTCHA, MFA, or another personal-information step, stop and request browser takeover. If the audio callback fails, preserve the existing report and do not fabricate an audio artifact; record the safe error and leave the schedule unchanged.
