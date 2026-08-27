// twitterapi.io driver (advanced search). Requires TWITTERAPI_IO_KEY.
import { NormalizedPost, SearchParams, XProvider, toInt, toIso } from "../types.ts";

const BASE = "https://api.twitterapi.io/twitter";

export const twitterApiIo: XProvider = {
  id: "twitterapi_io",

  isConfigured() {
    return !!Deno.env.get("TWITTERAPI_IO_KEY");
  },

  async search({ term, maxItems, days }: SearchParams): Promise<NormalizedPost[]> {
    const key = Deno.env.get("TWITTERAPI_IO_KEY");
    if (!key) throw new Error("TWITTERAPI_IO_KEY não configurada");

    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const out: NormalizedPost[] = [];
    let cursor = "";

    // Pages return ~20 tweets each.
    for (let page = 0; page < 5 && out.length < maxItems; page++) {
      const params = new URLSearchParams({
        query: `${term} since:${since} -filter:retweets`,
        queryType: "Latest",
      });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`${BASE}/tweet/advanced_search?${params}`, {
        headers: { "X-API-Key": key },
      });
      const body = await res.text();
      if (!res.ok) throw new Error(`twitterapi.io [${res.status}]: ${body.slice(0, 300)}`);

      const data = JSON.parse(body) as {
        tweets?: Record<string, any>[];
        next_cursor?: string;
        has_next_page?: boolean;
      };

      for (const t of data.tweets ?? []) {
        const a = (t.author ?? {}) as Record<string, any>;
        const id = String(t.id ?? t.tweet_id ?? "");
        if (!id || id === "undefined") continue;
        out.push({
          tweet_id: id,
          url: (t.url ?? t.twitterUrl ?? null) as string | null,
          text: (t.text ?? t.fullText ?? null) as string | null,
          lang: (t.lang ?? null) as string | null,
          author: {
            handle: (a.userName ?? a.screen_name ?? null) as string | null,
            name: (a.name ?? null) as string | null,
            followers: toInt(a.followers ?? a.followers_count),
          },
          likes: toInt(t.likeCount ?? t.favorite_count),
          retweets: toInt(t.retweetCount),
          replies: toInt(t.replyCount),
          quotes: toInt(t.quoteCount),
          views: toInt(t.viewCount),
          published_at: toIso(t.createdAt ?? t.created_at),
        });
        if (out.length >= maxItems) break;
      }

      cursor = data.next_cursor ?? "";
      if (!data.has_next_page || !cursor) break;
    }

    return out;
  },
};
