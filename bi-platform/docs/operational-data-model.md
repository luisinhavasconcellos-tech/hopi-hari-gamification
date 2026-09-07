# Hopi Hari operational data model

The operational database uses **append-only observations plus idempotent natural keys**. Source workbooks remain evidence, while dashboards and the daily briefing read normalized facts. Brazilian currency is stored as integer cents, follower and visitor counts as integers, business dates as São Paulo calendar dates, and observation timestamps as UTC.

## Source registry and lineage

| Entity | Natural key | Purpose |
|---|---|---|
| `operational_sources` | `source_key` | Registers each Google workbook, WhatsApp-style operational feed, and future API source. |
| `operational_import_runs` | `source_id + content_hash` | Makes imports idempotent and records rows seen, inserted, updated, rejected, status, and safe error details. |
| Every fact row | Source-specific key plus `source_run_id` | Preserves document ID, sheet/tab, source row, and import provenance without embedding spreadsheet formulas. |

## Social and competitive intelligence

| Entity | Natural key | Authoritative fields |
|---|---|---|
| `social_venues` | `slug` | Park or brand name, Hopi Hari flag, active state. |
| `social_profiles` | `venue_id + platform` | Platform, canonical profile URL, eligibility for competitive index. |
| `social_follower_snapshots` | `profile_id + observed_date` | Integer follower count from either daily Hopi log or weekly competitor collection. |
| `social_content_links` | `platform + canonical_url_hash` | Canonical post URL, source label/order, original URL, duplicate-safe identity. |
| `social_audience_goals` | `goal_key + effective_from` | Total or platform target, target count, optional effective period. |

The competitor workbook's **COLETA** tab is authoritative; **DASHBOARD** and **EVOLUÇÃO** are derived formula views. The Hopi follower workbook's **Log Diário** columns A–F are authoritative; total and deltas are recalculated from normalized facts. The goal value is imported from **Meta 3M**, while its forecast formulas remain derived analytics.

## Revenue and attendance operations

| Entity | Natural key | Authoritative fields |
|---|---|---|
| `revenue_channels` | `code` | Canonical channel label, business group, and internal/external classification. |
| `revenue_snapshots` | `observed_at` | Business date, internal revenue cents, external revenue cents, gross revenue cents, and internal per-capita cents. |
| `revenue_channel_snapshots` | `snapshot_id + channel_id` | Revenue cents for each channel at a specific observation time. |
| `attendance_snapshots` | `observed_at` | Public, paying guests, complimentary guests, interval entries/exits, and currently in park (the 21:00 closing reading may be slightly negative; the source value is kept and flagged). |
| `attendance_daily_closings` | `business_date` | "FECHAMENTO DIÁRIO" summary: forecast, realized and variation for the day. |
| `attendance_forecasts` | `business_date + issued_at` | Each revision of the "Previsão de Público" forecast, stamped with the message time. |

The internal revenue classification is **A & B, MERC, SERV, and PLAKA**. Every other supplied sales channel is external. Import validation requires channel values to sum to the declared gross total and the four internal channels to sum to declared internal revenue; external revenue is checked independently.

## Import rules

| Rule | Enforcement |
|---|---|
| Idempotency | A SHA-256 content hash prevents the same source payload from creating a second import run. Fact tables upsert on their natural keys. |
| Missing values | Blank cells are not converted to zero. They remain absent observations. |
| Formula separation | Spreadsheet formulas and presentation tabs are never imported as source facts. Derived metrics are recalculated by the platform. |
| URL normalization | Tracking query strings and surrounding whitespace are removed for duplicate detection; the original URL is retained for audit. |
| Date handling | Workbook dates become `YYYY-MM-DD`; supplied 18:00, 19:00, and 20:00 observations use `America/Sao_Paulo` and are persisted as UTC timestamps. |
| Currency handling | Brazilian-formatted amounts are parsed deterministically into integer cents; floating-point currency is prohibited. |
| Reconciliation | Every import emits row counts, duplicate counts, rejection reasons, and source-specific control totals. |
| Access | Browser clients never write operational facts directly. Imports and fact queries run server-side; application APIs continue to require an approved authenticated account. |

## Source inventory

| Source | Authoritative tabs | Imported domain |
|---|---|---|
| `1bdFZDsqJ_-g__ZsMRcTPswbCzP90FAfKwin7m6Gf9uo` | Instagram, Tiktok, Youtube, Facebook, Linkedin, X | Social content links. |
| `1t5PGAizug8ovvBB-QO3ygxJujHfnbDh6Bl7xf-KQgCc` | COLETA | Weekly follower observations for seven parks across five platforms. |
| `1vAZbigUr_iSzdWqhP79VnsEfwua6KPaIYud8hOfNecY` | Log Diário; Meta 3M target | Daily Hopi Hari followers and total-audience goal. |
| Supplied operational messages | 27/08/2026 at 18:00, 19:00, and 20:00 | Revenue/channel and attendance snapshots (`operational-message-2026-08-27`). |
| WhatsApp "Hopi Informe" export (`whatsapp-hopi-informe-export`) | Hourly FATURAMENTO, 15-minute "Público do dia", daily closings, forecast revisions | Revenue/channel and attendance snapshots, daily closings, forecasts. Normalized copy: `data/operational/whatsapp-hopi-informe-2026-08-27_2026-09-07.json`. |

## WhatsApp "Hopi Informe" imports

```bash
pnpm tsx scripts/import-hopi-informe.mts "WhatsApp Chat - Hopi Informe.zip" --dry-run   # parse + reconcile only
pnpm tsx scripts/import-hopi-informe.mts "WhatsApp Chat - Hopi Informe.zip"             # import (needs DATABASE_URL)
```

Duplicate protection, in order:

1. The SHA-256 of the chat file is the import-run key: the same export is never imported twice (`content_hash_already_completed`).
2. Re-sent messages for the same moment are collapsed before writing; the later message (the correction) wins and the count is reported as `duplicatesCollapsed`.
3. Fact tables upsert on their natural keys (`observed_at`, `business_date`, `business_date + issued_at`), so an export that overlaps an earlier one updates rows instead of adding them.
4. Observations already owned by a different source (e.g. the manual `operational-message-2026-08-27` snapshots) are preserved and reported, never overwritten.

## References

[1]: https://docs.google.com/spreadsheets/d/1bdFZDsqJ_-g__ZsMRcTPswbCzP90FAfKwin7m6Gf9uo/edit "Social listening workbook"
[2]: https://docs.google.com/spreadsheets/d/1t5PGAizug8ovvBB-QO3ygxJujHfnbDh6Bl7xf-KQgCc/edit "Competitor weekly follower tracker"
[3]: https://docs.google.com/spreadsheets/d/1vAZbigUr_iSzdWqhP79VnsEfwua6KPaIYud8hOfNecY/edit "Hopi Hari daily follower log"
