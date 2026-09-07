import { describe, expect, it } from "vitest";
import { analyzeCampaignSales, type CampaignDefinition, type SalesDay } from "./lib/campaignSalesCorrelation";

const campaign = (overrides: Partial<CampaignDefinition> = {}): CampaignDefinition => ({
  id: "drive:1",
  driveFolderId: "folder-1",
  name: "Campanha teste",
  brand: null,
  source: "google_drive",
  periodStart: "2026-08-10",
  periodEnd: "2026-08-12",
  periodSource: "official",
  assets: 12,
  images: 10,
  videos: 2,
  postEvidence: null,
  ...overrides,
});

const day = (date: string, grossRevenueCents: number, visitors: number): SalesDay => ({
  date,
  grossRevenueCents,
  internalRevenueCents: grossRevenueCents * 0.4,
  externalRevenueCents: grossRevenueCents * 0.6,
  ticketRevenueCents: grossRevenueCents * 0.5,
  visitors,
  payingVisitors: visitors * 0.9,
  averageTicketCents: grossRevenueCents * 0.5 / (visitors * 0.9),
});

describe("campaign sales correlation", () => {
  it("keeps campaigns without official periods outside the calculation", () => {
    const subject = campaign({ periodStart: null, periodEnd: null });
    const result = analyzeCampaignSales(subject, [], [subject]);
    expect(result.status).toBe("missing_dates");
    expect(result.deltas).toBeNull();
  });

  it("compares the official campaign window with prior operational days", () => {
    const subject = campaign();
    const sales = [
      day("2026-08-07", 100_000, 100),
      day("2026-08-08", 100_000, 100),
      day("2026-08-09", 100_000, 100),
      day("2026-08-10", 120_000, 110),
      day("2026-08-11", 120_000, 110),
      day("2026-08-12", 120_000, 110),
      day("2026-08-13", 115_000, 108),
    ];
    const result = analyzeCampaignSales(subject, sales, [subject]);
    expect(result.status).toBe("ready");
    expect(result.campaign.observedDays).toBe(3);
    expect(result.baseline.observedDays).toBe(3);
    expect(result.lag.observedDays).toBe(1);
    expect(result.deltas?.grossRevenuePct).toBe(20);
    expect(result.deltas?.visitorsPct).toBe(10);
  });

  it("accepts a post-derived campaign window but keeps direct attribution separate", () => {
    const subject = campaign({
      periodSource: "post_activity",
      postEvidence: { posts: 4, observedDays: 3, interactions: 500, views: 5_000, platforms: ["Instagram"] },
    });
    const sales = [
      day("2026-08-07", 100_000, 100), day("2026-08-08", 100_000, 100), day("2026-08-09", 100_000, 100),
      day("2026-08-10", 120_000, 110), day("2026-08-11", 120_000, 110), day("2026-08-12", 120_000, 110),
    ];
    const result = analyzeCampaignSales(subject, sales, [subject]);
    expect(result.status).toBe("ready");
    expect(result.periodSource).toBe("post_activity");
    expect(result.deltas?.grossRevenuePct).toBe(20);
  });

  it("does not publish uplift without the minimum baseline sample", () => {
    const subject = campaign();
    const sales = [day("2026-08-09", 100_000, 100), day("2026-08-10", 120_000, 110), day("2026-08-11", 120_000, 110), day("2026-08-12", 120_000, 110)];
    const result = analyzeCampaignSales(subject, sales, [subject]);
    expect(result.status).toBe("insufficient_baseline_days");
    expect(result.deltas).toBeNull();
  });
});
