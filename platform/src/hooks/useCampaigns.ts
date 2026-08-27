import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CampaignAsset = { id: string; name: string };

export type CampaignSummary = {
  drive_folder_id: string;
  folder_url: string;
  assets: { total: number; images: number; videos: number };
  formats: string[];
  subfolders: string[];
  previews: CampaignAsset[];
};

export type CampaignRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  period_start: string | null;
  period_end: string | null;
  source: string;
  summary: CampaignSummary;
};

export type CampaignPost = {
  platform: string;
  post_url: string;
  caption: string | null;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
};

const PLATFORMS = [
  { table: "instagram_posts", label: "Instagram" },
  { table: "tiktok_posts", label: "TikTok" },
  { table: "facebook_posts", label: "Facebook" },
  { table: "youtube_posts", label: "YouTube" },
  { table: "linkedin_posts", label: "LinkedIn" },
] as const;

export const driveThumb = (id: string, w = 600) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;

/** Janela de veiculação: início das peças até 21 dias após a última peça. */
const windowOf = (c: CampaignRow) => {
  const start = c.period_start ? new Date(`${c.period_start}T00:00:00Z`) : null;
  const endBase = c.period_end ?? c.period_start;
  const end = endBase ? new Date(`${endBase}T23:59:59Z`) : null;
  if (end) end.setUTCDate(end.getUTCDate() + 21);
  return { start, end };
};

export type FollowerDay = { date: string; total: number };

export const LAGS = [1, 3, 7] as const;
export type Lag = (typeof LAGS)[number];

const dayMs = 86400000;
const tsOf = (d: string) => new Date(`${d}T12:00:00Z`).getTime();

/** Valor interpolado da série de seguidores em um instante; null fora do intervalo. */
function valueAt(series: FollowerDay[], t: number): number | null {
  if (series.length === 0) return null;
  if (t < tsOf(series[0].date) || t > tsOf(series[series.length - 1].date)) return null;
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1], b = series[i];
    const ta = tsOf(a.date), tb = tsOf(b.date);
    if (t >= ta && t <= tb) {
      if (tb === ta) return a.total;
      const f = (t - ta) / (tb - ta);
      return a.total + (b.total - a.total) * f;
    }
  }
  return null;
}


/** Pearson correlation; null quando não há variância ou amostra suficiente. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [posts, setPosts] = useState<CampaignPost[]>([]);
  const [followers, setFollowers] = useState<FollowerDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: camps } = await supabase
        .from("campaigns")
        .select("id, slug, name, brand, period_start, period_end, source, summary")
        .order("period_start", { ascending: false });

      const { data: fd } = await supabase
        .from("follower_daily")
        .select("reading_date, total, instagram, tiktok, facebook, youtube, linkedin")
        .order("reading_date", { ascending: true });

      const results = await Promise.all(
        PLATFORMS.map(async (p) => {
          const { data } = await supabase
            .from(p.table)
            .select("post_url, caption, timestamp, like_count, comments_count, share_count, view_count")
            .not("timestamp", "is", null)
            .order("timestamp", { ascending: false })
            .limit(1000);
          return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
            platform: p.label,
            post_url: String(r.post_url ?? ""),
            caption: (r.caption as string) ?? null,
            timestamp: String(r.timestamp),
            likes: Number(r.like_count ?? 0),
            comments: Number(r.comments_count ?? 0),
            shares: Number(r.share_count ?? 0),
            views: Number(r.view_count ?? 0),
          }));
        }),
      );

      if (!alive) return;
      setCampaigns((camps ?? []) as unknown as CampaignRow[]);
      setFollowers(
        ((fd ?? []) as Record<string, unknown>[]).map((r) => ({
          date: String(r.reading_date),
          total:
            Number(r.total ?? 0) ||
            Number(r.instagram ?? 0) + Number(r.tiktok ?? 0) + Number(r.facebook ?? 0) +
              Number(r.youtube ?? 0) + Number(r.linkedin ?? 0),
        })),
      );
      setPosts(results.flat());
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);


  return useMemo(() => {
    const enriched = campaigns.map((c) => {
      const { start, end } = windowOf(c);
      const list =
        start && end
          ? posts.filter((p) => {
              const t = new Date(p.timestamp).getTime();
              return t >= start.getTime() && t <= end.getTime();
            })
          : [];
      const interactions = list.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
      const views = list.reduce((s, p) => s + p.views, 0);
      const byPlatform = [...new Set(list.map((p) => p.platform))]
        .map((platform) => {
          const l = list.filter((p) => p.platform === platform);
          return {
            platform,
            posts: l.length,
            interactions: l.reduce((s, p) => s + p.likes + p.comments + p.shares, 0),
            views: l.reduce((s, p) => s + p.views, 0),
          };
        })
        .sort((a, b) => b.interactions - a.interactions);

      // Seguidores: variação total no período de veiculação
      const inWindow =
        start && end
          ? followers.filter((f) => {
              const t = new Date(`${f.date}T12:00:00Z`).getTime();
              return t >= start.getTime() && t <= end.getTime();
            })
          : [];
      const followerStart = inWindow[0]?.total ?? null;
      const followerEnd = inWindow[inWindow.length - 1]?.total ?? null;
      const followerGain =
        followerStart !== null && followerEnd !== null ? followerEnd - followerStart : null;
      const days = inWindow.length > 1 ? inWindow.length - 1 : 0;
      const followerGainPerDay = followerGain !== null && days ? followerGain / days : null;

      // Defasagem (lag): ganho de seguidores nos N dias APÓS o fim da veiculação
      const airEndStr = c.period_end ?? c.period_start;
      const airEnd = airEndStr ? tsOf(airEndStr) : null;
      const base = airEnd !== null ? valueAt(followers, airEnd) : null;
      const lagGainPerDay = Object.fromEntries(
        LAGS.map((lag) => {
          if (airEnd === null || base === null) return [lag, null];
          const v = valueAt(followers, airEnd + lag * dayMs);
          return [lag, v === null ? null : (v - base) / lag];
        }),
      ) as Record<Lag, number | null>;


      return {
        ...c,
        window: { start, end },
        posts: list.length,
        interactions,
        views,
        engagementPerPost: list.length ? interactions / list.length : 0,
        viewRate: views ? (interactions / views) * 100 : null,
        assets: c.summary?.assets?.total ?? 0,
        videos: c.summary?.assets?.videos ?? 0,
        followerStart,
        followerEnd,
        followerGain,
        followerGainPerDay,
        lagGainPerDay,
        airEnd,
        followerDays: inWindow,

        byPlatform,
        topPosts: [...list]
          .sort((a, b) => b.likes + b.comments + b.shares - (a.likes + a.comments + a.shares))
          .slice(0, 5),
      };
    });

    const totalAssets = campaigns.reduce((s, c) => s + (c.summary?.assets?.total ?? 0), 0);
    const totalVideos = campaigns.reduce((s, c) => s + (c.summary?.assets?.videos ?? 0), 0);

    // Amostra para correlação: campanhas com dados de seguidores e de posts
    const sample = enriched.filter((c) => c.followerGainPerDay !== null && c.posts > 0);
    const corr = (pick: (c: typeof sample[number]) => number, pickY: (c: typeof sample[number]) => number) =>
      pearson(sample.map(pick), sample.map(pickY));

    const correlations = [
      {
        key: "int_follow",
        label: "Interações × ganho de seguidores/dia",
        r: corr((c) => c.interactions, (c) => c.followerGainPerDay ?? 0),
      },
      {
        key: "views_follow",
        label: "Visualizações × ganho de seguidores/dia",
        r: corr((c) => c.views, (c) => c.followerGainPerDay ?? 0),
      },
      {
        key: "assets_int",
        label: "Peças criativas × interações",
        r: corr((c) => c.assets, (c) => c.interactions),
      },
      {
        key: "videos_int",
        label: "Vídeos × interações",
        r: corr((c) => c.videos, (c) => c.interactions),
      },
      {
        key: "posts_follow",
        label: "Posts publicados × ganho de seguidores/dia",
        r: corr((c) => c.posts, (c) => c.followerGainPerDay ?? 0),
      },
      {
        key: "epp_follow",
        label: "Interações por post × ganho de seguidores/dia",
        r: corr((c) => c.engagementPerPost, (c) => c.followerGainPerDay ?? 0),
      },
    ];

    // Baseline: dias sem campanha ativa
    const covered = new Set<string>();
    enriched.forEach((c) => c.followerDays.forEach((d) => covered.add(d.date)));
    const offDays = followers.filter((f) => !covered.has(f.date));
    const dailyDelta = (arr: FollowerDay[]) => {
      const deltas: number[] = [];
      for (let i = 1; i < arr.length; i++) {
        const prev = arr[i - 1], cur = arr[i];
        const gap =
          (new Date(cur.date).getTime() - new Date(prev.date).getTime()) / 86400000;
        if (gap > 0 && gap <= 3) deltas.push((cur.total - prev.total) / gap);
      }
      return deltas.length ? deltas.reduce((s, v) => s + v, 0) / deltas.length : null;
    };
    const baselineGainPerDay = dailyDelta(offDays);
    const campaignGainPerDay = sample.length
      ? sample.reduce((s, c) => s + (c.followerGainPerDay ?? 0), 0) / sample.length
      : null;

    // Defasagem: para cada lag, média do ganho/dia pós-veiculação e correlação com interações
    const lagSample = enriched.filter((c) => c.posts > 0);
    const lagAnalysis = LAGS.map((lag) => {
      const rows = lagSample.filter((c) => c.lagGainPerDay[lag] !== null);
      const avg = rows.length
        ? rows.reduce((s, c) => s + (c.lagGainPerDay[lag] as number), 0) / rows.length
        : null;
      return {
        lag,
        label: `D+${lag}`,
        n: rows.length,
        avgGainPerDay: avg,
        vsBaseline: avg !== null && baselineGainPerDay !== null ? avg - baselineGainPerDay : null,
        rInteractions: pearson(
          rows.map((c) => c.interactions),
          rows.map((c) => c.lagGainPerDay[lag] as number),
        ),
        rViews: pearson(
          rows.map((c) => c.views),
          rows.map((c) => c.lagGainPerDay[lag] as number),
        ),
      };
    });
    const bestLag =
      lagAnalysis
        .filter((l) => l.rInteractions !== null)
        .sort((a, b) => Math.abs(b.rInteractions ?? 0) - Math.abs(a.rInteractions ?? 0))[0] ?? null;


    return {
      loading,
      hasData: campaigns.length > 0,
      campaigns: enriched,
      totalCampaigns: campaigns.length,
      totalAssets,
      totalVideos,
      totalInteractions: enriched.reduce((s, c) => s + c.interactions, 0),
      byInteractions: [...enriched].sort((a, b) => b.interactions - a.interactions),
      correlations,
      correlationSample: sample,
      baselineGainPerDay,
      campaignGainPerDay,
      lagAnalysis,
      lagSample,
      bestLag,

      hasFollowerData: followers.length > 0,
    };
  }, [campaigns, posts, followers, loading]);

}

export type EnrichedCampaign = ReturnType<typeof useCampaigns>["campaigns"][number];
