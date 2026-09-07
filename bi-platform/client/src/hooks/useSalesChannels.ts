import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";
import { MONTH_LABELS } from "@/hooks/useParkAttractions";

export type ChannelRow = { channel: string; year: number; month: number; quantity: number };

export function useSalesChannels() {
  const [rows, setRows] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { rows: data } = await fetchAllRows<ChannelRow>((from, to) =>
        supabase
          .from("sales_channel_monthly")
          .select("channel, year, month, quantity")
          .order("year")
          .order("month")
          .order("id")
          .range(from, to),
      );
      if (!alive) return;
      setRows(data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const years = [...new Set(rows.map((r) => r.year))].sort();
    const current = years.at(-1) ?? new Date().getFullYear();
    const previous = years.length > 1 ? years[years.length - 2] : current - 1;
    const cur = rows.filter((r) => r.year === current);
    const curMonths = new Set(cur.map((r) => r.month));
    const prevComparable = rows.filter((r) => r.year === previous && curMonths.has(r.month));
    const sum = (l: ChannelRow[]) => l.reduce((s, r) => s + r.quantity, 0);

    const totalCurrent = sum(cur);
    const totalPrevious = sum(prevComparable);

    const byChannel = [...new Set(rows.map((r) => r.channel))]
      .map((channel) => {
        const c = sum(cur.filter((r) => r.channel === channel));
        const p = sum(prevComparable.filter((r) => r.channel === channel));
        return {
          channel,
          current: c,
          previous: p,
          share: totalCurrent ? (c / totalCurrent) * 100 : 0,
          growth: p ? ((c - p) / p) * 100 : null,
        };
      })
      .sort((a, b) => b.current - a.current);

    const byMonth = MONTH_LABELS.map((label, i) => ({
      month: label,
      atual: sum(cur.filter((r) => r.month === i + 1)),
      anterior: sum(rows.filter((r) => r.year === previous && r.month === i + 1)),
    })).filter((r) => r.atual > 0 || r.anterior > 0);

    const byYear = years.map((y) => ({
      year: y,
      total: sum(rows.filter((r) => r.year === y)),
    }));

    return {
      loading,
      rows,
      years,
      currentYear: current,
      previousYear: previous,
      byChannel,
      byMonth,
      byYear,
      totalCurrent,
      totalPrevious,
      growth: totalPrevious ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : null,
      hasData: rows.length > 0,
    };
  }, [rows, loading]);
}
