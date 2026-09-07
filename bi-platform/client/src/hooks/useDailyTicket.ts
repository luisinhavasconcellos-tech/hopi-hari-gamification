import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RevenueSource = "total" | "inpark" | "online";

export type DailyTicketPoint = {
  date: string;
  label: string;
  visitors: number;
  isForecast: boolean;
  inpark: number;
  online: number;
  revenue: number;
  ticket: number | null;
  ticketMa7: number | null;
};

const fmtLabel = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
};

async function fetchAll<T>(table: string, columns: string, orderCol: string): Promise<T[]> {
  const out: T[] = [];
  const step = 1000;
  for (let from = 0; ; from += step) {
    const { data, error } = await supabase
      .from(table as never)
      .select(columns)
      .order(orderCol)
      .order("id") // desempate único: só a data repete entre páginas
      .range(from, from + step - 1);
    if (error || !data?.length) break;
    out.push(...(data as unknown as T[]));
    if (data.length < step) break;
  }
  return out;
}

/**
 * Une receita diária (in-park + site) com o público do dia (realizado ou previsto)
 * para acompanhar o ticket médio por visitante e sua tendência.
 */
export function useDailyTicket(source: RevenueSource = "total", days = 60) {
  const [loading, setLoading] = useState(true);
  const [perCapita, setPerCapita] = useState<{ date: string; public: number | null; revenue: number }[]>([]);
  const [web, setWeb] = useState<{ sale_date: string; revenue: number }[]>([]);
  const [forecast, setForecast] = useState<{ date: string; visitors: number }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [pc, ws, fc] = await Promise.all([
        fetchAll<{ date: string; public: number | null; revenue: number }>(
          "park_percapita_daily",
          "date, public, revenue",
          "date",
        ),
        fetchAll<{ sale_date: string; revenue: number }>("website_sales_daily", "sale_date, revenue", "sale_date"),
        fetchAll<{ date: string; visitors: number }>("park_visitors_forecast", "date, visitors", "date"),
      ]);
      if (!alive) return;
      setPerCapita(pc.map((r) => ({ ...r, public: r.public === null ? null : Number(r.public), revenue: Number(r.revenue) })));
      setWeb(ws.map((r) => ({ ...r, revenue: Number(r.revenue) })));
      setForecast(fc.map((r) => ({ ...r, visitors: Number(r.visitors) })));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const series = useMemo<DailyTicketPoint[]>(() => {
    const map = new Map<string, { inpark: number; online: number; realized: number; forecast: number }>();
    const touch = (d: string) => {
      let e = map.get(d);
      if (!e) {
        e = { inpark: 0, online: 0, realized: 0, forecast: 0 };
        map.set(d, e);
      }
      return e;
    };

    for (const r of perCapita) {
      const e = touch(r.date);
      e.inpark += r.revenue;
      e.realized = Math.max(e.realized, r.public ?? 0);
    }
    for (const r of web) touch(r.sale_date).online += r.revenue;
    for (const r of forecast) touch(r.date).forecast = r.visitors;

    const rows = [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, e]) => {
        const visitors = e.realized > 0 ? e.realized : e.forecast;
        const revenue = source === "inpark" ? e.inpark : source === "online" ? e.online : e.inpark + e.online;
        return {
          date,
          label: fmtLabel(date),
          visitors,
          isForecast: e.realized === 0 && e.forecast > 0,
          inpark: e.inpark,
          online: e.online,
          revenue,
          ticket: visitors > 0 && revenue > 0 ? revenue / visitors : null,
          ticketMa7: null as number | null,
        };
      })
      .filter((r) => r.visitors > 0 || r.revenue > 0);

    const tail = rows.slice(-days);
    // média móvel 7 dias do ticket
    tail.forEach((row, i) => {
      const window = tail.slice(Math.max(0, i - 6), i + 1).map((r) => r.ticket).filter((v): v is number => v !== null);
      row.ticketMa7 = window.length ? window.reduce((s, v) => s + v, 0) / window.length : null;
    });
    return tail;
  }, [perCapita, web, forecast, source, days]);

  const stats = useMemo(() => {
    const withTicket = series.filter((r) => r.ticket !== null && !r.isForecast);
    const avg = (arr: DailyTicketPoint[]) =>
      arr.length ? arr.reduce((s, r) => s + (r.ticket ?? 0), 0) / arr.length : null;
    const last7 = avg(withTicket.slice(-7));
    const prev7 = avg(withTicket.slice(-14, -7));
    const totalRevenue = series.reduce((s, r) => s + r.revenue, 0);
    const totalVisitors = series.reduce((s, r) => s + (r.revenue > 0 ? r.visitors : 0), 0);
    const best = withTicket.reduce<DailyTicketPoint | null>(
      (b, r) => (!b || (r.ticket ?? 0) > (b.ticket ?? 0) ? r : b),
      null,
    );
    return {
      avgTicket: totalVisitors > 0 ? totalRevenue / totalVisitors : null,
      last7,
      trendPct: last7 !== null && prev7 ? ((last7 - prev7) / prev7) * 100 : null,
      totalRevenue,
      totalVisitors,
      best,
      daysWithData: withTicket.length,
    };
  }, [series]);

  return { loading, series, stats };
}
