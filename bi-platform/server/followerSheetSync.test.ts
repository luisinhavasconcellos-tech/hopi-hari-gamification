import { describe, expect, it } from "vitest";
import { FOLLOWER_SHEET_CRON, parseFollowerSheetCsv } from "./lib/followerSheetSync";

describe("follower sheet sync", () => {
  it("parses the five supported platform columns and skips non-date rows", () => {
    const rows = parseFollowerSheetCsv([
      "Data,Instagram,TikTok,Facebook,YouTube,LinkedIn",
      "02/06/2026,1000,2000,3000,4000,5000",
      "03/06/2026,1001,,3001,4001,5001",
      "Total,1001,2000,3001,4001,5001",
    ].join("\n"));

    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatchObject({ platform: "Instagram", observedDate: "2026-06-02", followerCount: 1000, sourceRow: 2 });
    expect(rows.at(-1)).toMatchObject({ platform: "LinkedIn", observedDate: "2026-06-03", followerCount: 5001 });
  });

  it("ignores blank and invalid follower values while keeping zero as valid data", () => {
    const rows = parseFollowerSheetCsv("Data,Instagram,TikTok\n04/06/2026,0,invalid\n05/06/2026,,2.345\n");
    expect(rows).toEqual([
      { platform: "Instagram", observedDate: "2026-06-04", followerCount: 0, sourceRow: 2 },
      { platform: "TikTok", observedDate: "2026-06-05", followerCount: 2345, sourceRow: 3 },
    ]);
  });

  it("uses a six-hour UTC Heartbeat cadence", () => {
    expect(FOLLOWER_SHEET_CRON).toBe("0 0 */6 * * *");
  });
});
