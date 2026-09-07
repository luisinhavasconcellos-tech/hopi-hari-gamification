import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { HopiInformeAttendancePoint, HopiInformeRevenuePoint } from "./hopiInforme";
import { shouldPreserveOperationalSource } from "./hopiInforme";

export type OperationalSnapshotWrite = {
  status: "inserted" | "updated" | "preserved";
  snapshotId: number | null;
  existingSourceKey: string | null;
};

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
