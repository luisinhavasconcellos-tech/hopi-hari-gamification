import { summarizeFollowers } from "./lib/weekly360Report";

describe("weekly 360 follower variation", () => {
  it("uses the latest spreadsheet observation and the seven-day source baseline", () => {
    const rows = [
      ["Instagram", 1_537_513, 1_541_228],
      ["TikTok", 406_334, 409_092],
      ["Facebook", 984_043, 983_603],
      ["YouTube", 58_088, 58_384],
      ["LinkedIn", 17_314, 17_443],
    ].flatMap(([platform, baseline, latest]) => [
      { platform, observedDate: "2026-08-18", followerCount: baseline },
      { platform, observedDate: "2026-08-25", followerCount: latest },
    ]);
    const result = summarizeFollowers(rows as never);
    expect(result.latestObservedDate).toBe("2026-08-25");
    expect(result.targetBaselineDate).toBe("2026-08-18");
    expect(result.totalFollowers).toBe(3_009_750);
    expect(result.weeklyDelta).toBe(6_458);
  });

  it("returns null rather than zero when a seven-day comparison is unavailable", () => {
    const result = summarizeFollowers([{ platform: "Instagram", observedDate: "2026-08-25", followerCount: 1_541_228 }] as never);
    expect(result.weeklyDelta).toBeNull();
  });
});
