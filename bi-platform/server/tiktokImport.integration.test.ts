import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mysql from "mysql2/promise";

// The importer script lives outside this repository snapshot; the test only
// runs when it is present together with a database and the original export.
const IMPORTER_PATH = path.resolve(import.meta.dirname, "../scripts/import-tiktok-exports.mts");
const EXPORT_PATH = process.env.TIKTOK_EXPORT_ZIP ?? "/home/ubuntu/upload/Overview_2025-08-28_1787841428_hopihari.zip";
const hasIntegrationEnvironment =
  Boolean(process.env.DATABASE_URL) && fs.existsSync(IMPORTER_PATH) && fs.existsSync(EXPORT_PATH);
const describeIntegration = hasIntegrationEnvironment ? describe : describe.skip;

describeIntegration("TikTok importer integration", () => {
  it("reuses the completed source hash and preserves undefined viewers as null", async () => {
    const { runTiktokImport } = (await import(/* @vite-ignore */ IMPORTER_PATH)) as {
      runTiktokImport: () => Promise<{ status: string; reason?: string }>;
    };
    const db = await mysql.createConnection(process.env.DATABASE_URL!);
    const [[before]] = await db.query<any[]>("SELECT COUNT(*) AS count FROM tiktok_daily_metrics");
    const first = await runTiktokImport();
    const second = await runTiktokImport();
    const [[after]] = await db.query<any[]>("SELECT COUNT(*) AS count FROM tiktok_daily_metrics");
    const [[nullViewer]] = await db.query<any[]>("SELECT total_viewers FROM tiktok_viewer_snapshots WHERE observed_date = '2026-08-28' LIMIT 1");
    await db.end();

    expect(first).toMatchObject({ status: "skipped", reason: "content_hash_already_completed" });
    expect(second).toMatchObject({ status: "skipped", reason: "content_hash_already_completed" });
    expect(Number(after.count)).toBe(Number(before.count));
    expect(nullViewer.total_viewers).toBeNull();
  });
});
