// Hopi Hari — Derived KPI library
// Pure functions implementing the formulas from the KPI guide (sections 02–06, 11–12).

export interface PostMetric {
  timestamp: string | null;
  like_count: number;
  comments_count: number;
  share_count?: number | null;
  view_count?: number | null;
  caption?: string | null;
  media_type?: string | null;
}

export type Platform = "instagram" | "tiktok" | "facebook" | "youtube" | "linkedin";

// Industry benchmarks for Brazilian theme parks & entertainment (doc section 11)
export const BENCHMARKS: Record<Platform, {
  er: { good: number; great: number };          // engagement rate (%)
  postsPerWeek: { good: number; great: number };
  reachRate?: { good: number; great: number };
}> = {
  instagram: { er: { good: 1.5, great: 3.0 }, postsPerWeek: { good: 5, great: 7 }, reachRate: { good: 15, great: 25 } },
  tiktok:    { er: { good: 5.0, great: 9.0 }, postsPerWeek: { good: 4, great: 7 } },
  facebook:  { er: { good: 0.5, great: 1.5 }, postsPerWeek: { good: 5, great: 7 } },
  youtube:   { er: { good: 4.0, great: 8.0 }, postsPerWeek: { good: 1, great: 3 } },
  linkedin:  { er: { good: 2.0, great: 4.0 }, postsPerWeek: { good: 3, great: 5 } },
};

// ---------- Core formulas ----------

export const interactions = (p: PostMetric) =>
  (p.like_count ?? 0) + (p.comments_count ?? 0) + (p.share_count ?? 0);

// Average interactions per post / followers — standard channel ER vs follower base.
export function engagementByFollowers(posts: PostMetric[], followers: number): number | null {
  if (!followers || followers <= 0 || posts.length === 0) return null;
  const total = posts.reduce((s, p) => s + interactions(p), 0);
  return ((total / posts.length) / followers) * 100;
}

// Weighted ER (Σ interactions / Σ views). Avoids tiny-view posts skewing the avg.
export function engagementByViews(posts: PostMetric[]): number | null {
  const withViews = posts.filter((p) => (p.view_count ?? 0) > 0);
  if (!withViews.length) return null;
  const totalInter = withViews.reduce((s, p) => s + interactions(p), 0);
  const totalViews = withViews.reduce((s, p) => s + (p.view_count ?? 0), 0);
  if (!totalViews) return null;
  return (totalInter / totalViews) * 100;
}

// Virality ≈ (shares * 100) / views when available; fallback to shares / total interactions.
// Returns null if no posts have share_count populated.
export function viralityScore(posts: PostMetric[]): number | null {
  const withShares = posts.filter((p) => p.share_count != null);
  if (!withShares.length) return null;
  const withViews = withShares.filter((p) => (p.view_count ?? 0) > 0);
  if (withViews.length) {
    const sum = withViews.reduce((s, p) => s + ((p.share_count ?? 0) * 100) / (p.view_count ?? 1), 0);
    return sum / withViews.length;
  }
  // Fallback for channels without view data (LinkedIn): shares as % of total interactions
  const totalInter = withShares.reduce((s, p) => s + interactions(p), 0);
  const totalShares = withShares.reduce((s, p) => s + (p.share_count ?? 0), 0);
  if (!totalInter) return null;
  return (totalShares / totalInter) * 100;
}

// Reach Rate ≈ avg views per post / followers (proxy when impressions unavailable).
export function reachRate(posts: PostMetric[], followers: number): number | null {
  if (!followers) return null;
  const withViews = posts.filter((p) => (p.view_count ?? 0) > 0);
  if (!withViews.length) return null;
  const avgViews = withViews.reduce((s, p) => s + (p.view_count ?? 0), 0) / withViews.length;
  return (avgViews / followers) * 100;
}

// Share Rate = Σ shares / Σ views × 100 (industry standard).
// Fallback when views are unavailable: shares / total interactions × 100.
export function shareRate(posts: PostMetric[]): number | null {
  const withShares = posts.filter((p) => p.share_count != null);
  if (!withShares.length) return null;
  const totalShares = withShares.reduce((s, p) => s + (p.share_count ?? 0), 0);
  if (!totalShares) return 0;

  const withViews = withShares.filter((p) => (p.view_count ?? 0) > 0);
  if (withViews.length) {
    const totalViews = withViews.reduce((s, p) => s + (p.view_count ?? 0), 0);
    const totalSharesWithViews = withViews.reduce((s, p) => s + (p.share_count ?? 0), 0);
    if (totalViews > 0) return (totalSharesWithViews / totalViews) * 100;
  }

  const totalInter = withShares.reduce((s, p) => s + interactions(p), 0);
  if (!totalInter) return null;
  return (totalShares / totalInter) * 100;
}

export function postsPerWeek(posts: PostMetric[]): number {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  return posts.filter((p) => p.timestamp && new Date(p.timestamp).getTime() >= weekAgo).length;
}

export function avgGapHours(posts: PostMetric[]): number | null {
  const ts = posts
    .map((p) => p.timestamp && new Date(p.timestamp).getTime())
    .filter((t): t is number => !!t)
    .sort((a, b) => b - a)
    .slice(0, 30);
  if (ts.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < ts.length; i++) gaps.push((ts[i - 1] - ts[i]) / 3600000);
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}

// ---------- Window helpers ----------

export function inWindow(posts: PostMetric[], hoursAgo: number, hoursAgoEnd = 0): PostMetric[] {
  const now = Date.now();
  const start = now - hoursAgo * 3600 * 1000;
  const end = now - hoursAgoEnd * 3600 * 1000;
  return posts.filter((p) => {
    if (!p.timestamp) return false;
    const t = new Date(p.timestamp).getTime();
    return t >= start && t <= end;
  });
}

export const last24h = (posts: PostMetric[]) => inWindow(posts, 24);
export const last7d = (posts: PostMetric[]) => inWindow(posts, 24 * 7);
export const lastWeek = (posts: PostMetric[]) => inWindow(posts, 24 * 14, 24 * 7);

export function deltaPct(curr: number, prev: number): number {
  if (!prev) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

// Hour-of-day in the business timezone (America/Sao_Paulo), independent of the viewer's machine.
const saoPauloHourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  hour12: false,
});
export function saoPauloHour(date: Date): number {
  // "24" can appear for midnight in some engines with hour12:false
  return Number(saoPauloHourFormatter.format(date)) % 24;
}

// Best posting hour: avg ER per hour-of-day. Uses ER-by-views if available, else interactions/post.
export function bestPostingHour(posts: PostMetric[]): { hour: number; avgER: number } | null {
  const hasViews = posts.some((p) => (p.view_count ?? 0) > 0);
  const byHour = new Map<number, number[]>();
  posts.forEach((p) => {
    if (!p.timestamp) return;
    const ts = new Date(p.timestamp);
    if (Number.isNaN(ts.getTime())) return;
    const hour = saoPauloHour(ts);
    let er: number | null = null;
    if (hasViews) {
      if (!p.view_count) return;
      er = (interactions(p) / p.view_count) * 100;
    } else {
      er = interactions(p);
    }
    if (!byHour.has(hour)) byHour.set(hour, []);
    byHour.get(hour)!.push(er);
  });
  let best: { hour: number; avgER: number } | null = null;
  byHour.forEach((arr, hour) => {
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (!best || avg > best.avgER) best = { hour, avgER: avg };
  });
  return best;
}

export function topPosts<T extends PostMetric>(posts: T[], n = 5): T[] {
  return [...posts]
    .filter((p) => (p.view_count ?? 0) > 0 || interactions(p) > 0)
    .sort((a, b) => {
      const erA = a.view_count ? interactions(a) / a.view_count : interactions(a);
      const erB = b.view_count ? interactions(b) / b.view_count : interactions(b);
      return erB - erA;
    })
    .slice(0, n);
}

// ---------- Benchmark scoring ----------

export type BenchmarkStatus = "great" | "good" | "below";

export function scoreEngagement(platform: Platform, erPct: number | null): BenchmarkStatus {
  if (erPct == null) return "below";
  const b = BENCHMARKS[platform].er;
  if (erPct >= b.great) return "great";
  if (erPct >= b.good) return "good";
  return "below";
}

export function scoreCadence(platform: Platform, perWeek: number): BenchmarkStatus {
  const b = BENCHMARKS[platform].postsPerWeek;
  if (perWeek >= b.great) return "great";
  if (perWeek >= b.good) return "good";
  return "below";
}

export const STATUS_COLOR: Record<BenchmarkStatus, string> = {
  great: "text-success bg-success/10 border-success/30",
  good: "text-foreground bg-warning/10 border-warning/30",
  below: "text-destructive bg-destructive/10 border-destructive/30",
};

export const STATUS_LABEL: Record<BenchmarkStatus, string> = {
  great: "Acima da meta",
  good: "Dentro da média",
  below: "Abaixo da meta",
};

// ---------- Aggregated channel snapshot ----------

export interface ChannelSnapshot {
  platform: Platform;
  followers: number;
  postsTotal: number;
  postsLast7d: number;
  postsPrevWeek: number;
  cadencePerWeek: number;
  cadenceDeltaPct: number;
  erFollowers: number | null;
  erFollowersPrev: number | null;
  erFollowersDeltaPct: number;
  erViews: number | null;
  reachRate: number | null;
  virality: number | null;
  shareRate: number | null;
  avgGapHours: number | null;
  bestHour: { hour: number; avgER: number } | null;
  erStatus: BenchmarkStatus;
  cadenceStatus: BenchmarkStatus;
}

// Default analysis window per platform (days). Low-cadence channels need longer windows.
export const DEFAULT_WINDOW_DAYS: Record<Platform, number> = {
  instagram: 7,
  tiktok: 7,
  facebook: 7,
  youtube: 30,
  linkedin: 30,
};

export function buildChannelSnapshot(
  platform: Platform,
  posts: PostMetric[],
  followers: number,
): ChannelSnapshot & { windowDays: number } {
  let windowDays = DEFAULT_WINDOW_DAYS[platform];
  // Auto-expand if nothing in the default window (up to 90 days)
  for (const d of [windowDays, 30, 60, 90]) {
    if (inWindow(posts, d * 24).length > 0) { windowDays = d; break; }
  }
  const week = inWindow(posts, windowDays * 24);
  const prev = inWindow(posts, windowDays * 48, windowDays * 24);
  const erF = engagementByFollowers(week, followers);
  const erFPrev = engagementByFollowers(prev, followers);
  const weeks = Math.max(1, windowDays / 7);
  const cadence = week.length / weeks;
  const cadencePrev = prev.length / weeks;
  return {
    platform,
    followers,
    postsTotal: posts.length,
    postsLast7d: week.length,
    postsPrevWeek: prev.length,
    cadencePerWeek: Math.round(cadence * 10) / 10,
    cadenceDeltaPct: deltaPct(cadence, cadencePrev),
    erFollowers: erF,
    erFollowersPrev: erFPrev,
    erFollowersDeltaPct: erF != null && erFPrev != null ? deltaPct(erF, erFPrev) : 0,
    erViews: engagementByViews(week),
    reachRate: reachRate(week, followers),
    // YouTube: shares aren't exposed via public API, so we redefine virality as
    // "best video reach beyond subscribers" = max views / subscribers * 100.
    // Share Rate is N/A for YouTube.
    virality: (() => {
      if (platform === "youtube") {
        const withViews = week.filter((p) => (p.view_count ?? 0) > 0);
        if (!withViews.length || !followers) return null;
        const maxViews = Math.max(...withViews.map((p) => p.view_count ?? 0));
        return (maxViews / followers) * 100;
      }
      const v = viralityScore(week);
      if (v != null) return v;
      const recent = [...posts]
        .filter((p) => p.share_count != null && p.timestamp)
        .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
        .slice(0, 12);
      return viralityScore(recent);
    })(),
    shareRate: (() => {
      if (platform === "youtube") return null;
      const s = shareRate(week);
      if (s != null) return s;
      const recent = [...posts]
        .filter((p) => p.share_count != null && p.timestamp)
        .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
        .slice(0, 12);
      return shareRate(recent);
    })(),
    avgGapHours: avgGapHours(posts),
    bestHour: bestPostingHour(posts),
    erStatus: scoreEngagement(platform, erF),
    cadenceStatus: scoreCadence(platform, cadence),
    windowDays,
  };
}
