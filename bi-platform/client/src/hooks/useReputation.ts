import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";

export type ReputationSource = "reclame_aqui" | "tripadvisor";

export type ReputationReview = {
  id: string;
  source: ReputationSource;
  external_id: string;
  url: string | null;
  title: string | null;
  body: string | null;
  author: string | null;
  rating: number | null;
  status: string | null;
  category: string | null;
  location: string | null;
  sentiment: "positivo" | "neutro" | "negativo" | null;
  ai_summary: string | null;
  published_at: string | null;
  responded_at: string | null;
  response_time_hours: number | null;
  resolved: boolean;
};

export type ReputationSummary = {
  source: ReputationSource;
  reviews: number;
  negatives: number;
  positives: number;
  neutrals: number;
  avg_rating: number | null;
  answered: number;
  answer_rate_pct: number | null;
  avg_response_hours: number | null;
  resolved_rate_pct: number | null;
};

export const SOURCE_LABEL: Record<ReputationSource, string> = {
  reclame_aqui: "ReclameAqui",
  tripadvisor: "TripAdvisor",
};

/** Reclamações e avaliações do ReclameAqui e TripAdvisor. */
export function useReputation(days = 90, refreshMs = 0) {
  const [reviews, setReviews] = useState<ReputationReview[]>([]);
  const [summary, setSummary] = useState<ReputationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    // Carrega 2× a janela para que a comparação com o "período anterior" tenha dados.
    const since = new Date(Date.now() - 2 * days * 864e5).toISOString();
    const [r, s] = await Promise.all([
      fetchAllRows<ReputationReview>((from, to) =>
        supabase
          .from("reputation_reviews")
          .select("*")
          .or(`published_at.is.null,published_at.gte.${since}`)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("id")
          .range(from, to) as unknown as PromiseLike<{ data: ReputationReview[] | null; error: { message: string } | null }>,
      ),
      supabase.rpc("get_reputation_summary", { _days: days }),
    ]);
    setReviews(r.rows);
    setSummary((s.data as ReputationSummary[]) ?? []);
    setError(r.error ?? s.error?.message ?? null);
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!refreshMs) return;
    const id = window.setInterval(() => void load(true), refreshMs);
    const onFocus = () => void load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, refreshMs]);

  const sync = useCallback(async () => {
    setSyncing(true);
    const { data, error: fnError } = await supabase.functions.invoke("sync-reputation", {
      body: {},
    });
    setSyncing(false);
    await load();
    return { data, error: fnError?.message ?? null };
  }, [load]);

  const totals = useMemo(() => {
    const acc = summary.reduce(
      (a, s) => {
        a.reviews += s.reviews;
        a.negatives += s.negatives;
        a.positives += s.positives;
        a.neutrals += s.neutrals;
        a.answered += s.answered;
        if (s.avg_response_hours != null) {
          a.responseSum += s.avg_response_hours * s.answered;
          a.responseCount += s.answered;
        }
        return a;
      },
      { reviews: 0, negatives: 0, positives: 0, neutrals: 0, answered: 0, responseSum: 0, responseCount: 0 },
    );
    return {
      ...acc,
      answerRate: acc.reviews ? (acc.answered / acc.reviews) * 100 : null,
      avgResponseHours: acc.responseCount ? acc.responseSum / acc.responseCount : null,
      negativeRate: acc.reviews ? (acc.negatives / acc.reviews) * 100 : null,
    };
  }, [summary]);

  return {
    reviews,
    summary,
    totals,
    loading,
    refreshing,
    lastUpdated,
    syncing,
    error,
    sync,
    reload: load,
  };
}
