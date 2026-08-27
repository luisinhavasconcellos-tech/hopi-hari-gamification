import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AggregateDemographic = {
  dimension: string;
  bucket_key: string;
  bucket_label: string;
  sort_order: number;
  customers: number;
};

export type AggregateRegion = {
  region_digit: number;
  region_label: string;
  states: string[];
  registrations: number;
  registrations_2018_2019: number;
  registrations_pos_2023: number;
};

export type AggregateBehavior = {
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

export type AudienceAggregates = {
  generated_at: string;
  window_days: number;
  cached: boolean;
  elapsed_ms?: number;
  demographics: AggregateDemographic[];
  cpf_regions: AggregateRegion[];
  registrations_daily: { date: string; registrations: number }[];
  heatmap: { weekday: number; hour: number; registrations: number }[];
  behavior: AggregateBehavior[];
  totals: { customers_with_age: number; cpfs: number; registrations: number };
};

/**
 * Agregações de Audience Intelligence servidas por um endpoint único
 * com cache no backend (padrão: 15 min).
 */
export function useAudienceAggregates(days = 30) {
  const [data, setData] = useState<AudienceAggregates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      const query = `days=${days}${refresh ? "&refresh=true" : ""}`;
      const { data: res, error: err } = await supabase.functions.invoke(
        `audience-aggregates?${query}`,
        { method: "GET" },
      );
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      if ((res as { error?: string })?.error) {
        setError((res as { error: string }).error);
        setLoading(false);
        return;
      }
      setData(res as AudienceAggregates);
      setLoading(false);
    },
    [days],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const byDimension = (dimension: string) =>
    (data?.demographics ?? []).filter((d) => d.dimension === dimension);

  return {
    data,
    loading,
    error,
    cached: data?.cached ?? false,
    refresh: () => load(true),
    byDimension,
    hasData: Boolean(data && (data.totals.cpfs > 0 || data.demographics.length > 0)),
  };
}
