import { afterEach, describe, expect, it, vi } from "vitest";
import { aggregateXMetrics, fetchXSnapshot } from "./lib/xApi";

describe("X API integration", () => {
  afterEach(() => {
    delete process.env.X_BEARER_TOKEN;
    vi.unstubAllGlobals();
  });

  it("returns a safe credential-missing status without making a request", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    const snapshot = await fetchXSnapshot();
    expect(snapshot).toMatchObject({ available: false, configured: false, reason: "credential_missing" });
    expect(request).not.toHaveBeenCalled();
  });

  it("aggregates public engagement metrics without inventing missing values", () => {
    expect(
      aggregateXMetrics([
        { id: "1", text: "A", public_metrics: { like_count: 8, reply_count: 2 } },
        { id: "2", text: "B", public_metrics: { retweet_count: 3, impression_count: 100 } },
      ]),
    ).toEqual({ likes: 8, replies: 2, reposts: 3, quotes: 0, bookmarks: 0, impressions: 100 });
  });
});
