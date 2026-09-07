import { fetchAllRows, getSupabase } from "../_core/supabase";
import { addDays, saoPauloDayRange } from "./dates";

export const HORA_DO_HORROR_LISTENING_DAYS = 28;
export const MINIMUM_SEARCH_DAYS = 3;
export const MINIMUM_SOCIAL_MENTIONS = 5;
export const MINIMUM_REPUTATION_REVIEWS = 5;

const HORROR_PATTERN = /hora\s*do\s*horror|horadohorror|\bhdh(?:26)?\b/i;

function matchesHoraDoHorror(...values: unknown[]) {
  return values.some(value => HORROR_PATTERN.test(String(value ?? "")));
}

function sentiment(rows: Array<{ sentiment?: string | null }>) {
  const positive = rows.filter(row => row.sentiment === "positivo").length;
  const negative = rows.filter(row => row.sentiment === "negativo").length;
  const neutral = rows.filter(row => row.sentiment === "neutro").length;
  const classified = positive + negative + neutral;
  return {
    positive,
    negative,
    neutral,
    score: classified ? Number((((positive - negative) / classified) * 100).toFixed(1)) : null,
  };
}

type SearchQueryRow = { date: string; query: string | null; clicks: number | null; impressions: number | null; position: number | null };

export async function getHoraDoHorrorSignals(periodEnd: string) {
  const supabase = getSupabase();
  const periodStart = addDays(periodEnd, -(HORA_DO_HORROR_LISTENING_DAYS - 1));
  // Mentions and reviews carry timestamps; bound them by São Paulo days, not UTC.
  const window = saoPauloDayRange(periodStart, periodEnd);
  const latestSearchResult = await supabase
    .from("gsc_daily_totals")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);
  const searchPeriodEnd = String(latestSearchResult.data?.[0]?.date ?? periodEnd);
  const searchPeriodStart = addDays(searchPeriodEnd, -(HORA_DO_HORROR_LISTENING_DAYS - 1));
  const [searchResult, xResult, reputationResult] = await Promise.all([
    // 28 days × hundreds of queries exceeds Supabase's 1000-row cap: page it.
    fetchAllRows<SearchQueryRow>((from, to) =>
      supabase
        .from("gsc_daily_queries")
        .select("date,query,clicks,impressions,position")
        .gte("date", searchPeriodStart)
        .lte("date", searchPeriodEnd)
        .order("date", { ascending: true })
        .order("query", { ascending: true })
        .range(from, to),
    ),
    supabase
      .from("x_mentions")
      .select("published_at,brand,sentiment,keyword,topic,likes,retweets,replies,quotes,views")
      .eq("brand", "hopi_hari")
      .gte("published_at", window.startUtc)
      .lte("published_at", window.endUtc)
      .order("published_at", { ascending: true })
      .limit(5_000),
    supabase
      .from("reputation_reviews")
      .select("published_at,sentiment,rating,title,body")
      .gte("published_at", window.startUtc)
      .lte("published_at", window.endUtc)
      .order("published_at", { ascending: true })
      .limit(5_000),
  ]);

  const searchRows = searchResult.rows.filter(row => matchesHoraDoHorror(row.query));
  const socialRows = (xResult.data ?? []).filter(row => matchesHoraDoHorror(row.keyword, row.topic));
  const reputationRows = (reputationResult.data ?? []).filter(row => matchesHoraDoHorror(row.title, row.body));

  const searchByDate = new Map<string, { date: string; clicks: number; impressions: number }>();
  const queryTotals = new Map<string, { query: string; clicks: number; impressions: number }>();
  for (const row of searchRows) {
    const date = String(row.date);
    const day = searchByDate.get(date) ?? { date, clicks: 0, impressions: 0 };
    day.clicks += Number(row.clicks ?? 0);
    day.impressions += Number(row.impressions ?? 0);
    searchByDate.set(date, day);
    const query = String(row.query ?? "").trim();
    const total = queryTotals.get(query) ?? { query, clicks: 0, impressions: 0 };
    total.clicks += Number(row.clicks ?? 0);
    total.impressions += Number(row.impressions ?? 0);
    queryTotals.set(query, total);
  }

  const searchSeries = [...searchByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const socialSentiment = sentiment(socialRows);
  const reputationSentiment = sentiment(reputationRows);
  const ratedReviews = reputationRows.map(row => Number(row.rating)).filter(value => Number.isFinite(value) && value > 0);

  return {
    period: { start: periodStart, end: periodEnd, days: HORA_DO_HORROR_LISTENING_DAYS },
    methodology: "Hora do Horror é lida por demanda de busca, menções sociais e reputação. Cada domínio só aparece quando atinge seu mínimo próprio; ausência ou baixa amostra não é convertida em zero.",
    search: {
      period: { start: searchPeriodStart, end: searchPeriodEnd },
      eligible: searchSeries.length >= MINIMUM_SEARCH_DAYS,
      minimumDays: MINIMUM_SEARCH_DAYS,
      observedDays: searchSeries.length,
      queryRows: searchRows.length,
      clicks: searchRows.reduce((sum, row) => sum + Number(row.clicks ?? 0), 0),
      impressions: searchRows.reduce((sum, row) => sum + Number(row.impressions ?? 0), 0),
      series: searchSeries,
      topQueries: [...queryTotals.values()].sort((a, b) => b.impressions - a.impressions).slice(0, 6),
    },
    social: {
      eligible: socialRows.length >= MINIMUM_SOCIAL_MENTIONS,
      minimumMentions: MINIMUM_SOCIAL_MENTIONS,
      mentions: socialRows.length,
      engagement: socialRows.reduce((sum, row) => sum + Number(row.likes ?? 0) + Number(row.retweets ?? 0) + Number(row.replies ?? 0) + Number(row.quotes ?? 0), 0),
      reach: socialRows.reduce((sum, row) => sum + Number(row.views ?? 0), 0),
      ...socialSentiment,
    },
    reputation: {
      eligible: reputationRows.length >= MINIMUM_REPUTATION_REVIEWS,
      minimumReviews: MINIMUM_REPUTATION_REVIEWS,
      reviews: reputationRows.length,
      averageRating: ratedReviews.length ? Number((ratedReviews.reduce((sum, value) => sum + value, 0) / ratedReviews.length).toFixed(2)) : null,
      ...reputationSentiment,
    },
    errors: [latestSearchResult.error?.message, searchResult.error, xResult.error?.message, reputationResult.error?.message].filter((value): value is string => Boolean(value)),
  };
}

export { matchesHoraDoHorror };
