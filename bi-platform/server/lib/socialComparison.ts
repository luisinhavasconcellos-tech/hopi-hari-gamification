import {
  getLatestTiktokAudience,
  listFacebookDailyMetrics,
  listInstagramDailyMetrics,
  listTiktokDailyMetrics,
  listTiktokViewerSnapshots,
} from "../db";

type Platform = "facebook" | "instagram" | "tiktok";
type MetricValue = number | null;

type DailyMetric = {
  date: string;
  followers: MetricValue;
  views: MetricValue;
  interactions: MetricValue;
  linkClicks: MetricValue;
  visits: MetricValue;
  reach: MetricValue;
  viewers: MetricValue;
  profileViews: MetricValue;
};

export type SocialComparison = {
  from: string;
  to: string;
  platforms: Platform[];
  rows: Array<{ date: string } & Partial<Record<Platform, DailyMetric>>>;
  summary: Record<Platform, {
    latestDate: string | null;
    observedDays: number;
    latest: Record<string, MetricValue>;
    totals: Record<string, MetricValue>;
  }>;
};

const emptyMetric = (): DailyMetric => ({
  date: "",
  followers: null,
  views: null,
  interactions: null,
  linkClicks: null,
  visits: null,
  reach: null,
  viewers: null,
  profileViews: null,
});

const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
const add = (left: number | null, right: number | null) => left === null || right === null ? null : left + right;

export async function getSocialComparison(input: {
  from: string;
  to: string;
  platforms: Platform[];
}): Promise<SocialComparison> {
  const [facebook, instagram, tiktok, tiktokViewers, tiktokAudience] = await Promise.all([
    input.platforms.includes("facebook") ? listFacebookDailyMetrics(365) : Promise.resolve([]),
    input.platforms.includes("instagram") ? listInstagramDailyMetrics(365) : Promise.resolve([]),
    input.platforms.includes("tiktok") ? listTiktokDailyMetrics(365) : Promise.resolve([]),
    input.platforms.includes("tiktok") ? listTiktokViewerSnapshots(365) : Promise.resolve([]),
    input.platforms.includes("tiktok") ? getLatestTiktokAudience() : Promise.resolve(undefined),
  ]);

  const rows = new Map<string, { date: string } & Partial<Record<Platform, DailyMetric>>>();
  const put = (platform: Platform, metric: DailyMetric) => {
    if (!inRange(metric.date, input.from, input.to)) return;
    const row = rows.get(metric.date) ?? { date: metric.date };
    row[platform] = metric;
    rows.set(metric.date, row);
  };

  for (const row of facebook) put("facebook", {
    ...emptyMetric(), date: row.observedDate, followers: row.followers, views: row.views,
    interactions: row.interactions, linkClicks: row.linkClicks, visits: row.visits, viewers: row.viewers,
  });
  for (const row of instagram) put("instagram", {
    ...emptyMetric(), date: row.observedDate, followers: row.followers, views: row.views,
    interactions: row.interactions, linkClicks: row.linkClicks, visits: row.visits, reach: row.reach,
  });
  const viewerByDate = new Map(tiktokViewers.map(row => [row.observedDate, row]));
  for (const row of tiktok) {
    const viewers = viewerByDate.get(row.observedDate);
    put("tiktok", {
      ...emptyMetric(), date: row.observedDate, followers: row.followers, views: row.videoViews,
      interactions: add(add(row.likes, row.comments), row.shares), profileViews: row.profileViews,
      viewers: viewers?.totalViewers ?? null,
    });
  }

  const sortedRows = [...rows.values()].sort((a, b) => b.date.localeCompare(a.date));
  const summary = {} as SocialComparison["summary"];
  for (const platform of input.platforms) {
    const platformRows = sortedRows.flatMap(row => row[platform] ? [row[platform]!] : []);
    const latestRow = platformRows[0];
    const keys = ["followers", "views", "interactions", "linkClicks", "visits", "reach", "viewers", "profileViews"];
    const latest: Record<string, MetricValue> = {};
    const totals: Record<string, MetricValue> = {};
    for (const key of keys) {
      latest[key] = latestRow?.[key as keyof DailyMetric] as MetricValue ?? null;
      const values = platformRows.map(row => row[key as keyof DailyMetric] as MetricValue);
      totals[key] = values.length > 0 && values.every(value => value !== null)
        ? values.reduce((sum, value) => sum + (value as number), 0)
        : null;
    }
    summary[platform] = { latestDate: latestRow?.date ?? null, observedDays: platformRows.length, latest, totals };
  }

  return { from: input.from, to: input.to, platforms: input.platforms, rows: sortedRows, summary };
}
