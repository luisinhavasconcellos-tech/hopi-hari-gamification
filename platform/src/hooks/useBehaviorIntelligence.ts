import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConsentSummary = {
  total_identities: number;
  active_consents: number;
  revoked_consents: number;
  last_granted_at: string | null;
};

export type BehaviorRow = {
  day: string;
  event_name: string;
  age_group: string;
  region: string;
  cohort: string;
  channel: string;
  events: number;
  sessions: number;
  identities: number;
};


/** Dados agregados de identidade pseudonimizada (nenhum evento individual). */
export function useBehaviorIntelligence(days = 30) {
  const [summary, setSummary] = useState<ConsentSummary | null>(null);
  const [rows, setRows] = useState<BehaviorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [s, b] = await Promise.all([
        supabase.rpc("get_consent_summary"),
        supabase.rpc("get_behavior_by_segment", { _days: days }),
      ]);
      if (!alive) return;
      setSummary(((s.data ?? [])[0] as ConsentSummary) ?? null);
      setRows((b.data ?? []) as BehaviorRow[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [days]);

  const totalEvents = rows.reduce((sum, r) => sum + Number(r.events), 0);
  const identifiedSessions = rows.reduce((sum, r) => sum + Number(r.sessions), 0);

  const groupBy = (key: "age_group" | "region" | "cohort" | "event_name" | "channel") => {
    const map = new Map<string, { events: number; sessions: number; identities: number }>();
    for (const r of rows) {
      const cur = map.get(r[key]) ?? { events: 0, sessions: 0, identities: 0 };
      map.set(r[key], {
        events: cur.events + Number(r.events),
        sessions: cur.sessions + Number(r.sessions),
        identities: cur.identities + Number(r.identities),
      });
    }
    return [...map.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.events - a.events);
  };


  const byDay = (() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.day, (map.get(r.day) ?? 0) + Number(r.events));
    return [...map.entries()]
      .map(([day, events]) => ({ day, events }))
      .sort((a, b) => a.day.localeCompare(b.day));
  })();

  return {
    loading,
    summary,
    rows,
    totalEvents,
    identifiedSessions,
    byDay,
    byAge: groupBy("age_group"),
    byRegion: groupBy("region"),
    byChannel: groupBy("channel"),
    byCohort: groupBy("cohort"),
    byEvent: groupBy("event_name"),

    hasData: rows.length > 0,
  };
}
