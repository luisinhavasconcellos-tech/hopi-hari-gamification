import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RetentionPolicy = {
  key: string;
  description: string;
  retention_months: number;
  enabled: boolean;
};

export type RetentionRun = {
  id: string;
  ran_at: string;
  events_deleted: number;
  segments_deleted: number;
  consents_deleted: number;
  triggered_by: string;
};

/** Políticas de retenção e histórico de expurgos automáticos (somente admin). */
export function useRetention() {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [runs, setRuns] = useState<RetentionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, r] = await Promise.all([
      supabase.from("data_retention_policies").select("*").order("key"),
      supabase.from("data_retention_runs").select("*").order("ran_at", { ascending: false }).limit(20),
    ]);
    setPolicies((p.data as RetentionPolicy[]) ?? []);
    setRuns((r.data as RetentionRun[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateMonths = useCallback(
    async (key: string, months: number) => {
      await supabase.from("data_retention_policies").update({ retention_months: months }).eq("key", key);
      await load();
    },
    [load],
  );

  const runPurge = useCallback(async () => {
    setPurging(true);
    const { data, error } = await supabase.rpc("purge_expired_behavior_events");
    setPurging(false);
    await load();
    return { deleted: Number(data ?? 0), error: error?.message ?? null };
  }, [load]);

  const lastRun = runs[0] ?? null;

  return { loading, policies, runs, lastRun, purging, updateMonths, runPurge, reload: load };
}
