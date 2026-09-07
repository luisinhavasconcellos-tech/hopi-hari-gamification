# Daily AI Voice Briefing

- [x] Confirm the trusted BI datasets and define the daily report contract.
- [x] Diagnose the missing Supabase verification email, redirect URL, and resend behavior.
- [x] Add a clear pending-verification state with a reliable resend action.
- [x] Verify the signup, pending-verification, and resend states against the live Supabase project; superseded by the temporary no-confirmation policy.
- [x] Trace confirmation-mail delivery for the reported Gmail account and document the provider fix; superseded by the temporary no-confirmation policy.
- [x] Add the supplied Supabase MCP endpoint as a secure connector without exposing credentials.
- [x] Attempt the exact project-scoped Supabase MCP endpoint for `afqidjbyfrhtxheenhhp`, document its manual OAuth client-ID requirement, and use the authenticated official connector.
- [x] Document the generic Supabase connector as an intentional fallback and its limitation versus project-scoped access.
- [x] Authenticate and verify the Supabase MCP connector capabilities.
- [x] Confirm whether Supabase project `afqidjbyfrhtxheenhhp` should replace or remain separate from the platform’s current project `ylduczowjvbtxixvakxx`.
- [x] Add automated coverage for the verification-pending and resend interaction.
- [x] Prepare server-only X API secret variables and require rotated credentials before activation.
- [x] Add X ingestion health/status without exposing credentials to the browser or repository.
- [x] Upgrade the project for secure server-side AI, persistence, and scheduled execution.
- [x] Add a report-history data model with organization-scoped access controls.
- [x] Implement server-side aggregation of the platform’s available Supabase BI metrics.
- [x] Generate a grounded Portuguese executive briefing without invented metrics.
- [x] Validate every numeric claim in generated report text against values present in the collected BI snapshot before saving.
- [x] Add fixed-snapshot tests that reject invented numeric claims and preserve unavailable-source states.
- [x] Add secure speech generation for the daily report narration.
- [x] Execute one real deployed scheduled-agent run that generates and uploads narration through the authenticated callbacks; verified by the platform’s non-null last execution timestamp and persisted managed audio artifact, while the AGENT outcome body remains unavailable through the local CLI.
- [x] Persist daily narration in managed storage and expose it only through an authenticated audio endpoint.
- [x] Capture successful scheduled-run evidence and the resulting persisted audio metadata; recorded in validation-evidence.md with safe timestamps, storage key, MIME type, and response metadata.
- [x] Add end-to-end coverage for authenticated stored-audio playback and browser-voice fallback failure states.
- [x] Build a protected in-platform briefing page with written report, highlights, audio controls, freshness, and history.
- [x] Add the briefing route to the authenticated navigation and protected-route test contract.
- [x] Configure one automatic daily generation schedule in the user’s timezone.
- [x] Verify anonymous redirects, authenticated access gating, AI output, audio playback, TypeScript, tests, and production build.
- [x] Save a checkpoint and hand off the updated permanent website.
- [x] Temporarily enable Supabase automatic email confirmation for the user-owned authentication project.
- [x] Remove the signup pending-verification and resend requirement from the active account-creation flow.
- [x] Update authentication tests for immediate account activation while preserving all protected-route assertions.
- [x] Document the temporary security tradeoff and the exact steps required to re-enable email verification.
- [x] Verify a new account receives an authenticated session and cannot bypass login on any protected route.
- [x] Inspect all tabs, headers, formulas, date ranges, and access constraints in the three supplied Google Sheets.
- [x] Document canonical revenue, sales-channel, attendance, ticket, and data-lineage entities with Brazilian currency and timezone rules.
- [x] Create additive production tables, uniqueness constraints, indexes, and source-lineage fields for operational snapshots.
- [x] Implement idempotent spreadsheet imports with validation, duplicate detection, and import-run audit records.
- [x] Import and reconcile the three Google Sheets without fabricating missing values.
- [x] Load the supplied 27/08/2026 18:00, 19:00, and 20:00 revenue and attendance snapshots.
- [x] Verify channel totals, internal/external revenue, gross totals, per-capita values, public counts, and in-park counts against the source messages.
- [x] Update BI aggregation and the daily briefing to read the normalized operational tables.
- [x] Add automated data-integrity tests and preserve the complete protected-route suite.
- [x] Validate TypeScript, all tests, production build, and authenticated dashboard rendering.
- [x] Save a checkpoint and hand off the operational database release.
- [x] Perform a real authenticated browser validation of the live dashboard as an approved user and confirm Operational Pulse renders.
- [x] Capture successful scheduled-run evidence and the resulting persisted audio metadata from the live agent execution; recorded in validation-evidence.md without exposing AGENT credentials or audio base64.
- [x] Save a checkpoint and hand off the operational database release.

<!-- The three lines above preserve the remaining evidence requirements from the prior release checklist; the original scheduled-run and checkpoint items remain in history above. -->

# Google Drive Campaign Synchronization

- [x] Inspect the supplied Google Drive folder, its campaign file types, permissions, and update patterns using the approved Google Workspace connection.
- [x] Define the canonical campaign schema, source-lineage fields, sync cadence, conflict rules, and safe handling for unsupported or malformed files.
- [x] Choose and document the synchronization architecture after comparing a managed background sync against a lighter manual/on-demand refresh option.
- [x] Add secure Drive source configuration without exposing OAuth tokens or folder credentials to the browser or repository.
- [x] Implement idempotent discovery, metadata parsing, deduplication, and audit logging for new or changed campaign files.
- [x] Connect synchronized campaigns to the protected dashboard and grounded daily briefing.
- [x] Add automated coverage for Drive sync, duplicate handling, malformed inputs, route protection, and campaign freshness.
- [x] Validate the sync job against the real folder, run the complete quality gate, and publish the updated permanent platform.
- [x] Inspect and classify the second supplied campaign Drive folder `1MCCYMh2HZq-gxDw1xTJ3F_XFtWk7sI3m` alongside the existing `Vai Brasil` folder.
- [x] Decide whether both folders are campaign sources, or whether one is a metadata/index source and the other an asset source.
- [x] Implement the approved six-hour background synchronization from Drive root `1MCCYMh2HZq-gxDw1xTJ3F_XFtWk7sI3m`, with `Vai Brasil` treated as a nested campaign folder.
- [x] Preserve Drive folder/file IDs as stable identities, deduplicate by file ID and checksum, and leave dates, spend, brand, and status unavailable unless sourced explicitly.

# Hopi Informe and Environment Configuration

- [x] Inspect the supplied WhatsApp chat archive and determine its message formats, date range, revenue snapshots, attendance snapshots, and duplicate patterns.
- [x] Inspect the supplied Google OAuth client file without committing its secret fields, replace it with a service-account flow, and remove local credential working copies.
- [x] Define normalized WhatsApp revenue, attendance, source-file, and import-run records with provenance and idempotency keys; malformed message evidence remains in audit warnings.
- [x] Import and reconcile the Hopi Informe export into the operational database without fabricating values or overwriting newer facts.
- [x] Configure the required server environment variables through the project’s managed Secrets settings; variable names are visible under Settings → Secrets while values remain masked.
- [x] Add automated tests for WhatsApp parsing, reconciliation, duplicate handling, credential validation, and protected dashboard consumption.
- [x] Run the complete quality gate and publish the updated permanent platform after the import and environment configuration are validated.
- [x] Add end-to-end Drive synchronization tests for unchanged duplicates and malformed assets, not only pure helper coverage.
- [x] Add importer-level database tests for Hopi Informe idempotent re-import and preservation of facts owned by another source.
- [x] Capture one successful production Heartbeat execution of `/api/scheduled/campaign-drive-sync` and its persisted sync-run evidence.

# Hopi Informe — Lote 28 e 29 de agosto de 2026

- [x] Validar e importar os snapshots de público e faturamento fornecidos para 28/08/2026 e 29/08/2026.
- [x] Confirmar que os totais por canal e os resumos interno/externo fecham com os totais brutos informados.
- [x] Deduplicar o fechamento de 28/08/2026 e preservar a precedência de fatos já registrados por fonte operacional autorizada.
- [x] Reexecutar os testes de integridade e confirmar a cobertura atualizada no banco.

# Hopi Informe — Atualização de 29 de agosto de 2026 (09:00–11:00)

- [x] Validar e importar os snapshots de faturamento das 09:00, 10:00 e 11:00 e o snapshot de público das 11:00.
- [x] Confirmar os totais por canal e os resumos interno/externo contra os totais brutos informados.
- [x] Deduplicar o snapshot de público de 11:00 com qualquer registro existente e preservar a precedência da fonte autorizada.
- [x] Reexecutar os testes de integridade e confirmar a cobertura atualizada no banco.

# Facebook CSV Import

- [x] Inspecionar os sete CSVs de Facebook, período, colunas e granularidade.
- [x] Mapear público, seguidores, cliques, visualizadores, visitas, interações e visualizações para o modelo social normalizado.
- [x] Importar os CSVs com source run, hashes, deduplicação e preservação de métricas incomparáveis como dimensões separadas.
- [x] Exibir cobertura e frescor do Facebook no dashboard protegido e briefing fundamentado.
- [x] Adicionar testes de parsing, reconciliação, proteção e qualidade final; executar build e publicar o release.

# Instagram CSV Import

- [x] Inspecionar os CSVs de Instagram, identificar duplicatas de anexos e medir período, colunas e granularidade.
- [x] Estender o modelo social para separar métricas diárias, alcance e demografia do Instagram sem misturar contas ou dimensões.
- [x] Importar os CSVs de Instagram com hash do lote, source run, deduplicação e preservação de dados existentes.
- [x] Exibir cobertura e frescor de Instagram junto das métricas Facebook no dashboard protegido e no briefing.
- [x] Adicionar testes, executar a validação completa e publicar o release combinado.

# Social Integration Evidence Gaps

- [x] Exibir intervalo da série e quantidade de linhas no painel protegido de Facebook e Instagram, além do último dia disponível.
- [x] Garantir e testar que o snapshot do briefing contém e pode narrar métricas Facebook e Instagram importadas, sem inventar números.
- [x] Salvar e publicar um novo checkpoint após a conclusão dessas correções.
- [x] Adicionar teste focado que comprove que o texto diário do briefing referencia métricas importadas de Facebook e Instagram sem inventar números.
- [x] Publicar um novo checkpoint depois do teste do briefing e registrar a versão final.

# TikTok Import

- [x] Inspecionar os três ZIPs de TikTok, arquivos internos, período, conta e granularidade.
- [x] Mapear visão geral, visualizadores e seguidores para um modelo TikTok separado de Facebook e Instagram.
- [x] Importar os dados de TikTok com hash do lote, source run, deduplicação e preservação de métricas ausentes.
- [x] Exibir cobertura e frescor do TikTok no dashboard protegido e no briefing grounded.
- [x] Adicionar testes de parsing, reconciliação, proteção e qualidade final; executar build e publicar o release.
- [x] Reexecutar o importador TikTok no mesmo lote e registrar/validar o caminho `content_hash_already_completed` sem duplicar linhas no banco.
- [x] Adicionar teste de integração do importador TikTok cobrindo idempotência, source run e preservação de métricas nulas/ausentes.
- [x] Adicionar cobertura de proteção para os procedimentos tRPC de TikTok e/ou renderização autenticada do painel TikTok.
- [x] Executar TypeScript, suíte completa, build de produção e salvar/publicar um novo checkpoint TikTok.
- [x] Adicionar um teste de integração do importador TikTok que execute o mesmo lote duas vezes, valide o source run/hash reutilizado e confirme `Total Viewers = null` para a linha indefinida.
- [x] Salvar e publicar um novo checkpoint após a integração TikTok validada e registrar o novo version ID no handoff.

# Cross-Platform Social Comparison

- [x] Audit the existing Facebook, Instagram, and TikTok query contracts and dashboard placement.
- [x] Define comparable metrics, date-range behavior, platform selection, and explicit unavailable-value rules.
- [x] Implement protected cross-platform comparison data and interactive dashboard filters.
- [x] Add comparison logic, route-protection, and responsive UI tests.
- [x] Run TypeScript, the complete test suite, production build, and publish the feature.
- [x] Adicionar teste client do SocialComparisonPanel cobrindo filtros de data, alternância de plataformas, indisponibilidade e estados autenticados de loading/erro.
- [x] Registrar que a validação responsiva renderizada do comparativo em desktop e mobile ficou bloqueada pelo glitch da sessão autenticada; os contratos de layout permanecem cobertos no código e nos testes.
- [x] Salvar e publicar novo checkpoint após o comparativo passar por todas as validações automatizadas; versão `4aba6d98` publicada com a limitação visual documentada.
- [x] Expandir o teste client do SocialComparisonPanel para loading, erro e comportamento com dados autenticados.
- [x] Registrar a limitação da validação do SocialComparisonPanel renderizado em desktop e mobile: a sessão autenticada apresentou glitch e nenhuma renderização protegida não observada foi declarada.
- [x] Salvar e publicar um novo checkpoint após as validações finais do comparativo; versão `4aba6d98` publicada.
- [x] Documentar que a validação visual autenticada do comparativo ficou bloqueada por falha do navegador, sem declarar renderização protegida não observada.
- [x] Salvar e publicar o comparativo após o quality gate final, mantendo a limitação do navegador no handoff; versão `4aba6d98`.
- [x] Salvar e publicar um novo checkpoint do comparativo social após os 101 testes aprovados, registrando a versão `4aba6d98`.
- [x] Enviar o handoff final do comparativo, informando explicitamente a limitação da validação visual autenticada causada pelo glitch do navegador.
- [x] Corrigir o status do item de validação visual do comparativo para refletir que apenas o gate de autenticação foi observado, devido ao glitch do navegador.
- [x] Salvar e publicar um novo checkpoint do comparativo social após o quality gate de 101 testes; versão `4aba6d98`.
- [x] Enviar o handoff final do comparativo, informando claramente a limitação da validação visual autenticada.

# Preview Access Issue

- [x] Check managed preview health, browser console/network state, and protected route responses; preview, `/auth`, and `/dashboard` all return HTTP 200 and the server log is healthy.
- [x] Determine whether the missing preview is caused by authentication, browser session state, stale deployment, or a runtime error; no runtime error was found, and the preview is behind the authentication/session boundary.
- [x] Restore preview visibility with the smallest safe fix and preserve route protection; provide the direct managed-preview URL and require sign-in rather than weakening protected routes.
- [x] Re-run the relevant quality gate and document the correct preview/live URL and access steps; the latest 101-test, TypeScript, and production-build gate remains valid.
- [x] Enviar o URL direto do managed preview ao usuário, com passos explícitos de login; o preview e as rotas protegidas foram verificados por HTTP, sem enfraquecer a proteção.
- [x] Registrar que o diagnóstico não alterou código nem dependências; por isso, o quality gate de 101 testes/TypeScript/build continua sendo a validação aplicável, e documentar os URLs de preview e produção.

# Production Blank Screen

- [x] Reproduce the live blank screen with stray `@@ - +` text and capture browser-console/network evidence.
- [x] Identify and remove the source artifact appended to `client/index.html` that caused the production React application not to mount correctly.
- [x] Verify the login shell renders in the managed preview after the fix while preserving dashboard route protection; permanent-domain verification follows publication.
- [x] Run TypeScript, all 101 tests, production build, and publish the rendering fix.

# Authenticated Dashboard Runtime Crash

- [x] Capture the authenticated DashboardPage exception and failed request evidence while confirming other protected pages still render.
- [x] Identify the dashboard-only component or query contract responsible for the blank authenticated view: missing root tRPC provider plus invalid escaped ISO-date regex.
- [x] Add resilient error isolation so a future render exception shows the existing recovery screen instead of an empty React root.
- [x] Verify the dashboard and social comparison render with real authenticated data, then run TypeScript, 26 test files / 103 tests, and production build.
- [x] Publish the dashboard-specific fix and confirm the permanent and managed URLs.

# Hide Domain Verification Page

- [x] Remove `Domínio & Verificação` from the authenticated sidebar navigation.
- [x] Redirect legacy `/dominio` visits to `/dashboard` without weakening route protection.
- [x] Update navigation and protected-route tests, run TypeScript, 26 test files / 104 tests, production build, and publish the change.

# Page-Level PDF Metric Reports

- [x] Audit the existing PDF exporter and metric content on Dashboard and Audience Overview.
- [x] Add visible authenticated `Exportar PDF` controls to both pages with responsive placement and loading feedback.
- [x] Ensure each downloaded PDF contains the corresponding page metrics, report title, generation date, and safe filename; verified 5-page Dashboard and 3-page Audience Overview A4 files.
- [x] Add export/button coverage, verify protected rendering, run TypeScript, 28 test files / 108 tests, production build, and publish the feature.

# Segments and Gender Audit Reorganization

- [x] Inspect the current Segments and Gender Audit pages, routes, sidebar navigation, and related tests.
- [x] Move the Gender Audit experience into the Segments page using the existing Hopi Hari design tokens and protected layout.
- [x] Update navigation and preserve a protected compatibility path for the former Gender Audit route if needed.
- [x] Add or update Vitest coverage, verify the authenticated UI, run TypeScript/tests/build, and publish the change.

# Hopi Informe — Fechamento de 27/08 e Operação de 28/08

- [x] Inspect the existing Hopi Informe importer, operational data model, stored snapshot precedence, and current Hora do Horror/social strategy surfaces.
- [x] Parse and idempotently import the supplied 27/08 23:59 closing snapshot and 28/08 08:00, 09:00, 10:00, and 11:00 revenue snapshots plus 10:00 attendance snapshot, retaining source lineage and null-safe omissions.
- [x] Reconcile channel totals and internal/external revenue against every supplied gross total without overwriting higher-priority operational evidence.
- [x] Add a protected, explicitly data-grounded Hora do Horror correlation and social-media strategy insight that distinguishes observed evidence from recommendations.
- [x] Add or update automated coverage, verify the protected UI, run TypeScript/tests/build, and publish the enhancement.

# Hopi Informe — Atualização Operacional de 28 a 30/08

- [x] Inspect existing 28–30 August Hopi Informe snapshots and validate the new revenue and attendance messages before import.
- [x] Idempotently import the supplied 28/08 20:00 and 23:00, 29/08 23:00, and 30/08 23:00 revenue snapshots plus the 28/08 20:00, 29/08 21:00, and 30/08 21:00 attendance snapshots with source lineage.
- [x] Reconcile each imported total and refresh the protected Hora do Horror social-operation correlation coverage without overstating causality.
- [x] Run TypeScript/tests/build, record validation evidence, and publish the data refresh.

# Hora do Horror — Registro Oficial de Campanha

- [x] Inspect the Dashboard, the existing Hora do Horror correlation service, and current campaign data patterns.
- [x] Define a source-traceable, validated registry for official campaign dates and creatives without weakening protected access.
- [x] Add a protected Dashboard management section to create and view official Hora do Horror dates and creative records, with an actionable link to correlation analysis.
- [x] Ground the Hora do Horror correlation context in the official registry, add regression coverage, run TypeScript/tests/build, and publish the feature.

# Social Listening — Planilha de Seguidores

- [x] Inspect the provided Google Sheet structure and existing follower/import schemas for Instagram, TikTok, YouTube, and other social-listening pages.
- [x] Map and validate follower columns by platform with source lineage, freshness, and idempotent import rules.
- [x] Integrate the follower source into the protected backend and shared social-listening page views, preserving missing-platform transparency.
- [x] Add regression coverage, validate the imported data, run TypeScript/tests/build, and publish the update.

# Social Listening — Sincronização Periódica de Seguidores

- [x] Inspect the project periodic-update framework and existing follower source/import configuration.
- [x] Define the sync cadence, protected source access, idempotent behavior, failure handling, and freshness semantics.
- [x] Implement the scheduled Google Sheet reader and normalized follower importer without duplicate records.
- [x] Add freshness/status visibility and regression coverage, validate the scheduled execution path, and publish the automation.
- [x] Create and activate the production Heartbeat job after the deployed callback is confirmed; six-hour schedule enabled and task ownership persisted.

# Campaigns — Correlation with Sales

- [x] Inspect official campaign registries, synchronized Drive campaign metadata, revenue facts, ticket sales, and available campaign-date coverage.
- [x] Define deterministic campaign matching, pre-campaign baseline, active-window comparison, lag windows, and minimum-evidence rules.
- [x] Implement a protected campaign-sales correlation service and executive dashboard experience without claiming unsupported causality.
- [x] Add regression coverage, verify results against real data, run TypeScript/tests/build, and publish the enhancement.

# Arquivos de Campanha Enviados — Importação Protegida

- [x] Inspect the inventories and metadata of the seven uploaded campaign archives, and compare them with the synchronized campaign catalog.
- [x] Validate and import unique archive assets with upload provenance, path-safety checks, media classification, and idempotency.
- [x] Surface the uploaded archive coverage and campaign-sales correlation readiness in the protected Campaigns workspace without inventing dates or attribution.
- [x] Add regression coverage, validate the archive import and protected UI, run TypeScript/tests/build, and publish the update.

# Relatório Executivo Hopi Hari 360° — PDF Semanal

- [x] Audit all protected platform domains, existing PDF utilities, weekly data contracts, and visible source/freshness indicators.
- [x] Define a complete weekly executive thesis covering operations, revenue, attendance, sales channels, campaigns, social listening, followers, audiences, correlations, risks, and recommended actions.
- [x] Implement a protected consolidated report data contract and a branded, print-optimized multi-page A4 layout with contents, charts, tables, evidence notes, and pagination.
- [x] Replace the Dashboard and Overview PDF actions with the weekly 360° report while preserving loading, success, error, authentication, and safe filename behavior.
- [x] Add regression coverage, generate and inspect a real 13-page PDF, run TypeScript, 42 test files / 143 tests, production build, and publish the report experience.

# Atualização de Código Enviada — 01/09/2026

- [x] Inspect the uploaded ZIP structure, file inventory, archive safety, and project compatibility without executing untrusted content.
- [x] Compare the uploaded source tree with the published platform and classify compatible changes, conflicts, regressions, and production features missing from the archive.
- [x] Merge only approved compatible changes while preserving authentication, database migrations, schedules, social ingestion, campaign catalog, and weekly 360° reporting.
- [x] Add or update regression coverage, verify protected UI, run TypeScript/tests/build, and publish the merged release.
- [x] Update the live Drive synchronization regression to allow legitimate first-run discoveries while still requiring a zero-insert second run and stable post-sync cardinality.

# Daily Voice Briefing — Voz Feminina Suave

- [x] Inspect the current daily briefing voice prompt, generation path, and narration tests.
- [x] Update narration direction to a soft, natural, feminine Brazilian Portuguese voice while preserving exact speech text and protected callback behavior.
- [x] Add or update regression coverage, run TypeScript/tests/build, and publish the voice adjustment.

# Hopi Informe — Fechamento de 01/09/2026

- [x] Inspect whether the 01/09/2026 22:00 revenue snapshot already exists and validate its parser input.
- [x] Import the supplied revenue-by-channel snapshot idempotently with source lineage.
- [x] Reconcile channel totals, internal/external revenue, gross revenue, and refresh dependent operational summaries.
- [x] Run regression validation and publish the data update.

# Relatório 360° — Revisão de Campanhas, Receita, Seguidores e Audiência

- [x] Audit Instagram/social posts against synchronized campaign creatives and define evidence-backed post-to-campaign matching.
- [x] Inspect current and prior-year gross revenue/faturamento sources and add a line-chart comparison only where comparable periods exist.
- [x] Recalculate weekly follower-base variation exactly from the Google Sheet date boundaries and source columns.
- [x] Replace audience composition tables with clear charts and suppress analytical sections that do not meet minimum sample requirements.
- [x] Link campaign posts to dated sales and available online-buyer/CPF audience facts with explicit attribution and privacy-safe aggregation.
- [x] Reframe Hora do Horror around social listening, reputation, and search-demand evidence instead of unsupported sales correlation.
- [x] Add regression coverage, generate and visually inspect a real revised PDF, run TypeScript/tests/build, and publish the update.
- [x] Update campaign-sales test fixtures for the new official-versus-post-derived period provenance contract.
- [x] Restrict post-derived campaign windows to the latest coherent activity cluster so historic mentions do not create multi-year campaign periods.
- [x] Anchor Hora do Horror search analysis to the latest available Search Console date rather than suppressing valid source data when GSC lags the operational close.

# Nova Planilha — Importação Incremental Sem Duplicidade

- [x] Inspect the provided Google Sheet structure, source access, and normalized import destinations.
- [x] Compare source records with existing data and define the idempotent identity and source-precedence rules.
- [x] Validate and import only genuinely new records with complete source lineage and reconciliation checks.
- [x] Verify dependent BI coverage, add or update regression safeguards if required, and publish the data update.
