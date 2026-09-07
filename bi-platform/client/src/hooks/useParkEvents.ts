import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saoPauloToday } from "@/lib/dates";

export type ParkEvent = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  start_date: string | null;
  end_date: string | null;
  image_url: string | null;
  url: string | null;
  highlight: boolean;
  active: boolean;
  source: string;
  last_seen_at: string;
  ai_insights: EventInsights | null;
  insights_generated_at: string | null;
};

export type EventInsights = {
  summary?: string;
  audience?: string;
  expected_impact?: "alto" | "medio" | "baixo";
  demand_drivers?: string[];
  content_angles?: string[];
  channels?: string[];
  risks?: string[];
  actions?: string[];
  kpis?: string[];
};

export type SyncRun = {
  id: string;
  ran_at: string;
  triggered_by: string;
  scraped: number;
  saved: number;
  new_events: number;
  updated_events: number;
  insights_generated: number;
  success: boolean;
};

export type NewParkEvent = {
  title: string;
  description?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  url?: string;
};

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

export function useParkEvents() {
  const [events, setEvents] = useState<ParkEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("park_events")
      .select(
        "id, slug, title, description, category, start_date, end_date, image_url, url, highlight, active, source, last_seen_at, ai_insights, insights_generated_at",
      )
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(500);
    setEvents((data ?? []) as unknown as ParkEvent[]);
    const { data: r } = await supabase
      .from("park_event_sync_runs")
      .select("id, ran_at, triggered_by, scraped, saved, new_events, updated_events, insights_generated, success")
      .order("ran_at", { ascending: false })
      .limit(10);
    setRuns((r ?? []) as SyncRun[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-park-events", { body: {} });
      if (error) throw error;
      await load();
      return data as {
        success: boolean;
        scraped?: number;
        saved?: number;
        new_events?: number;
        updated_events?: number;
        insights_generated?: number;
        errors?: string[];
      };
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const generateInsights = useCallback(
    async (eventId: string) => {
      setAnalyzingId(eventId);
      try {
        const { data, error } = await supabase.functions.invoke("generate-event-insights", {
          body: { eventId, force: true },
        });
        if (error) throw error;
        await load();
        return data as { success: boolean; generated?: number; errors?: string[] };
      } finally {
        setAnalyzingId(null);
      }
    },
    [load],
  );

  const addManual = useCallback(
    async (e: NewParkEvent) => {
      const { error } = await supabase.from("park_events").insert({
        slug: `${slugify(e.title)}-${Date.now().toString(36).slice(-4)}`,
        title: e.title.trim(),
        description: e.description?.trim() || null,
        category: e.category?.trim() || null,
        start_date: e.start_date || null,
        end_date: e.end_date || null,
        url: e.url?.trim() || null,
        source: "manual",
      });
      if (error) throw error;
      await load();
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("park_events").delete().eq("id", id);
      if (error) throw error;
      await load();
    },
    [load],
  );

  const derived = useMemo(() => {
    const today = saoPauloToday();
    const active = events.filter((e) => e.active);
    const upcoming = active.filter((e) => (e.start_date ?? "") > today);
    const running = active.filter(
      (e) => (e.start_date ?? "9999") <= today && (e.end_date ?? e.start_date ?? "0000") >= today,
    );
    const past = active.filter((e) => (e.end_date ?? e.start_date ?? "") < today && (e.end_date || e.start_date));
    const categories = [...new Set(active.map((e) => e.category ?? "Sem categoria"))]
      .map((c) => ({ category: c, events: active.filter((e) => (e.category ?? "Sem categoria") === c).length }))
      .sort((a, b) => b.events - a.events);
    return { upcoming, running, past, categories };
  }, [events]);

  return {
    events,
    loading,
    syncing,
    sync,
    runs,
    lastRun: runs[0] ?? null,
    analyzingId,
    generateInsights,
    withInsights: events.filter((e) => e.ai_insights).length,
    addManual,
    remove,
    reload: load,
    fromSite: events.filter((e) => e.source === "site").length,
    manual: events.filter((e) => e.source === "manual").length,
    ...derived,
  };
}
