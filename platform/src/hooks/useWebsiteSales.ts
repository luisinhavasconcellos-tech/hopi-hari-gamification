import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WebsiteSalesRow = { sale_date: string; revenue: number; orders: number | null };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Faturamento diário do site (e-commerce), com acumulado e leitura por dia da semana. */
export function useWebsiteSales() {
  const [rows, setRows] = useState<WebsiteSalesRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("website_sales_daily")
        .select("sale_date, revenue, orders")
        .order("sale_date", { ascending: true });
      if (!alive) return;
      setRows(((data ?? []) as WebsiteSalesRow[]).map((r) => ({ ...r, revenue: Number(r.revenue) })));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const months = [...new Set(rows.map((r) => r.sale_date.slice(0, 7)))].sort();
    const month = months.at(-1) ?? "";
    const cur = rows.filter((r) => r.sale_date.startsWith(month));

    let acc = 0;
    const daily = cur.map((r) => {
      acc += r.revenue;
      const d = new Date(`${r.sale_date}T12:00:00`);
      return {
        date: r.sale_date,
        day: r.sale_date.slice(8, 10),
        weekday: WEEKDAYS[d.getDay()],
        revenue: r.revenue,
        accumulated: acc,
      };
    });

    const total = daily.reduce((s, d) => s + d.revenue, 0);
    const avg = daily.length ? total / daily.length : 0;
    const best = daily.reduce<(typeof daily)[number] | null>((b, d) => (!b || d.revenue > b.revenue ? d : b), null);
    const worst = daily.reduce<(typeof daily)[number] | null>((b, d) => (!b || d.revenue < b.revenue ? d : b), null);

    const byWeekday = WEEKDAYS.map((label) => {
      const list = daily.filter((d) => d.weekday === label);
      const sum = list.reduce((s, d) => s + d.revenue, 0);
      return { weekday: label, revenue: sum, average: list.length ? sum / list.length : 0, days: list.length };
    }).filter((w) => w.days > 0);

    const weekendRevenue = daily
      .filter((d) => d.weekday === "Sábado" || d.weekday === "Domingo")
      .reduce((s, d) => s + d.revenue, 0);

    const monthLabel = month
      ? new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : "";

    return {
      loading,
      hasData: rows.length > 0,
      month,
      monthLabel,
      daily,
      byWeekday,
      total,
      avg,
      best,
      worst,
      days: daily.length,
      weekendShare: total ? (weekendRevenue / total) * 100 : 0,
      projection: daily.length ? (total / daily.length) * 31 : 0,
    };
  }, [rows, loading]);
}
