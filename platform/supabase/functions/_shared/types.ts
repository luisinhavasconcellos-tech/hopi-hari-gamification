// Normalized shapes shared by the X (Twitter) providers.

export type NormalizedAuthor = {
  handle: string | null;
  name: string | null;
  followers: number | null;
};

export type NormalizedPost = {
  tweet_id: string;
  url: string | null;
  text: string | null;
  lang: string | null;
  author: NormalizedAuthor;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  views: number;
  published_at: string | null;
};

export type SearchParams = {
  /** Free-text query / search term. */
  term: string;
  /** Max items to return. */
  maxItems: number;
  /** Only posts newer than this many days. */
  days: number;
};

export interface XProvider {
  readonly id: string;
  /** True when the provider has the credentials it needs. */
  isConfigured(): boolean;
  search(params: SearchParams): Promise<NormalizedPost[]>;
}

export const toInt = (v: unknown): number =>
  typeof v === "number" && isFinite(v) ? Math.round(v) : Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0;

export const toIso = (v: unknown): string | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
};
