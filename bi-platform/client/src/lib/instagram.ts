// Instagram Graph API types and service
const BASE = "https://graph.instagram.com";

export interface IGMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  thumbnail_url?: string;
  timestamp: string;
  permalink: string;
  like_count: number;
  comments_count: number;
}

export interface IGInsights {
  impressions: number;
  reach: number;
  engagement: number;
  saved: number;
  profile_visits: number;
  website_clicks?: number;
}

export interface IGAccountMetrics {
  followers_count: number;
  follows_count: number;
  media_count: number;
  name: string;
  username: string;
  profile_picture_url: string;
  biography: string;
  website: string;
}

export async function fetchAccountMetrics(token: string, igUserId: string): Promise<IGAccountMetrics> {
  const fields = "followers_count,follows_count,media_count,name,username,profile_picture_url,biography,website";
  const res = await fetch(`${BASE}/${igUserId}?fields=${fields}&access_token=${token}`);
  if (!res.ok) throw new Error("Failed to fetch account metrics");
  return res.json();
}

export async function fetchRecentMedia(token: string, igUserId: string, limit = 20): Promise<IGMedia[]> {
  const fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,like_count,comments_count";
  const res = await fetch(`${BASE}/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${token}`);
  if (!res.ok) throw new Error("Failed to fetch media");
  const data = await res.json();
  return data.data ?? [];
}

export async function fetchMediaInsights(token: string, mediaId: string): Promise<IGInsights> {
  const metrics = "impressions,reach,engagement,saved";
  const res = await fetch(`${BASE}/${mediaId}/insights?metric=${metrics}&access_token=${token}`);
  if (!res.ok) throw new Error("Failed to fetch media insights");
  const data = await res.json();
  const map: Record<string, number> = {};
  for (const item of data.data ?? []) {
    map[item.name] = item.values?.[0]?.value ?? item.value ?? 0;
  }
  return {
    impressions: map.impressions ?? 0,
    reach: map.reach ?? 0,
    engagement: map.engagement ?? 0,
    saved: map.saved ?? 0,
    profile_visits: map.profile_visits ?? 0,
    website_clicks: map.website_clicks,
  };
}

export async function fetchAccountInsights(
  token: string, igUserId: string, period: "day" | "week" | "month" = "month"
): Promise<Record<string, number>> {
  const metrics = "impressions,reach,profile_views,website_clicks,follower_count";
  const res = await fetch(`${BASE}/${igUserId}/insights?metric=${metrics}&period=${period}&access_token=${token}`);
  if (!res.ok) throw new Error("Failed to fetch account insights");
  const data = await res.json();
  const map: Record<string, number> = {};
  for (const item of data.data ?? []) {
    map[item.name] = item.values?.at(-1)?.value ?? 0;
  }
  return map;
}

export async function fetchFollowerGrowth(
  token: string, igUserId: string
): Promise<Array<{ date: string; count: number }>> {
  const since = Math.floor((Date.now() - 30 * 86400000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  const res = await fetch(
    `${BASE}/${igUserId}/insights?metric=follower_count&period=day&since=${since}&until=${until}&access_token=${token}`
  );
  if (!res.ok) throw new Error("Failed to fetch follower growth");
  const data = await res.json();
  const values = data.data?.[0]?.values ?? [];
  return values.map((v: { end_time: string; value: number }) => ({
    date: v.end_time.slice(0, 10),
    count: v.value,
  }));
}

export async function fetchComments(
  token: string, mediaId: string
): Promise<Array<{ id: string; text: string; timestamp: string; username: string }>> {
  const res = await fetch(`${BASE}/${mediaId}/comments?fields=id,text,timestamp,username&access_token=${token}`);
  if (!res.ok) throw new Error("Failed to fetch comments");
  const data = await res.json();
  return data.data ?? [];
}
