import mysql, { type RowDataPacket } from "mysql2/promise";
import { describe, expect, it } from "vitest";
import { syncDriveCampaigns } from "./lib/driveCampaignSync";

const hasIntegrationEnvironment = Boolean(
  process.env.DATABASE_URL && process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY,
);
const describeIntegration = hasIntegrationEnvironment ? describe : describe.skip;

describeIntegration("Drive campaign synchronization integration", () => {
  it("stabilizes campaign and asset cardinality after ingesting any newly discovered real assets", async () => {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    try {
      const [before] = await connection.execute<RowDataPacket[]>(
        "SELECT (SELECT COUNT(*) FROM drive_campaigns WHERE active = 1) AS campaigns, (SELECT COUNT(*) FROM drive_campaign_assets WHERE active = 1) AS assets",
      );
      const first = await syncDriveCampaigns();
      const [afterFirst] = await connection.execute<RowDataPacket[]>(
        "SELECT (SELECT COUNT(*) FROM drive_campaigns WHERE active = 1) AS campaigns, (SELECT COUNT(*) FROM drive_campaign_assets WHERE active = 1) AS assets",
      );
      const second = await syncDriveCampaigns();
      const [afterSecond] = await connection.execute<RowDataPacket[]>(
        "SELECT (SELECT COUNT(*) FROM drive_campaigns WHERE active = 1) AS campaigns, (SELECT COUNT(*) FROM drive_campaign_assets WHERE active = 1) AS assets",
      );
      expect(first.rowsInserted).toBeGreaterThanOrEqual(0);
      expect(second.rowsInserted).toBe(0);
      expect(second.rowsUpdated).toBeLessThanOrEqual(second.foldersSeen);
      expect(Number(afterFirst[0].campaigns)).toBeGreaterThanOrEqual(Number(before[0].campaigns));
      expect(Number(afterFirst[0].assets)).toBeGreaterThanOrEqual(Number(before[0].assets));
      expect(Number(afterSecond[0].campaigns)).toBe(Number(afterFirst[0].campaigns));
      expect(Number(afterSecond[0].assets)).toBe(Number(afterFirst[0].assets));
    } finally {
      await connection.end();
    }
  }, 120_000);

  it("rejects a Drive file when configured as the synchronization root", async () => {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        "SELECT drive_file_id FROM drive_campaign_assets WHERE active = 1 LIMIT 1",
      );
      await expect(syncDriveCampaigns(String(rows[0].drive_file_id))).rejects.toThrow("not a folder");
    } finally {
      await connection.end();
    }
  }, 30_000);
});
