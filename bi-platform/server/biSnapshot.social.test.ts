import { describe, expect, it } from "vitest";
import { collectBiSnapshot } from "./lib/biSnapshot";

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeDatabase("social metrics in BI snapshot", () => {
  it("exposes the latest imported Facebook and Instagram facts with coverage dates", async () => {
    const snapshot = await collectBiSnapshot();
    expect(snapshot.social.facebook.date).toBe("2026-08-28");
    expect(snapshot.social.facebook.linkClicks).toBe(1006);
    expect(snapshot.social.facebook.interactions).toBe(543);
    expect(snapshot.social.instagram.date).toBe("2026-08-28");
    expect(snapshot.social.instagram.reach).toBe(305216);
    expect(snapshot.social.instagram.views).toBe(996058);
    expect(snapshot.coverage.warnings.some(warning => warning.startsWith("facebook:"))).toBe(false);
    expect(snapshot.coverage.warnings.some(warning => warning.startsWith("instagram:"))).toBe(false);
  }, 30_000);
});
