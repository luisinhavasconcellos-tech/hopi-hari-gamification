import { supabase } from "@/integrations/supabase/client";
import type { IGAccountMetrics, IGMedia } from "./instagram";
import { fetchFollowerCount } from "@/lib/followers";

export type RealAccountData = {
  account: IGAccountMetrics;
  posts: IGMedia[];
  insights: Record<string, number>;
  growth: Array<{ date: string; count: number }>;
};

/**
 * Carrega os dados reais do Instagram do backend (sem dados de demonstração).
 * Fontes: follower_daily/platform_settings (seguidores), instagram_posts (posts) e daily_metrics (série diária).
 */
export async function loadInstagramAccount(postLimit = 30): Promise<RealAccountData> {
  const [followers, { data: dbPosts }, { count }, { data: daily }] = await Promise.all([
    fetchFollowerCount("instagram"),
    supabase
      .from("instagram_posts")
      .select("id,shortcode,post_url,thumbnail_url,caption,like_count,comments_count,view_count,media_type,timestamp")
      .eq("scrape_status", "scraped")
      .order("timestamp", { ascending: false, nullsFirst: false })
      .limit(postLimit),
    supabase.from("instagram_posts").select("id", { count: "exact", head: true }).eq("scrape_status", "scraped"),
    supabase
      .from("daily_metrics")
      .select("date,followers,reach,impressions")
      .eq("platform", "instagram")
      .order("date", { ascending: true })
      .limit(90),
  ]);



  const posts: IGMedia[] = (dbPosts ?? []).map((p: any) => ({
    id: p.id,
    caption: p.caption ?? "",
    media_type: (p.media_type ?? "IMAGE") as IGMedia["media_type"],
    media_url: p.thumbnail_url ?? "",
    thumbnail_url: p.thumbnail_url ?? "",
    timestamp: p.timestamp ?? new Date().toISOString(),
    permalink: p.post_url,
    like_count: p.like_count ?? 0,
    comments_count: p.comments_count ?? 0,
  }));

  const growth = (daily ?? [])
    .filter((d: any) => (d.followers ?? 0) > 0)
    .map((d: any) => ({ date: d.date as string, count: d.followers as number }));

  const lastReach = [...(daily ?? [])].reverse().find((d: any) => (d.reach ?? 0) > 0) as any;
  const lastImpressions = [...(daily ?? [])].reverse().find((d: any) => (d.impressions ?? 0) > 0) as any;

  const insights: Record<string, number> = {
    follower_count: followers,
    reach: lastReach?.reach ?? 0,
    impressions: lastImpressions?.impressions ?? 0,
    profile_views: 0,
    website_clicks: 0,
  };

  const account: IGAccountMetrics = {
    username: "hopihari",
    name: "Hopi Hari",
    followers_count: followers,
    follows_count: 0,
    media_count: count ?? posts.length,
    biography: "",
    website: "https://www.hopihari.com.br",
    profile_picture_url: "",
  };

  return { account, posts, insights, growth };
}
