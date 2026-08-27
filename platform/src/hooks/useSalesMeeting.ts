import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MeetingChannel = {
  channel: string;
  scope: string;
  sort_order: number;
  goal: number;
  realized_current: number;
  realized_previous: number;
  forecast: number | null;
  meeting_date: string;
  period_start: string;
  period_end: string;
};

export type EcommerceFunnelRow = {
  period_label: string;
  period_start: string;
  visits: number;
  product_views: number;
  add_to_cart: number;
  purchases: number;
  conversion_rate: number | null;
  revenue: number;
  avg_ticket: number | null;
};

/** Dados da última reunião de vendas: meta x realizado por canal + funil de e-commerce. */
export function useSalesMeeting() {
  const [channels, setChannels] = useState<MeetingChannel[]>([]);
  const [funnel, setFunnel] = useState<EcommerceFunnelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [ch, fn] = await Promise.all([
        supabase
          .from("sales_meeting_channels")
          .select("channel,scope,sort_order,goal,realized_current,realized_previous,forecast,meeting_date,period_start,period_end")
          .order("meeting_date", { ascending: false })
          .order("sort_order", { ascending: true }),
        supabase
          .from("ecommerce_funnel")
          .select("period_label,period_start,visits,product_views,add_to_cart,purchases,conversion_rate,revenue,avg_ticket")
          .order("period_start", { ascending: true }),
      ]);
      if (!alive) return;
      const rows = (ch.data ?? []) as MeetingChannel[];
      const latest = rows[0]?.meeting_date;
      setChannels(rows.filter((r) => r.meeting_date === latest));
      setFunnel((fn.data ?? []) as EcommerceFunnelRow[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const meta = useMemo(() => {
    const total = channels.find((c) => c.scope === "total");
    const growth =
      total && total.realized_previous
        ? ((total.realized_current - total.realized_previous) / total.realized_previous) * 100
        : null;
    return {
      total,
      attainment: total && total.goal ? (total.realized_current / total.goal) * 100 : null,
      growth,
      meetingDate: channels[0]?.meeting_date ?? null,
      periodEnd: channels[0]?.period_end ?? null,
    };
  }, [channels]);

  const funnelCompare = useMemo(() => {
    if (funnel.length < 2) return null;
    const prev = funnel[0];
    const cur = funnel[funnel.length - 1];
    const delta = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);
    return {
      prev,
      cur,
      steps: [
        { label: "Visitas no site", cur: cur.visits, prev: prev.visits, growth: delta(cur.visits, prev.visits) },
        { label: "Visitou um produto", cur: cur.product_views, prev: prev.product_views, growth: delta(cur.product_views, prev.product_views) },
        { label: "Adição no carrinho", cur: cur.add_to_cart, prev: prev.add_to_cart, growth: delta(cur.add_to_cart, prev.add_to_cart) },
        { label: "Compras", cur: cur.purchases, prev: prev.purchases, growth: delta(cur.purchases, prev.purchases) },
      ],
    };
  }, [funnel]);

  return { channels, funnel, funnelCompare, meta, loading, hasData: channels.length > 0 };
}
