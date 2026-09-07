# Google Drive campaign source assessment

## Sources inspected

The supplied Drive root `1MCCYMh2HZq-gxDw1xTJ3F_XFtWk7sI3m` is named **Hopi Hari.Monks** and contains campaign-named child folders. The existing folder `1MO-8x64gfCgqlTkcDIZ6lPMqM4wJ2YH6` is named **Vai Brasil** and is one of those child folders.

The campaign root currently exposes 18 direct child folders, including `Feriado 7 de setembro`, `Invasão I.A.R.A`, `Hopi Dia x Noite`, `Hora do Horror 8.8`, `Cidades aniversariantes`, `Quinzena dos Tikitos`, `Hora do Horror 2026`, `Feriadão SP`, `Férias de Julho 2026`, `Fim de semana com Diversão`, `Vai Brasil`, `Passaporti em Dobro`, `Nuprecin Junho`, `Médicos e Profissionais da Enfermagem`, `Spoiler night HDH26`, `Feriados Corpus Christi`, `Criativos Hopi Arraiá`, and `Criativos institucionais`.

Representative child folders contain creative assets directly, primarily PNG files named by channel and format, such as `Meta`, `Google`, `Vertical`, `Retrato`, `Quadrado`, and `Paisagem`. The inspected root and representative child folders did not expose a manifest spreadsheet, document, or explicit campaign start/end metadata.

## Safe canonical mapping

The child-folder ID is the stable campaign identity. The child-folder name is the campaign name. Each asset keeps its Drive file ID, name, MIME type, modified timestamp, size, checksum when available, and source folder ID. Brand, campaign start date, end date, spend, and publication status must remain null or explicitly unavailable until supplied in Drive metadata or entered by an approved platform user; they must not be inferred from filenames or modified timestamps.

The current `campaigns` table already has `name`, nullable `brand`, nullable `period_start`, nullable `period_end`, `source`, and a JSON `summary` with Drive folder ID, folder URL, asset counts, formats, subfolders, and preview IDs. This is sufficient for an initial asset-library synchronization, with a separate sync-run audit record and per-file fingerprint table recommended for idempotency and change tracking.

## Synchronization implication

The second folder is the authoritative campaign library, while `Vai Brasil` is an existing campaign folder nested below it. A safe first version should recursively discover campaign child folders and synchronize their asset metadata into the existing campaign records. New child folders become new campaign records; new or changed files update the corresponding summary and audit state. Campaign timing and active-status fields remain unavailable unless a manifest convention is adopted.

## Approved operating contract

The platform will run a deterministic synchronization every six hours. It will authenticate with the existing `hopiharibi@media-scarper.iam.gserviceaccount.com` identity through the masked server variables `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`. The private key is never committed or exposed to browser code. The key was validated against the authoritative folder before implementation, and local credential working copies were removed.

Every synchronization is idempotent. The Drive folder ID is the campaign identity, the Drive file ID is the asset identity, and file checksums or modified timestamps determine whether an asset changed. Missing dates, brand, spend, objectives, and status remain null. Deleted or inaccessible source files are not hard-deleted from BI history; they are marked inactive or absent during the latest successful observation so historical lineage remains recoverable.

## Hopi Informe import contract

The uploaded WhatsApp export is an `operational_message` source with one content-hash import run per archive version. Revenue and attendance snapshots are keyed by their São Paulo observation timestamp and upserted into the existing normalized tables. The source contained 14 valid revenue snapshots and 14 valid attendance snapshots. One attendance message was rejected because the reported current occupancy was negative; the warning is retained in the import-run audit record. Source-omitted internal per-capita values remain null rather than being inferred.

## Verified initial synchronization

The first authenticated synchronization of the **Hopi Hari.Monks** root completed on 28 August 2026. It discovered 18 active campaign folders and 435 active assets, consisting of 323 images and 112 videos. The run inserted 453 normalized campaign and asset records, updated none, rejected none, and recorded no warnings. The source schedule is configured for `0 0 4,10,16,22 * * *` UTC, corresponding to a six-hour cadence aligned around the existing 07:00 Brasília briefing window.

The Hopi Informe import completed with 212 normalized rows seen, 161 inserted, 51 reconciled through idempotent updates, and one rejected source message. The latest imported revenue snapshot is 28 August 2026 at 13:00 Brasília with gross revenue of 59,602,056 cents; its per-capita field is null because the source omitted that value. The latest attendance snapshot is the same business time with public count 5,712 and 5,709 people reported in the park.
