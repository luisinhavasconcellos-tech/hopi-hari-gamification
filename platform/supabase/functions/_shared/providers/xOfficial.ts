// Official X API v2 driver (recent search). Requires X_BEARER_TOKEN.
import { NormalizedPost, SearchParams, XProvider, toInt, toIso } from "../types.ts";

const BASE = "https://api.x.com/2";

export const xOfficial: XProvider = {
  id: "x_official",

  isConfigured() {
    return !!Deno.env.get("X_BEARER_TOKEN");
  },

  async search({ term, maxItems, days }: SearchParams): Promise<NormalizedPost[]> {
    const token = Deno.env.get("X_BEARER_TOKEN");
    if (!token) throw new Error("X_BEARER_TOKEN não configurada");

    const startTime = new Date(Date.now() - Math.min(days, 7) * 864e5).toISOString();
    const params = new URLSearchParams({
      query: `${term} -is:retweet`,
      max_results: String(Math.min(Math.max(maxItems, 10), 100)),
      start_time: startTime,
      "tweet.fields": "created_at,lang,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "username,name,public_metrics",
    });

    const res = await fetch(`${BASE}/tweets/search/recent?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`X API [${res.status}]: ${body.slice(0, 300)}`);

    const data = JSON.parse(body) as {
      data?: Record<string, any>[];
      includes?: { users?: Record<string, any>[] };
    };

    const users = new Map<string, Record<string, any>>();
    for (const u of data.includes?.users ?? []) users.set(String(u.id), u);

    return (data.data ?? []).map((t) => {
      const u = users.get(String(t.author_id)) ?? {};
      const m = t.public_metrics ?? {};
      return {
        tweet_id: String(t.id),
        url: u.username ? `https://x.com/${u.username}/status/${t.id}` : null,
        text: t.text ?? null,
        lang: t.lang ?? null,
        author: {
          handle: u.username ?? null,
          name: u.name ?? null,
          followers: toInt(u.public_metrics?.followers_count),
        },
        likes: toInt(m.like_count),
        retweets: toInt(m.retweet_count),
        replies: toInt(m.reply_count),
        quotes: toInt(m.quote_count),
        views: toInt(m.impression_count),
        published_at: toIso(t.created_at),
      } satisfies NormalizedPost;
    });
  },
};
