import crypto from "node:crypto";
import { getPool } from "../_core/mysqlPool";
import { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

export const FOLLOWER_SHEET_ID = "1vAZbigUr_iSzdWqhP79VnsEfwua6KPaIYud8hOfNecY";
export const FOLLOWER_SHEET_URL = `https://docs.google.com/spreadsheets/d/${FOLLOWER_SHEET_ID}/edit?usp=sharing`;
export const FOLLOWER_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${FOLLOWER_SHEET_ID}/export?format=csv`;
export const FOLLOWER_SHEET_NAME = "Log Diário";
export const FOLLOWER_SHEET_SOURCE_KEY = "google_sheet:hopi-weekly-tracker-followers";
export const FOLLOWER_SHEET_CRON = "0 0 */6 * * *";

const PLATFORMS = ["Instagram", "TikTok", "Facebook", "YouTube", "LinkedIn"] as const;

type RowPacket = RowDataPacket & Record<string, unknown>;
export type FollowerSheetObservation = {
  platform: string;
  observedDate: string;
  followerCount: number;
  sourceRow: number;
};
export type FollowerSheetSyncResult = {
  status: "completed" | "content_hash_already_imported";
  sourceId: number;
  runId?: number;
  observations: number;
  inserted: number;
  updated: number;
  rejected: number;
  warningCount: number;
  dateRange: [string, string];
};


function isoDate(value: unknown) {
  const match = String(value ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

// Plain integers or pt-BR/en thousands grouping ("1.234.567", "1,234,567").
// Anything else (dates, "1.5M", percentages) is rejected instead of being
// turned into a bogus follower count by stripping the non-digits.
const FOLLOWER_COUNT_PATTERN = /^\d{1,3}(?:[.,]\d{3})+$|^\d+$/;

function followerCount(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw || !FOLLOWER_COUNT_PATTERN.test(raw)) return null;
  const count = Number(raw.replace(/[.,]/g, ""));
  return Number.isSafeInteger(count) && count >= 0 && count <= 100_000_000 ? count : null;
}

export function parseFollowerSheetCsv(text: string): FollowerSheetObservation[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(field); field = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field); rows.push(row); row = []; field = ""; continue;
    }
    field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const observations: FollowerSheetObservation[] = [];
  rows.forEach((values, index) => {
    const observedDate = isoDate(values[0]);
    if (!observedDate) return;
    PLATFORMS.forEach((platform, platformIndex) => {
      const count = followerCount(values[platformIndex + 1]);
      if (count !== null) observations.push({ platform, observedDate, followerCount: count, sourceRow: index + 1 });
    });
  });
  return observations;
}

async function fetchFollowerSheet() {
  const response = await fetch(FOLLOWER_SHEET_CSV_URL, {
    headers: { accept: "text/csv" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Follower sheet request failed (${response.status})`);
  const text = await response.text();
  const observations = parseFollowerSheetCsv(text);
  if (!observations.length) throw new Error("Follower sheet returned no valid observations");
  return { raw: Buffer.from(text, "utf8"), observations };
}

export async function syncFollowerSheet(): Promise<FollowerSheetSyncResult> {
  const { raw, observations } = await fetchFollowerSheet();
  const contentHash = crypto.createHash("sha256").update(raw).digest("hex");
  const db = getPool();
  const connection = await db.getConnection();
  try {
    await connection.execute(
      `INSERT INTO operational_sources (source_key, source_type, name, external_id, source_url, active)
       VALUES (?, 'google_sheet', ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name), external_id = VALUES(external_id), source_url = VALUES(source_url), active = 1`,
      [FOLLOWER_SHEET_SOURCE_KEY, "Hopi weekly tracker · seguidores", FOLLOWER_SHEET_ID, FOLLOWER_SHEET_URL],
    );
    const [sourceRows] = await connection.execute<RowPacket[]>("SELECT id FROM operational_sources WHERE source_key = ? LIMIT 1", [FOLLOWER_SHEET_SOURCE_KEY]);
    const sourceId = Number(sourceRows[0]?.id);
    if (!sourceId) throw new Error("Follower sheet source could not be resolved");

    const [existingRows] = await connection.execute<RowPacket[]>(
      "SELECT id, status FROM operational_import_runs WHERE source_id = ? AND content_hash = ? LIMIT 1",
      [sourceId, contentHash],
    );
    if (existingRows[0]?.status === "completed") {
      return { status: "content_hash_already_imported", sourceId, observations: observations.length, inserted: 0, updated: 0, rejected: 0, warningCount: 0, dateRange: [observations.map(row => row.observedDate).sort()[0], observations.map(row => row.observedDate).sort().at(-1)!] };
    }

    // (source_id, content_hash) is unique: a previous failed/aborted run with
    // the same content must be reused, otherwise every retry hits ER_DUP_ENTRY
    // until the sheet changes.
    const [runResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO operational_import_runs (source_id, content_hash, status, rows_seen, rows_inserted, rows_updated, rows_rejected, warnings_json)
       VALUES (?, ?, 'started', 0, 0, 0, 0, NULL)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), status = 'started', rows_seen = 0, rows_inserted = 0, rows_updated = 0,
         rows_rejected = 0, warnings_json = NULL, started_at = NOW(), completed_at = NULL`,
      [sourceId, contentHash],
    );
    const runId = Number(runResult.insertId);
    if (!runId) throw new Error("Follower sheet import run could not be created");
    const [profileRows] = await connection.execute<RowPacket[]>(
      `SELECT p.id AS profile_id, p.platform FROM social_profiles p JOIN social_venues v ON v.id = p.venue_id
       WHERE v.is_hopi_hari = 1 AND p.platform IN ('Instagram', 'TikTok', 'Facebook', 'YouTube', 'LinkedIn')`,
    );
    const profileByPlatform = new Map<string, number>(profileRows.map(profile => [String(profile.platform), Number(profile.profile_id)]));
    let inserted = 0;
    let updated = 0;
    let rejected = 0;
    const warnings: string[] = [];

    await connection.beginTransaction();
    try {
      for (const observation of observations) {
        const profileId = profileByPlatform.get(observation.platform);
        if (!profileId) { rejected += 1; warnings.push(`missing_profile:${observation.platform}`); continue; }
        const [existing] = await connection.execute<RowPacket[]>("SELECT id FROM social_follower_snapshots WHERE profile_id = ? AND observed_date = ? LIMIT 1", [profileId, observation.observedDate]);
        await connection.execute(
          `INSERT INTO social_follower_snapshots (profile_id, observed_date, follower_count, source_run_id, source_sheet, source_row)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE follower_count = VALUES(follower_count), source_run_id = VALUES(source_run_id), source_sheet = VALUES(source_sheet), source_row = VALUES(source_row)`,
          [profileId, observation.observedDate, observation.followerCount, runId, FOLLOWER_SHEET_NAME, observation.sourceRow],
        );
        if (existing[0]) updated += 1; else inserted += 1;
      }
      await connection.execute(
        `UPDATE operational_import_runs SET status = 'completed', rows_seen = ?, rows_inserted = ?, rows_updated = ?, rows_rejected = ?, warnings_json = ?, completed_at = NOW() WHERE id = ?`,
        [observations.length, inserted, updated, rejected, warnings.length ? JSON.stringify(warnings) : null, runId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      await connection.execute("UPDATE operational_import_runs SET status = 'failed', warnings_json = ?, completed_at = NOW() WHERE id = ?", [JSON.stringify([String(error)]), runId]);
      throw error;
    }

    const dates = observations.map(row => row.observedDate).sort();
    return { status: "completed", sourceId, runId, observations: observations.length, inserted, updated, rejected, warningCount: warnings.length, dateRange: [dates[0], dates.at(-1)!] };
  } finally {
    connection.release();
  }
}

export async function getFollowerSheetSourceByTaskUid(taskUid: string) {
  const [rows] = await getPool().query<RowPacket[]>("SELECT * FROM operational_sources WHERE schedule_cron_task_uid = ? AND source_key = ? LIMIT 1", [taskUid, FOLLOWER_SHEET_SOURCE_KEY]);
  return rows[0] as (RowPacket & { active: number }) | undefined;
}

export async function saveFollowerSheetSchedule(taskUid: string) {
  await getPool().execute("UPDATE operational_sources SET schedule_cron_task_uid = ? WHERE source_key = ?", [taskUid, FOLLOWER_SHEET_SOURCE_KEY]);
}

export async function getFollowerSheetStatus() {
  const [sources] = await getPool().query<RowPacket[]>("SELECT id, active, schedule_cron_task_uid FROM operational_sources WHERE source_key = ? LIMIT 1", [FOLLOWER_SHEET_SOURCE_KEY]);
  const source = sources[0];
  if (!source) return { configured: false, active: false, scheduleCronTaskUid: null, lastRun: null };
  const [runs] = await getPool().query<RowPacket[]>("SELECT status, rows_seen, rows_rejected, completed_at FROM operational_import_runs WHERE source_id = ? ORDER BY started_at DESC LIMIT 1", [source.id]);
  return { configured: true, active: Number(source.active) === 1, scheduleCronTaskUid: source.schedule_cron_task_uid ?? null, lastRun: runs[0] ? { status: String(runs[0].status), rowsSeen: Number(runs[0].rows_seen), rowsRejected: Number(runs[0].rows_rejected), completedAt: runs[0].completed_at ?? null } : null };
}
