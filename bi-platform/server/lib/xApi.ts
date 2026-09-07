const X_API_BASE = "https://api.x.com/2";
const DEFAULT_QUERY = '"Hopi Hari" lang:pt -is:retweet';

export type XPublicMetrics = {
  retweet_count?: number;
  reply_count?: number;
  like_count?: number;
  quote_count?: number;
  bookmark_count?: number;
  impression_count?: number;
};

export type XPost = {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: XPublicMetrics;
};

export type XSnapshot = {
  available: boolean;
  configured: boolean;
  fetchedAt: string;
  query: string;
  resultCount: number;
  metrics: {
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
    bookmarks: number;
    impressions: number;
  };
  posts: XPost[];
  reason?: "credential_missing" | "x_api_unauthorized" | "x_api_forbidden" | "x_api_rate_limited" | "x_api_error";
};

function emptySnapshot(query: string, configured: boolean, reason?: XSnapshot["reason"]): XSnapshot {
  return {
    available: false,
    configured,
    fetchedAt: new Date().toISOString(),
    query,
    resultCount: 0,
    metrics: { likes: 0, replies: 0, reposts: 0, quotes: 0, bookmarks: 0, impressions: 0 },
    posts: [],
    reason,
  };
}

export function aggregateXMetrics(posts: XPost[]): XSnapshot["metrics"] {
  return posts.reduce(
    (total, post) => {
      const metric = post.public_metrics ?? {};
      total.likes += metric.like_count ?? 0;
      total.replies += metric.reply_count ?? 0;
      total.reposts += metric.retweet_count ?? 0;
      total.quotes += metric.quote_count ?? 0;
      total.bookmarks += metric.bookmark_count ?? 0;
      total.impressions += metric.impression_count ?? 0;
      return total;
    },
    { likes: 0, replies: 0, reposts: 0, quotes: 0, bookmarks: 0, impressions: 0 },
  );
}

export async function fetchXSnapshot(): Promise<XSnapshot> {
  const bearerToken = process.env.X_BEARER_TOKEN?.trim();
  const query = process.env.X_SEARCH_QUERY?.trim() || DEFAULT_QUERY;
  if (!bearerToken) return emptySnapshot(query, false, "credential_missing");

  const url = new URL(`${X_API_BASE}/tweets/search/recent`);
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", "25");
  url.searchParams.set("tweet.fields", "created_at,public_metrics,author_id,lang");

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const reason: XSnapshot["reason"] =
        response.status === 401
          ? "x_api_unauthorized"
          : response.status === 403
            ? "x_api_forbidden"
            : response.status === 429
              ? "x_api_rate_limited"
              : "x_api_error";
      return emptySnapshot(query, true, reason);
    }

    const payload = (await response.json()) as { data?: XPost[]; meta?: { result_count?: number } };
    const posts = Array.isArray(payload.data) ? payload.data : [];
    return {
      available: true,
      configured: true,
      fetchedAt: new Date().toISOString(),
      query,
      resultCount: payload.meta?.result_count ?? posts.length,
      metrics: aggregateXMetrics(posts),
      posts,
    };
  } catch {
    return emptySnapshot(query, true, "x_api_error");
  }
}
