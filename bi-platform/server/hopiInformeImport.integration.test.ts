import mysql, { type Connection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeAttendanceSnapshot, writeRevenueSnapshot } from "./lib/hopiInformeImport";

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeDatabase("Hopi Informe database reconciliation", () => {
  let connection: Connection;
  let existingSourceKey: string;
  let incomingSourceKey: string;
  let existingRunId: number;
  let incomingRunId: number;

  beforeEach(async () => {
    connection = await mysql.createConnection(process.env.DATABASE_URL!);
    await connection.beginTransaction();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    existingSourceKey = `test-existing-${suffix}`;
    incomingSourceKey = `test-hopi-informe-${suffix}`;
    const createSource = async (key: string) => {
      const [source] = await connection.execute<ResultSetHeader>(
        "INSERT INTO operational_sources (source_key, source_type, name) VALUES (?, 'operational_message', ?)",
        [key, key],
      );
      const [run] = await connection.execute<ResultSetHeader>(
        "INSERT INTO operational_import_runs (source_id, content_hash, status) VALUES (?, ?, 'started')",
        [source.insertId, `${key}-hash`],
      );
      return Number(run.insertId);
    };
    existingRunId = await createSource(existingSourceKey);
    incomingRunId = await createSource(incomingSourceKey);
  });

  afterEach(async () => {
    await connection.rollback();
    await connection.end();
  });

  it("preserves a revenue fact already owned by a different source", async () => {
    const observedAt = new Date("2037-12-30T23:00:00.000Z");
    await connection.execute(
      `INSERT INTO revenue_snapshots
       (observed_at, business_date, local_hour, internal_revenue_cents, external_revenue_cents,
        gross_revenue_cents, internal_per_capita_cents, source_run_id)
       VALUES (?, '2037-12-30', 20, 10000, 20000, 30000, NULL, ?)`,
      [observedAt, existingRunId],
    );
    const result = await writeRevenueSnapshot(connection, {
      observedAt: observedAt.toISOString(), businessDate: "2037-12-30", localHour: 20,
      internalRevenueCents: 99999, externalRevenueCents: 99999, grossRevenueCents: 199998,
      internalPerCapitaCents: 999, channels: {}, messageIndex: 1,
    }, incomingRunId, incomingSourceKey);
    expect(result).toMatchObject({ status: "preserved", existingSourceKey });
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT gross_revenue_cents, source_run_id FROM revenue_snapshots WHERE observed_at = ?",
      [observedAt],
    );
    expect(Number(rows[0].gross_revenue_cents)).toBe(30000);
    expect(Number(rows[0].source_run_id)).toBe(existingRunId);
  });

  it("re-imports the same attendance timestamp idempotently for the same source", async () => {
    const point = {
      observedAt: "2037-12-31T23:00:00.000Z", businessDate: "2037-12-31", localHour: 20,
      publicCount: 100, payingCount: 90, complimentaryCount: 10, entriesInterval: 4,
      exitsInterval: 3, currentlyInPark: 97, messageIndex: 1,
    };
    expect((await writeAttendanceSnapshot(connection, point, incomingRunId, incomingSourceKey)).status).toBe("inserted");
    expect((await writeAttendanceSnapshot(connection, { ...point, currentlyInPark: 96 }, incomingRunId, incomingSourceKey)).status).toBe("updated");
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS count, MAX(currently_in_park) AS current FROM attendance_snapshots WHERE observed_at = ?",
      [new Date(point.observedAt)],
    );
    expect(Number(rows[0].count)).toBe(1);
    expect(Number(rows[0].current)).toBe(96);
  });
});
