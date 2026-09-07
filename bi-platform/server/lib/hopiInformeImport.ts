import crypto from "node:crypto";
import type { Connection, Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type {
  HopiInformeAttendancePoint,
  HopiInformeDailyClosing,
  HopiInformeForecastPoint,
  HopiInformeParseResult,
  HopiInformeRevenuePoint,
} from "./hopiInforme";
import { dedupeHopiInformeExport, parseHopiInformeExport, shouldPreserveOperationalSource } from "./hopiInforme";

export const HOPI_INFORME_SOURCE_KEY = "whatsapp-hopi-informe-export";
export const HOPI_INFORME_SOURCE_NAME = "WhatsApp · Hopi Informe (faturamento e público)";

export type OperationalSnapshotWrite = {
  status: "inserted" | "updated" | "preserved";
  snapshotId: number | null;
  existingSourceKey: string | null;
};

/**
 * Business group per channel code, aligned with the taxonomy the dashboard
 * uses (client/src/hooks/useSalesRevenue.ts). Only applied when a channel is
 * first created; existing rows keep whatever the operators configured.
 */
export const CHANNEL_BUSINESS_GROUPS: Record<string, string> = {
  "A & B": "Alimentos & Bebidas",
  MERC: "Mercadorias",
  PLAKA: "Mercadorias",
  SERV: "Serviços do parque",
  "HOPI NIVER": "Serviços do parque",
  BILHETERIA: "Ingressos",
  "E-COMMERCE": "Ingressos",
  TLMKT: "Ingressos",
  AGVT: "Ingressos",
  TURISMO: "Ingressos",
  PARCEIROS: "Ingressos",
  CONSIGNAÇÃO: "Ingressos",
  DIVULGAÇÃO: "Ingressos",
  COMERCIAL: "Ingressos",
  EMPRESA: "B2B & Grupos",
  EVENTOS: "B2B & Grupos",
  ESCOLA: "B2B & Grupos",
  "ESCOLA PARTICULAR": "B2B & Grupos",
  "ESCOLA PUBLICA": "B2B & Grupos",
};

export const INTERNAL_CHANNELS = new Set(["A & B", "MERC", "SERV", "PLAKA"]);

export function channelClassification(code: string): "internal" | "external" {
  return INTERNAL_CHANNELS.has(code) ? "internal" : "external";
}

export function channelBusinessGroup(code: string): string {
  return CHANNEL_BUSINESS_GROUPS[code] ?? (INTERNAL_CHANNELS.has(code) ? "Operação interna" : "Ingressos");
}

export function contentHash(raw: string | Buffer) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function existingSourceKey(
  connection: Connection,
  table: "revenue_snapshots" | "attendance_snapshots",
  observedAt: Date,
) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT s.source_key FROM ${table} snapshot
     JOIN operational_import_runs run ON run.id = snapshot.source_run_id
     JOIN operational_sources s ON s.id = run.source_id
     WHERE snapshot.observed_at = ? LIMIT 1`,
    [observedAt],
  );
  return rows[0]?.source_key ? String(rows[0].source_key) : null;
}

export async function writeRevenueSnapshot(
  connection: Connection,
  point: HopiInformeRevenuePoint,
  runId: number,
  sourceKey: string,
): Promise<OperationalSnapshotWrite> {
  const observedAt = new Date(point.observedAt);
  const owner = await existingSourceKey(connection, "revenue_snapshots", observedAt);
  if (shouldPreserveOperationalSource(owner, sourceKey)) {
    return { status: "preserved", snapshotId: null, existingSourceKey: owner };
  }
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO revenue_snapshots
      (observed_at, business_date, local_hour, internal_revenue_cents, external_revenue_cents,
       gross_revenue_cents, internal_per_capita_cents, source_run_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), business_date = VALUES(business_date), local_hour = VALUES(local_hour),
       internal_revenue_cents = VALUES(internal_revenue_cents), external_revenue_cents = VALUES(external_revenue_cents),
       gross_revenue_cents = VALUES(gross_revenue_cents), internal_per_capita_cents = VALUES(internal_per_capita_cents),
       source_run_id = VALUES(source_run_id)`,
    [observedAt, point.businessDate, point.localHour, point.internalRevenueCents, point.externalRevenueCents,
      point.grossRevenueCents, point.internalPerCapitaCents, runId],
  );
  return {
    status: result.affectedRows === 1 ? "inserted" : "updated",
    snapshotId: Number(result.insertId),
    existingSourceKey: owner,
  };
}

/** Upserts the per-channel breakdown of one revenue snapshot; channels are created on first sight. */
export async function writeRevenueChannelSnapshots(
  connection: Connection,
  snapshotId: number,
  channels: Record<string, number>,
  runId: number,
) {
  let inserted = 0;
  let updated = 0;
  const channelIds: number[] = [];
  for (const [code, revenueCents] of Object.entries(channels)) {
    const [channelResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO revenue_channels (code, label, business_group, classification, active)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [code, code, channelBusinessGroup(code), channelClassification(code)],
    );
    const channelId = Number(channelResult.insertId);
    channelIds.push(channelId);
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO revenue_channel_snapshots (snapshot_id, channel_id, revenue_cents, source_run_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE revenue_cents = VALUES(revenue_cents), source_run_id = VALUES(source_run_id)`,
      [snapshotId, channelId, revenueCents, runId],
    );
    if (result.affectedRows === 1) inserted += 1;
    else if (result.affectedRows === 2) updated += 1;
  }
  // A channel that disappeared from a corrected message must not linger.
  if (channelIds.length) {
    await connection.execute(
      `DELETE FROM revenue_channel_snapshots WHERE snapshot_id = ? AND channel_id NOT IN (${channelIds.map(() => "?").join(", ")})`,
      [snapshotId, ...channelIds],
    );
  }
  return { inserted, updated };
}

export async function writeAttendanceSnapshot(
  connection: Connection,
  point: HopiInformeAttendancePoint,
  runId: number,
  sourceKey: string,
): Promise<OperationalSnapshotWrite> {
  const observedAt = new Date(point.observedAt);
  const owner = await existingSourceKey(connection, "attendance_snapshots", observedAt);
  if (shouldPreserveOperationalSource(owner, sourceKey)) {
    return { status: "preserved", snapshotId: null, existingSourceKey: owner };
  }
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO attendance_snapshots
      (observed_at, business_date, local_hour, public_count, paying_count, complimentary_count,
       entries_interval, exits_interval, currently_in_park, source_run_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), business_date = VALUES(business_date), local_hour = VALUES(local_hour),
       public_count = VALUES(public_count), paying_count = VALUES(paying_count), complimentary_count = VALUES(complimentary_count),
       entries_interval = VALUES(entries_interval), exits_interval = VALUES(exits_interval),
       currently_in_park = VALUES(currently_in_park), source_run_id = VALUES(source_run_id)`,
    [observedAt, point.businessDate, point.localHour, point.publicCount, point.payingCount, point.complimentaryCount,
      point.entriesInterval, point.exitsInterval, point.currentlyInPark, runId],
  );
  return {
    status: result.affectedRows === 1 ? "inserted" : "updated",
    snapshotId: Number(result.insertId),
    existingSourceKey: owner,
  };
}

export async function writeDailyClosing(connection: Connection, point: HopiInformeDailyClosing, runId: number) {
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO attendance_daily_closings (business_date, observed_at, forecast_count, realized_count, variation, source_run_id)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE observed_at = VALUES(observed_at), forecast_count = VALUES(forecast_count),
       realized_count = VALUES(realized_count), variation = VALUES(variation), source_run_id = VALUES(source_run_id)`,
    [point.businessDate, new Date(point.observedAt), point.forecastCount, point.realizedCount, point.variation, runId],
  );
  return result.affectedRows === 1 ? "inserted" : "updated";
}

export async function writeForecast(connection: Connection, point: HopiInformeForecastPoint, runId: number) {
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO attendance_forecasts (business_date, issued_at, forecast_count, source_run_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE forecast_count = VALUES(forecast_count), source_run_id = VALUES(source_run_id)`,
    [point.businessDate, new Date(point.issuedAt), point.forecastCount, runId],
  );
  return result.affectedRows === 1 ? "inserted" : "updated";
}

export type HopiInformeImportResult = {
  status: "completed" | "content_hash_already_completed";
  sourceId: number;
  runId: number | null;
  contentHash: string;
  parsed: { revenue: number; attendance: number; closings: number; forecasts: number };
  duplicatesCollapsed: { revenue: number; attendance: number; closings: number; forecasts: number };
  written: {
    revenue: { inserted: number; updated: number; preserved: number };
    channels: { inserted: number; updated: number };
    attendance: { inserted: number; updated: number; preserved: number };
    closings: { inserted: number; updated: number };
    forecasts: { inserted: number; updated: number };
  };
  dateRange: [string, string] | null;
  warnings: string[];
};

/**
 * Imports a WhatsApp "Hopi Informe" export into the operational tables.
 *
 * Idempotency: the SHA-256 of the file is the natural key of the import run,
 * so re-running the same export is a no-op; a newer export that overlaps an
 * earlier one upserts the same `observed_at` rows instead of duplicating
 * them; facts already owned by another source are preserved untouched.
 */
export async function importHopiInformeExport(
  pool: Pool,
  raw: string,
  options: { sourceKey?: string; sourceName?: string; fileName?: string } = {},
): Promise<HopiInformeImportResult> {
  return importHopiInformeData(pool, parseHopiInformeExport(raw), { ...options, contentHash: contentHash(raw) });
}

/** Same as importHopiInformeExport, for already-parsed data (e.g. a committed `data/operational/*.json` dataset). */
export async function importHopiInformeData(
  pool: Pool,
  parsedResult: HopiInformeParseResult,
  options: { contentHash: string; sourceKey?: string; sourceName?: string; fileName?: string },
): Promise<HopiInformeImportResult> {
  const sourceKey = options.sourceKey ?? HOPI_INFORME_SOURCE_KEY;
  const hash = options.contentHash;
  const { data, stats } = dedupeHopiInformeExport(parsedResult);
  const parsed = {
    revenue: data.revenue.length,
    attendance: data.attendance.length,
    closings: data.closings.length,
    forecasts: data.forecasts.length,
  };
  const duplicatesCollapsed = {
    revenue: stats.revenueDuplicates,
    attendance: stats.attendanceDuplicates,
    closings: stats.closingDuplicates,
    forecasts: stats.forecastDuplicates,
  };
  const dates = [...data.revenue, ...data.attendance].map(point => point.businessDate).sort();
  const dateRange: [string, string] | null = dates.length ? [dates[0], dates.at(-1)!] : null;
  if (!parsed.revenue && !parsed.attendance) throw new Error("Export contains no revenue or attendance messages");

  const connection = await pool.getConnection();
  try {
    await connection.execute(
      `INSERT INTO operational_sources (source_key, source_type, name, external_id, active)
       VALUES (?, 'operational_message', ?, ?, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name), active = 1`,
      [sourceKey, options.sourceName ?? HOPI_INFORME_SOURCE_NAME, options.fileName ?? null],
    );
    const [sourceRows] = await connection.execute<RowDataPacket[]>("SELECT id FROM operational_sources WHERE source_key = ? LIMIT 1", [sourceKey]);
    const sourceId = Number(sourceRows[0]?.id);
    if (!sourceId) throw new Error("Operational source could not be resolved");

    const [existingRuns] = await connection.execute<RowDataPacket[]>(
      "SELECT id, status FROM operational_import_runs WHERE source_id = ? AND content_hash = ? LIMIT 1",
      [sourceId, hash],
    );
    const empty = { inserted: 0, updated: 0 };
    if (existingRuns[0]?.status === "completed") {
      return {
        status: "content_hash_already_completed", sourceId, runId: Number(existingRuns[0].id), contentHash: hash,
        parsed, duplicatesCollapsed, dateRange, warnings: data.warnings,
        written: { revenue: { ...empty, preserved: 0 }, channels: empty, attendance: { ...empty, preserved: 0 }, closings: empty, forecasts: empty },
      };
    }

    const [runResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO operational_import_runs (source_id, content_hash, status, rows_seen, rows_inserted, rows_updated, rows_rejected, warnings_json)
       VALUES (?, ?, 'started', 0, 0, 0, 0, NULL)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), status = 'started', rows_seen = 0, rows_inserted = 0, rows_updated = 0,
         rows_rejected = 0, warnings_json = NULL, started_at = NOW(), completed_at = NULL`,
      [sourceId, hash],
    );
    const runId = Number(runResult.insertId);
    if (!runId) throw new Error("Import run could not be created");

    const written: HopiInformeImportResult["written"] = {
      revenue: { inserted: 0, updated: 0, preserved: 0 },
      channels: { inserted: 0, updated: 0 },
      attendance: { inserted: 0, updated: 0, preserved: 0 },
      closings: { inserted: 0, updated: 0 },
      forecasts: { inserted: 0, updated: 0 },
    };
    const warnings = [...data.warnings];

    await connection.beginTransaction();
    try {
      for (const point of data.revenue) {
        const outcome = await writeRevenueSnapshot(connection, point, runId, sourceKey);
        written.revenue[outcome.status] += 1;
        if (outcome.status === "preserved") {
          warnings.push(`${point.observedAt}:revenue_preserved_from:${outcome.existingSourceKey}`);
          continue;
        }
        const channels = await writeRevenueChannelSnapshots(connection, outcome.snapshotId!, point.channels, runId);
        written.channels.inserted += channels.inserted;
        written.channels.updated += channels.updated;
      }
      for (const point of data.attendance) {
        const outcome = await writeAttendanceSnapshot(connection, point, runId, sourceKey);
        written.attendance[outcome.status] += 1;
        if (outcome.status === "preserved") warnings.push(`${point.observedAt}:attendance_preserved_from:${outcome.existingSourceKey}`);
      }
      for (const point of data.closings) written.closings[await writeDailyClosing(connection, point, runId)] += 1;
      for (const point of data.forecasts) written.forecasts[await writeForecast(connection, point, runId)] += 1;

      const rowsSeen = parsed.revenue + parsed.attendance + parsed.closings + parsed.forecasts;
      const rowsInserted = written.revenue.inserted + written.attendance.inserted + written.closings.inserted + written.forecasts.inserted;
      const rowsUpdated = written.revenue.updated + written.attendance.updated + written.closings.updated + written.forecasts.updated;
      const rowsRejected = written.revenue.preserved + written.attendance.preserved;
      await connection.execute(
        `UPDATE operational_import_runs SET status = 'completed', rows_seen = ?, rows_inserted = ?, rows_updated = ?, rows_rejected = ?,
         warnings_json = ?, completed_at = NOW() WHERE id = ?`,
        [rowsSeen, rowsInserted, rowsUpdated, rowsRejected, warnings.length ? JSON.stringify(warnings) : null, runId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      await connection.execute(
        "UPDATE operational_import_runs SET status = 'failed', warnings_json = ?, completed_at = NOW() WHERE id = ?",
        [JSON.stringify([error instanceof Error ? error.message.slice(0, 500) : "hopi_informe_import_failed"]), runId],
      );
      throw error;
    }

    return { status: "completed", sourceId, runId, contentHash: hash, parsed, duplicatesCollapsed, written, dateRange, warnings };
  } finally {
    connection.release();
  }
}

export type OperationalDataset = ReturnType<typeof toOperationalDataset>;

/** Rebuilds a parse result from a committed dataset so it can be imported without the original chat file. */
export function datasetToParseResult(dataset: OperationalDataset): HopiInformeParseResult {
  const index = <T>(items: T[]) => items.map((item, messageIndex) => ({ ...item, messageIndex }));
  return {
    revenue: index(dataset.revenue) as HopiInformeRevenuePoint[],
    attendance: index(dataset.attendance) as HopiInformeAttendancePoint[],
    closings: index(dataset.closings) as HopiInformeDailyClosing[],
    forecasts: index(dataset.forecasts) as HopiInformeForecastPoint[],
    warnings: dataset.warnings,
  };
}

/** Normalized, deduplicated dataset for `data/operational/` (evidence + offline reconciliation). */
export function toOperationalDataset(raw: string, options: { sourceKey?: string; fileName?: string } = {}) {
  const { data, stats } = dedupeHopiInformeExport(parseHopiInformeExport(raw));
  const strip = <T extends { messageIndex: number }>(items: T[]) => items.map(({ messageIndex: _ignored, ...rest }) => rest);
  const dates = [...data.revenue, ...data.attendance].map(point => point.businessDate).sort();
  return {
    sourceKey: options.sourceKey ?? HOPI_INFORME_SOURCE_KEY,
    sourceFile: options.fileName ?? null,
    contentHash: contentHash(raw),
    timezone: "America/Sao_Paulo",
    dateRange: dates.length ? [dates[0], dates.at(-1)!] : null,
    duplicatesCollapsed: stats,
    warnings: data.warnings,
    revenue: strip(data.revenue),
    attendance: strip(data.attendance),
    closings: strip(data.closings),
    forecasts: strip(data.forecasts),
  };
}
