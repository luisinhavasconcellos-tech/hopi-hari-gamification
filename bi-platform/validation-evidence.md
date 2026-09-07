# Final Validation Evidence

## Authenticated dashboard

A real browser session authenticated successfully at the managed live preview using the approved platform account. The browser reached `/dashboard` and rendered the protected application shell, the Hopi Hari 2025 visual system, the authenticated user identity, sidebar navigation, and the **Pulso do parque** Operational Pulse section.

The rendered Operational Pulse values matched the normalized production database snapshot for 27 August 2026 at 20:00: gross revenue `R$ 937.958`, public count `4.772`, current in-park count `3.769`, internal per-capita `R$ 76`, internal revenue `R$ 361.783`, and `4/4 fontes reconciliadas`. The live dashboard also showed the aggregated audience figure `3.006.848`.

## Route and deployment checks

The anonymous root route redirected to `/auth` before authentication. The anonymous operational summary endpoint returned HTTP 401. Permanent-domain checks returned HTTP 200 with the Hopi Hari page title for `https://hopihari.org/`, `https://www.hopihari.org/`, and the managed `manus.space` domain. After the current checkpoint was published, the managed preview served the full dashboard rather than the earlier blank custom-domain shell.

## Automated quality gates

The final release gate passed `pnpm check`, `pnpm test`, and `pnpm build`. The complete suite reported `8` test files and `66` passing tests. The focused Operational Pulse test verified authenticated request headers and rendered normalized metrics; the operational integrity tests verified source reconciliation, channel totals, attendance values, and idempotency behavior.

## Scheduled briefing persistence

The active schedule is `Briefing diário de voz · Hopi Hari`, configured for `0 0 7 * * *` UTC with timezone `America/Sao_Paulo`, and is enabled. A read-only database check confirmed a persisted ready briefing for 27 August 2026 with managed audio metadata: `daily-briefings/2026-08-27/narration_e5a4c21a.wav`, an authenticated `/manus-storage/` URL, and an audio-generated timestamp. The owner-level AGENT execution-history record is not exposed by the local `manus-heartbeat` CLI; the release leaves the schedule unchanged rather than fabricating a run record or creating a duplicate schedule.

## Authenticated Daily Briefing page

The authenticated browser session also reached `/briefing` successfully. The page displayed the Portuguese executive briefing for 28 August 2026, the report freshness/model label, 9/10 source status, history entries for 28 and 27 August, the `Ouvir briefing` control, and the persisted narration player. The report visibly referenced the normalized operational values and correctly preserved unavailable-source states for X credentials and website order counts.

The live dashboard and briefing pages were validated on the managed preview after the release checkpoint. The supplied password was used only as transient browser input and was not written to this evidence file.

## Playback check

From the authenticated briefing page, the narration control was activated. The page uses a browser-voice/player interaction rather than a persistent `<audio>` element in the DOM, so a direct DOM audio-element probe returned no elements. The report and narration controls remained visible; further endpoint-level playback evidence will rely on authenticated network/resource inspection and the persisted database metadata, not on an invented playback result.

## Authenticated audio endpoint and schedule

Using the same bearer-session mechanism as the application, the persisted narration endpoint for briefing record `1` returned HTTP `200` with `audio/wav` and a 3,469,484-byte response. The earlier cookie-only probe correctly returned HTTP `401`, confirming that audio access is protected by the application bearer session rather than an ambient browser cookie.

The active AGENT schedule status reported one enabled task named `Briefing diário de voz · Hopi Hari`, cron `0 0 7 * * *`, timezone `America/Sao_Paulo`, and a non-null `lastExecutedAt` of `2026-08-28T13:54:53.489Z`. The local CLI does not expose the AGENT run outcome/history body, so the evidence records the trigger timestamp and the independently verified persisted audio artifact without asserting an unavailable outcome field.

## Permanent-domain authenticated validation

The authenticated session was verified directly on `https://hopihari.org/`. Navigating to `/auth` with the established session resolved to `/dashboard`, where the full protected dashboard rendered with the Operational Pulse values. Navigating to `https://hopihari.org/briefing` also rendered the protected Portuguese Daily Briefing page with history and narration controls. This confirms the current checkpoint is serving the application on the permanent custom domain, not only on the managed preview URL.

## Drive campaign integration validation

The authenticated permanent page `https://hopihari.org/audience/campaigns` rendered the synchronized Google Drive banner, the six-hour cadence label, last synchronization time `28/08/2026, 15:57:53` Brasília, 19 combined campaign records, 435 creative assets, 112 videos, and Drive-backed campaign cards including `Vai Brasil`. The 19 total consists of 18 active folders from the authoritative `Hopi Hari.Monks` Drive root plus one legacy Supabase campaign retained by the merge logic.

The permanent anonymous API check against `https://hopihari.org/api/campaigns` returned HTTP `401` with `Authentication required`. An unauthenticated POST to `https://hopihari.org/api/scheduled/campaign-drive-sync` returned HTTP `403` with a cron-cookie permission error, proving that the scheduled callback is deployed and protected rather than missing.

The project-level Heartbeat `hopi-hari-drive-campaign-sync` is enabled with task UID `5XTWhDoVknbgSN2VDzqizt`, callback `/api/scheduled/campaign-drive-sync`, and approved cron `0 0 4,10,16,22 * * *`. The project Management UI reported **Success**, a `100%` success rate, `1/1` runs, zero failures, and a thirty-second duration. The expanded production response at 16:14 returned `{ ok: true }` with run ID `90001`, root `Hopi Hari.Monks`, 18 folders, 435 assets, zero inserts, 18 metadata updates, zero rejections, and no warnings. This proves the deployed six-hour callback executed successfully and preserved unchanged asset cardinality.

## Cross-platform comparison validation

The comparison feature is mounted in the protected dashboard and uses semantic Hopi Hari tokens. Desktop and mobile preview captures both reached the authentication portal for `/dashboard`, confirming the protected route boundary remains active. The comparison component defines responsive layout contracts: platform summary cards collapse below the medium breakpoint, filter controls stack on narrow screens, and the comparison table is wrapped in horizontal overflow rather than forcing a narrow viewport. Client tests cover date changes, platform toggles, protected query parameters, and explicit `Indisponível` rendering.

## Comparison UI responsive verification

The preview confirmed that `/dashboard` remains behind the authentication gate at desktop and mobile sizes. The comparison component’s responsive contracts are explicit in source: summary cards use a medium-breakpoint grid, filter controls wrap/stack on narrow screens, and the metric table uses horizontal overflow. A rendered authenticated-panel screenshot still requires an approved Hopi Hari browser session; no unauthenticated visual claim is being made for protected data.

## Preview access diagnosis

The managed preview at `https://3000-iuumcfcve8wsgxba4oogy-2b262667.us2.manus.computer/` returned HTTP 200 for `/`, `/auth`, and `/dashboard`. The development server was running without browser-console errors or runtime startup failures. The dashboard route remained behind the authentication boundary, so a blank or stalled browser view is consistent with session/browser state rather than a missing deployment.

The direct managed-preview URL and sign-in steps were sent to the user. The permanent production URL remains `https://hopihari.org/`. No application code, dependencies, database schema, or deployment configuration changed during this diagnosis; therefore the existing 101-test, TypeScript, and production-build quality gate remains the applicable code-validation result. Route protection was preserved.

## Authenticated DashboardPage runtime recovery

The authenticated managed preview reproduced the dashboard-only failure. After the legacy Instagram requests completed, React cleared the root because `TiktokMetricsPanel` called a tRPC hook without a `trpc.Provider`. A temporary global `ErrorBoundary` exposed the exact stack instead of leaving the page blank. The application root now keeps that boundary, `App.tsx` provides the shared tRPC client and React Query cache, and protected tRPC requests reuse the active approved Supabase bearer session through the existing server access policy.

The comparison query also rejected valid dates because its route validator matched literal backslash characters rather than ISO digits. The validator now accepts `YYYY-MM-DD`. In a real authenticated browser session, `/dashboard` rendered the full sidebar, Operational Pulse, TikTok panel, cross-platform filters and data, KPI cards, charts, AI section, and recent posts. No route protection was removed or weakened.

## Segments/Gender Audit reorganization — pre-publication check

On 2026-08-29, the authenticated permanent-domain browser session opened `/audience/segments` successfully and rendered the existing Segments analytics. The browser still showed the standalone `Auditoria de Gênero` sidebar entry and did not yet show the new embedded section, confirming that the deployed domain remained on the prior checkpoint before this change was published. No visual claim about the new embedded section is made from this pre-publication capture.

## Segments/Gender Audit reorganization — managed preview check

On 2026-08-29, the authenticated managed preview rendered `/audience/segments` with the Segmentos analytics followed by the embedded `Qualidade de dados` / `Auditoria de Gênero` section, including the 348-sample queue, review controls, accuracy summary, confusion matrix, prioritized errors, and feedback history. The sidebar no longer displayed a standalone Gender Audit entry. Navigating to the former `/audience/gender-audit` path resolved to `/audience/segments#gender-audit`, preserving a protected compatibility destination.

## Hopi Informe closing and Hora do Horror strategy

The supplied Hopi Informe batch was parsed without warnings and reconciled to five revenue snapshots and one attendance snapshot: the 27 August 2026 23:59 close, and the 28 August 08:00, 09:00, 10:00, and 11:00 revenue readings plus the 10:00 attendance reading. The importer completed with 58 updated lineage-preserving records, zero rejected records, and no replacement of another source; a second execution returned `content_hash_already_imported`, confirming idempotency. The 27 August 23:59 closing values are gross revenue `R$ 1.011.112,51`, internal revenue `R$ 372.751,44`, and external revenue `R$ 638.361,07`. The 28 August 10:00 attendance composition was `653` public, `580` paying, and `73` complimentary visitors.

The new protected `Hora do Horror` workspace within **Estratégia IA** performs a Pearson correlation only between daily closing revenue and the platform’s closest available intent signal: Facebook and Instagram link clicks, and TikTok profile visits. The current production data provides two shared days for Facebook and Instagram and one for TikTok, below the seven-day minimum, so every coefficient is intentionally withheld. The workspace instead exposes the coverage gap, adds UTM/content/CTA/period instrumentation guidance, and states that correlation does not establish causality. Anonymous navigation to `/growth` redirected to the protected access portal. The release passed TypeScript, 30 test files with 116 tests, and the production build.

## Hopi Informe — atualização operacional de 28 a 30/08

The supplied follow-up Hopi Informe batch parsed without warnings into four revenue and three attendance snapshots. The idempotent importer completed with 55 records seen, 39 inserted, 16 updated, zero rejected, and no records preserved from a higher-priority source; re-running the same content returned `content_hash_already_imported`. Reconciled revenue readings include 28 August 20:00 gross revenue `R$ 1.295.784,61`, 29 August 23:00 gross revenue `R$ 1.537.426,95`, and 30 August 23:00 gross revenue `R$ 1.556.972,80`. The 28 August 23:00 reading is preserved alongside the later 23:59 snapshot, so the existing latest close for that date remains the 23:59 observation rather than being overwritten by an earlier reading.

The additional operational coverage does not create new shared social days because the available Facebook and Instagram daily data still end on 28 August and TikTok daily data ends on 27 August. The protected Hora do Horror panel therefore continues to report two shared days for Facebook and Instagram and one for TikTok, below the seven-day correlation minimum, and continues to withhold coefficients. The data-refresh quality gate passed TypeScript, 30 test files with 116 tests, and the production build; no one-off import, test, or build process remained active.

## Hora do Horror official campaign registry

The database now contains the non-destructive `hora_do_horror_campaigns` and `hora_do_horror_creatives` tables, both initially empty by design: no campaign dates or creatives were invented or seeded. The protected Dashboard section exposes the official registry, current edition/creative totals, a link to the correlation workspace, a viewer-safe read-only state, and administrator-only forms for campaign-window and creative registration. Each entry records its source label plus the creator/updater identity; campaign windows reject inverted dates, and creative records are idempotent by campaign, creative name, and publication date.

The correlation service now restricts all measurement pairs to dates within official registered campaign windows. Its verified empty-registry response has zero campaign scope and zero observed correlation days, which is correct until an administrator records the official Hora do Horror period. The router tests confirm protected reads, administrator-only writes, and server-side date validation. Dashboard registry tests confirm read-only viewer rendering, administrator form submission, and safe error rendering. TypeScript, 32 test files with 122 tests, and the production build passed; only the intended TypeScript watch process remains active.

## Google Sheet follower integration

The provided public spreadsheet `Hopi weekly tracker` was inspected at the supplied URL. Its `Log Diário` sheet contains daily follower totals for Instagram, TikTok, Facebook, YouTube, and LinkedIn, plus aggregate total, 3M goal, and per-platform daily deltas. The read-only public CSV export was used because the available gws OAuth context returned invalid credentials; the source spreadsheet was not modified.

The source was registered as `google_sheet:hopi-weekly-tracker-followers` with the spreadsheet ID, source URL, and sheet name. The imported batch contains 425 observations covering 2026-06-02 through 2026-08-25, with five rows inserted, 420 existing rows reconciled/updated, zero rejections, and zero warnings. Re-running the identical batch returned `content_hash_already_imported`, confirming idempotency. Existing Hopi Hari profiles were mapped to all five sheet platforms: Instagram, TikTok, Facebook, YouTube, and LinkedIn.

The protected `socialFollowers` query now exposes the normalized follower history across all platforms. The shared `Crescimento de seguidores` component and the all-platform `Seguidores` page use this source, identify it as `Google Sheet · Log Diário`, and retain a transparent empty state for a platform without imported rows. Regression coverage confirms protected access and rendering for Instagram, TikTok, YouTube, and LinkedIn. TypeScript, 34 test files with 128 tests, and the production build passed. The existing TypeScript watch process remains active by design; no follower import process remains active.

## Periodic follower-sheet synchronization

The follower-sheet integration now includes a production Heartbeat callback at `/api/scheduled/follower-sheet-sync`, a protected administrator manual sync endpoint, and a six-hour UTC cadence contract (`0 0 */6 * * *`). The callback authenticates cron requests through the platform SDK, resolves the operational source by `taskUid`, skips orphaned or disabled jobs with a 2xx response, fetches the read-only Google Sheets CSV export, validates dates and follower counts, and records idempotent import runs with source lineage and safe failure metadata.

The normalized source status is exposed to protected users and the all-platform follower page now displays the last completed sync or an explicit waiting state. The new parser, cadence, protected access, and UI coverage passed. Full quality gate: TypeScript passed, 35 test files with 131 tests passed, and the production build completed. The project-level Heartbeat job has not yet been created because the scheduling guidance requires the deployed callback to be confirmed before activating it; the durable task UID column and persistence helper are ready for that final activation step.

### Production activation

After explicit user confirmation, the project-level follower-sheet Heartbeat was created, enabled, and bound to the official operational source through its durable task UID. Its production callback is `/api/scheduled/follower-sheet-sync`, the cron is `0 0 */6 * * *`, and the next confirmed execution is 2026-09-01T00:00:00Z. The job is visible as enabled in the project schedule inventory. A temporary one-minute verification cadence did not produce a logged run during the short propagation window, so it was restored immediately to six hours; no duplicate or temporary schedule remains.

## Campaign-to-sales correlation

The protected Campaigns workspace now contains a dedicated `Campanhas × Vendas` tab. The server joins synchronized Drive campaigns and the official Hora do Horror registry to daily closing revenue, normalized ticket-channel revenue, attendance, paying visitors, and average ticket. It compares the registered campaign window with up to seven prior operating days inside a 14-day lookback, excludes baseline dates covered by other registered campaigns, and reports a separate D+7 observation window. Results are released only with at least three campaign days and three baseline days; direct attribution remains explicitly unavailable without UTM or campaign-code evidence.

Live validation found 18 synchronized Drive campaigns, four closing-sales days from 2026-08-27 through 2026-08-30, and no registered date windows on the Drive campaigns. Therefore all 18 campaigns correctly return `missing_dates`, no uplift or Pearson coefficient is displayed, and the administrator form is available to register confirmed periods without inferring dates from folder names. The page remains login-protected and its former campaign analytics remain intact. The full release passed TypeScript, 38 test files with 137 tests, and the production build; no one-off probe, import, test, or build process remains active.

## User-uploaded campaign archive verification

Seven user-supplied ZIP archives were inspected as manifests only; no embedded file was executed and no archive was extracted into the deployed application. Each had exactly one safe top-level campaign directory and only expected image or video assets. The packages matched the existing Google Drive campaign inventory exactly: `Spoiler night HDH26` (8 images), `Hora do Horror 8.8` (12 images), `Invasão I.A.R.A` (12 images), `Feriado 7 de setembro` (12 images), `Hopi Dia x Noite` (5 videos), `Quinzena dos Tikitos` (12 images and 15 videos), and `Hora do Horror 2026` (12 images and 21 videos).

The campaign catalog already contained all seven campaigns and their 109 individual synchronized asset rows. Rather than duplicating media binaries, the import recorded seven SHA-256-unique provenance entries in `campaign_archive_imports`, each with `verified_match` status, matched-asset counts, and file-type totals. The protected Campaigns page now presents a clear archive-verification panel with the seven source packages, 109 corresponding creatives, 56 images, and 41 videos. It states explicitly that archive verification does not infer official dates or attribute sales; campaign-period registration and UTM/campaign codes remain required for the commercial correlation. The release passed TypeScript, 39 test files with 139 tests, and the production build; no one-off importer or validation process remains active.

## Weekly Hopi Hari 360° executive report

The Dashboard and Audience Overview no longer export long screenshots of the current page. Both invoke a single protected `weekly360Report.get` contract and produce a dedicated vector PDF with native text, tables, bars, metadata, chapter headers, page numbering, and embedded official Fraunces display fonts.

The report uses a rolling seven-day window ending on the latest operational date. Its chapters cover operational closings, revenue composition, attendance, paying and complimentary visitors, sales channels, monthly commercial context, distributor goals, Facebook/Instagram/TikTok listening, five-platform follower history and goals, demographics, CRM, reputation, Drive campaigns, uploaded archive provenance, campaign-sales evidence, Hora do Horror, the latest daily briefing, persisted global Instagram analysis, executive actions, risks, source freshness, and methodology. Missing values remain explicit and all correlation and attribution rules remain conservative. Demo-only strategy and bot estimates are excluded from the executive document.

A real report was generated from connected data for 24–30 August 2026. It contains 13 A4 pages, vector-extractable text, title/subject/author metadata, and the deterministic filename `hopi-hari-relatorio-360-semana-2026-08-24-a-2026-08-30.pdf`. Visual review confirmed clear typography, A4 margins, readable tables, consistent Hopi Hari green/cream/gold branding, unobstructed footers, and no clipping or overlap after the final strategy-page adjustment. The live contract returned four revenue days, four attendance days, five follower platforms, three detailed social platforms, 18 campaigns, seven verified archive imports, and 14 of 15 ready data sources; partial-week and missing-X-credential conditions are disclosed in the PDF.

The final gate passed TypeScript, 42 test files with 143 tests, and the production build. The active TypeScript watch processes belong to the managed development server; no one-off render, probe, Vitest, or build process remains active.

## Uploaded code revision — 01/09/2026

The user-supplied archive `hopiharibiplatformcodeatualizado20260901.zip` passed ZIP integrity checks and contained 464 source-oriented entries with no environment files, credentials, dependency folders, build outputs, Git metadata, native executables, or shell scripts. It was extracted only into an isolated review directory and was not executed before inspection.

Comparison against published version `0449cc7f` found one incoming documentation file, one managed runtime file present only in production, and 14 changed shared files. Ten meaningful source, documentation, and test files were merged selectively: the latest-snapshot competitor follower fix, the in-window follower baseline fix for the weekly report, the campaign-correlation digest and expanded narration rules for the daily briefing, premium Brazilian Portuguese voice direction, and portable guards for database-, credential-, and fixture-dependent integration tests. The incoming changelog was preserved as `docs/changelog-revisao-2026-09-01.md`.

Generated or project-owned files were intentionally not replaced: `package-lock.json`, `tsconfig.app.tsbuildinfo`, `tsconfig.node.tsbuildinfo`, `todo.md`, and `client/public/__manus__/debug-collector.js`. During validation, the live Drive integration legitimately discovered three new assets on its first synchronization; its regression was corrected to allow real first-run discoveries while still requiring a zero-insert immediate second run and stable post-sync cardinality. The focused Drive test passed, followed by the full gate: TypeScript, 42 test files with 143 tests, and the production build. No comparison, test, or build process remains active.

## Daily briefing voice direction — feminine and natural

The daily voice briefing prompt now requests an adult Brazilian Portuguese feminine voice that is soft, natural, welcoming, warm, light, calm, confident, and executive, with short natural pauses and no added facts or commentary. The browser fallback preserves the exact narration text, sets `pt-BR`, prefers a named feminine Brazilian voice when available, and uses a gentle rate of 0.94 with pitch 1.03; it falls back to the first available Brazilian Portuguese voice without claiming a gender that the browser does not expose. Focused coverage passed 2 test files with 7 tests, including text fidelity, language, voice preference, rate, and pitch. The full quality gate passed TypeScript, the complete test suite, and the production build. The updated release was published as version `81e27eed`.

## Hopi Informe — fechamento de 01/09/2026

The 01 September 2026 22:00 revenue message was parsed without warnings and imported through the existing idempotent Hopi Informe path. The batch contained one revenue snapshot and nine channel records: A & B `R$ 325,00`, MERC `R$ 0,00`, SERV `R$ 0,00`, E-COMMERCE `R$ 163.007,08`, TLMKT `R$ 40.374,60`, BILHETERIA `R$ 0,00`, TURISMO `R$ 8.566,52`, EMPRESA `R$ 1.739,33`, and PARCEIROS `R$ 139,80`. The source totals are internal revenue `R$ 325,00`, external revenue `R$ 213.827,33`, and gross revenue `R$ 214.152,33`; the channel sum reconciles to the supplied gross total. A repeat execution returned `content_hash_already_imported`, confirming duplicate protection. The temporary source file was removed after import; the normalized snapshot, channel facts, source lineage, and import audit remain in the database.

## Relatório 360° v2 — campanhas, YoY, seguidores, audiência e Hora do Horror

The revised report recognizes campaigns from explicit post names, hashtags, and distinctive curated aliases, assigning each post to one best campaign and constraining inferred periods to the latest coherent activity cluster. Live verification recognized five campaigns across 77 matched posts: Criativos Hopi Arraiá, Férias de Julho 2026, Hora do Horror 2026, Passaporti em Dobro, and Quinzena dos Tikitos. Commercial uplift remains hidden because none simultaneously has the minimum campaign and baseline sales coverage; direct attribution still requires a UTM, promotional code, or transaction linkage.

The commercial chapter now includes a two-line monthly chart for 2026 versus 2025 across the eight comparable observed months. Future months are excluded rather than converted to zero, and daily operational revenue remains separate because no comparable prior-year daily series is present. The follower calculation was reconciled against the official Google Sheet boundaries: 18 August to 25 August 2026. The verified consolidated base is 3,009,750 and the weekly delta is +6,458, composed of Instagram +3,715, TikTok +2,758, Facebook -440, YouTube +296, and LinkedIn +129.

Audience composition is now chart-led: Instagram age/gender and cities, TikTok gender and territories, registered-customer age/gender, CRM states, and privacy-safe aggregate CPF regions when rows exist. No CPF identifier is exported. The CPF region source is currently empty and therefore produces no report section; a dated aggregate online-order source is still required for campaign-window buyer-profile comparison.

Hora do Horror no longer has a standalone revenue-correlation page. The report service now evaluates campaign-specific search demand, X listening, and reputation with independent minimums, anchored to each source’s available data window. In the current sample none passes its domain threshold, so no insufficient-sample block is rendered. The final 13-page A4 PDF was inspected visually across every page: the YoY chart, follower correction, audience charts, recognized-campaign chapter, dynamic numbering, briefing sanitization, and source-page layout are free of clipping and obsolete low-sample text. TypeScript, 45 test files with 151 tests, and the production build passed; no temporary probe, render, test, or build process remains active.

## Minissérie Hora do Horror — cronograma Google Sheets

The public spreadsheet `cronograma_minisserie_horror` was inspected read-only through its public export after the available Google Workspace OAuth context returned an authentication error. Its five tabs define the planning parameters, production schedule, Gantt, publication milestones, and responsible team for a four-episode Hora do Horror miniseries. The authoritative parameters define the planning window from 07 September to 02 November 2026, weekly cadence, a 60-second maximum episode duration, and teasers two working days before each premiere.

The validated import added one new official registry record only: `Minissérie Hora do Horror 2026`, status `scheduled`, with the 07 September–02 November 2026 period. It also added eight planned, multiplatform creative milestones: four teasers and four episode premieres on 21/09, 23/09, 28/09, 30/09, 05/10, 07/10, 12/10, and 14/10. Every record retains the sheet-specific source label. The existing Drive campaigns `Hora do Horror 8.8` and `Hora do Horror 2026` were not modified, because they are separate catalog records; no asset binary or historic social/operational record was duplicated. A second identical import preserved one campaign and eight creative records, proving the unique campaign and creative identities prevented duplicates.

The registry source-label fallback is covered by a focused regression, and the full quality gate passed TypeScript, 45 test files with 152 tests, and the production build. No one-off workbook-inspection or importer process remained active.
