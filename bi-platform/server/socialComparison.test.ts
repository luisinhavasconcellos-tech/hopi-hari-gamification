import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  facebook: vi.fn(),
  instagram: vi.fn(),
  tiktok: vi.fn(),
  viewers: vi.fn(),
  audience: vi.fn(),
}));

vi.mock("./db", () => ({
  listFacebookDailyMetrics: mocks.facebook,
  listInstagramDailyMetrics: mocks.instagram,
  listTiktokDailyMetrics: mocks.tiktok,
  listTiktokViewerSnapshots: mocks.viewers,
  getLatestTiktokAudience: mocks.audience,
}));

import { getSocialComparison } from "./lib/socialComparison";
import { appRouter } from "./routers";
import { UNAUTHED_ERR_MSG } from "@shared/const";

describe("social comparison", () => {
  it("filters the shared date range and keeps unavailable metrics distinct from zero", async () => {
    mocks.facebook.mockResolvedValue([
      { observedDate: "2026-08-28", followers: 100, views: 20, interactions: 5, linkClicks: null, visits: 2, viewers: 10 },
      { observedDate: "2026-08-27", followers: 99, views: 19, interactions: 4, linkClicks: null, visits: 1, viewers: 9 },
      { observedDate: "2026-08-26", followers: 98, views: 18, interactions: 3, linkClicks: null, visits: 1, viewers: 8 },
    ]);
    mocks.instagram.mockResolvedValue([{ observedDate: "2026-08-28", followers: 200, views: 30, interactions: 8, linkClicks: 2, visits: 4, reach: 25 }]);
    mocks.tiktok.mockResolvedValue([{ observedDate: "2026-08-28", followers: 300, videoViews: 40, profileViews: 7, likes: 10, comments: 3, shares: 1 }]);
    mocks.viewers.mockResolvedValue([{ observedDate: "2026-08-28", totalViewers: null, newViewers: 4, returningViewers: 2 }]);
    mocks.audience.mockResolvedValue(undefined);

    const result = await getSocialComparison({ from: "2026-08-27", to: "2026-08-28", platforms: ["facebook", "instagram", "tiktok"] });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].tiktok?.interactions).toBe(14);
    expect(result.summary.facebook.observedDays).toBe(2);
    expect(result.summary.facebook.totals.linkClicks).toBeNull();
    expect(result.summary.tiktok.latest.viewers).toBeNull();
  });

  it("rejects anonymous access to the comparison procedure", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
    await expect(caller.socialComparison({ from: "2026-08-27", to: "2026-08-28", platforms: ["facebook"] })).rejects.toMatchObject({ message: UNAUTHED_ERR_MSG });
  });

  it("accepts valid ISO dates for an authenticated comparison request", async () => {
    mocks.facebook.mockResolvedValue([]);
    mocks.instagram.mockResolvedValue([]);
    mocks.tiktok.mockResolvedValue([]);
    mocks.viewers.mockResolvedValue([]);
    mocks.audience.mockResolvedValue(undefined);

    const now = new Date();
    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "test-user",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "supabase",
        role: "user",
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      },
      req: {} as never,
      res: {} as never,
    });

    await expect(
      caller.socialComparison({
        from: "2026-08-27",
        to: "2026-08-28",
        platforms: ["facebook", "instagram", "tiktok"],
      }),
    ).resolves.toMatchObject({ from: "2026-08-27", to: "2026-08-28" });
  });
});
