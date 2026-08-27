import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type XMention = {
  id: string;
  tweet_id: string;
  url: string | null;
  author_handle: string | null;
  author_name: string | null;
  author_followers: number | null;
  text: string | null;
  lang: string | null;
  keyword: string | null;
  brand: string;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  views: number;
  sentiment: "positivo" | "neutro" | "negativo" | null;
  topic: string | null;
  ai_summary: string | null;
  published_at: string | null;
};

export const BRAND_LABEL: Record<string, string> = {
  hopi_hari: "Hopi Hari",
  beto_carrero: "Beto Carrero",
  thermas: "Thermas dos Laranjais",
  wet_n_wild: "Wet'n Wild",
};

/** Menções ao Hopi Hari e concorrentes no X (Twitter). */
export function useXListening(days = 30) {
  const [mentions, setMentions] = useState<XMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const { data, error } = await supabase
      .from("x_mentions")
      .select("*")
      .or(`published_at.is.null,published_at.gte.${since}`)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(500);
    setMentions((data as XMention[]) ?? []);
    setError(error?.message ?? null);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = useCallback(async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("sync-x-listening", {
      body: { days: Math.min(days, 30) },
    });
    setSyncing(false);
    if (error) return { error: error.message };
    if (data && (data as { success?: boolean }).success === false)
      return { error: (data as { error?: string }).error ?? "Falha na sincronização" };
    await load();
    return { data };
  }, [days, load]);

  const totals = useMemo(() => {
    const brand = mentions.filter((m) => m.brand === "hopi_hari");
    const positives = brand.filter((m) => m.sentiment === "positivo").length;
    const negatives = brand.filter((m) => m.sentiment === "negativo").length;
    const neutrals = brand.filter((m) => m.sentiment === "neutro").length;
    const engagement = brand.reduce((a, m) => a + m.likes + m.retweets + m.replies + m.quotes, 0);
    const reach = brand.reduce((a, m) => a + (m.views || 0), 0);
    const classified = positives + negatives + neutrals;
    return {
      mentions: brand.length,
      positives,
      negatives,
      neutrals,
      engagement,
      reach,
      sentimentScore: classified ? ((positives - negatives) / classified) * 100 : null,
    };
  }, [mentions]);

  const timeline = useMemo(() => {
    const map = new Map<string, { date: string; positivo: number; neutro: number; negativo: number; total: number }>();
    for (const m of mentions) {
      if (m.brand !== "hopi_hari" || !m.published_at) continue;
      const key = m.published_at.slice(0, 10);
      const row = map.get(key) ?? { date: key, positivo: 0, neutro: 0, negativo: 0, total: 0 };
      if (m.sentiment) row[m.sentiment] += 1;
      row.total += 1;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [mentions]);

  const shareOfVoice = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of mentions) map.set(m.brand, (map.get(m.brand) ?? 0) + 1);
    const total = mentions.length || 1;
    return [...map.entries()]
      .map(([brand, count]) => ({
        brand,
        label: BRAND_LABEL[brand] ?? brand,
        count,
        pct: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [mentions]);

  const topics = useMemo(() => {
    const map = new Map<string, { topic: string; total: number; negativos: number }>();
    for (const m of mentions) {
      if (m.brand !== "hopi_hari" || !m.topic) continue;
      const key = m.topic.toLowerCase();
      const row = map.get(key) ?? { topic: key, total: 0, negativos: 0 };
      row.total += 1;
      if (m.sentiment === "negativo") row.negativos += 1;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  }, [mentions]);

  return { mentions, totals, timeline, shareOfVoice, topics, loading, syncing, error, sync, reload: load };
}
