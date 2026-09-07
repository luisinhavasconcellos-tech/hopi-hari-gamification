import { describe, expect, it } from "vitest";
import XLSX from "xlsx";
import { parseAudienceXlsx, parseFollowersXlsx, parseOverviewCsv, parseViewersCsv } from "./lib/tiktokExport";

function workbookBuffer(sheets: Record<string, unknown[][]>) {
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

describe("TikTok exports", () => {
  it("anchors the first row to the window start in the file name and rolls the year after December", () => {
    const csv = [
      '"Date","Video Views","Profile Views","Likes","Comments","Shares"',
      '"28 August","139654","1107","12248","54","1242"',
      '"31 December","1","2","3","4","5"',
      '"1 January","6","7","8","9","10"',
    ].join("\n");
    // Real export: Overview_2025-08-28_1787841428_hopihari.zip (downloaded 2026-08-27)
    // covers 28 Aug 2025 → Aug 2026, so the file date is the START of the window.
    expect(parseOverviewCsv(csv, "Overview_2025-08-28_1787841428_hopihari")).toEqual([
      { observedDate: "2025-08-28", videoViews: 139654, profileViews: 1107, likes: 12248, comments: 54, shares: 1242 },
      { observedDate: "2025-12-31", videoViews: 1, profileViews: 2, likes: 3, comments: 4, shares: 5 },
      { observedDate: "2026-01-01", videoViews: 6, profileViews: 7, likes: 8, comments: 9, shares: 10 },
    ]);
  });

  it("rejects rows dated before the export window start", () => {
    const csv = ['"Date","Video Views"', '"1 January","1"'].join("\n");
    expect(() => parseOverviewCsv(csv, "Overview_2025-08-28")).toThrow(/tiktok_date_before_export_window/);
  });

  it("still rolls the year forward when no full export date is available", () => {
    const csv = ['"Date","Video Views"', '"31 December","1"', '"1 January","2"'].join("\n");
    expect(parseOverviewCsv(csv, "Overview 2025").map(row => row.observedDate)).toEqual(["2025-12-31", "2026-01-01"]);
  });

  it("preserves undefined viewer totals as unavailable", () => {
    const csv = ['"Date","Total Viewers","New Viewers","Returning Viewers"', '"28 August","undefined","0","0"'].join("\n");
    expect(parseViewersCsv(csv, "Viewers_2025-08-28")[0]).toEqual({ observedDate: "2025-08-28", totalViewers: null, newViewers: 0, returningViewers: 0 });
  });

  it("parses follower history and decimal audience distributions", () => {
    const buffer = workbookBuffer({
      FollowerHistory: [["Date", "Followers", "Difference in followers from previous day"], ["28 August", "308209", "583"]],
    });
    const genderBuffer = workbookBuffer({ FollowerGender: [["Gender", "Distribution"], ["Female", "0.59"], ["Male", "0.41"]] });
    const territoriesBuffer = workbookBuffer({ FollowerTopTerritories: [["Top territories", "Distribution"], ["BR", "0.852"], ["PT", "0.003"]] });
    expect(parseFollowersXlsx(buffer, "Followers_2025-08-28")).toEqual([{ observedDate: "2025-08-28", followers: 308209 }]);
    expect(parseAudienceXlsx(genderBuffer, territoriesBuffer)).toEqual({
      gender: [{ name: "Female", sharePct: 59 }, { name: "Male", sharePct: 41 }],
      territories: [{ name: "BR", sharePct: 85.2 }, { name: "PT", sharePct: 0.3 }],
    });
  });
});
