import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PerCapitaRow = {
  date: string;
  category: string;
  public: number | null;
  quantity: number | null;
  penetration_pct: number | null;
  revenue: number;
  per_capita: number | null;
};

export type OutletRow = { date: string; outlet: string; revenue: number };
export type GateFlowRow = { date: string; hour: number; entries: number; exits: number };
export type PublicMonthRow = { year: number; month: number; visitors: number; open_days: number | null };

export const MONTHS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/**
 * Dados operacionais/financeiros do parque vindos das planilhas oficiais:
 * per capita diário (A&B, Mercadorias, Jogos), receita por loja/jogo,
 * fluxo de portaria por hora e público mensal histórico (2001–2026).
 */
export function useParkRevenue() {
  const [loading, setLoading] = useState(true);
  const [perCapita, setPerCapita] = useState<PerCapitaRow[]>([]);
  const [outlets, setOutlets] = useState<OutletRow[]>([]);
  const [flow, setFlow] = useState<GateFlowRow[]>([]);
  const [publicMonthly, setPublicMonthly] = useState<PublicMonthRow[]>([]);

  useEffect(() => {
    let alive = true;

    /** PostgREST limita a 1000 linhas por request — pagina até acabar. */
    async function fetchAll<T>(table: string, columns: string, orderBy: string): Promise<T[]> {
      const page = 1000;
      const out: T[] = [];
      for (let from = 0; ; from += page) {
        const { data, error } = await supabase
          .from(table as never)
          .select(columns)
          .order(orderBy)
          .range(from, from + page - 1);
        if (error || !data) break;
        out.push(...(data as unknown as T[]));
        if (data.length < page) break;
      }
      return out;
    }

    (async () => {
      const [pc, ot, gf, pm] = await Promise.all([
        fetchAll<PerCapitaRow>(
          "park_percapita_daily",
          "date, category, public, quantity, penetration_pct, revenue, per_capita",
          "date",
        ),
        fetchAll<OutletRow>("park_outlet_revenue_daily", "date, outlet, revenue", "date"),
        fetchAll<GateFlowRow>("park_gate_flow_hourly", "date, hour, entries, exits", "date"),
        fetchAll<PublicMonthRow>("park_public_monthly", "year, month, visitors, open_days", "year"),
      ]);
      if (!alive) return;
      setPerCapita(pc);
      setOutlets(ot);
      setFlow(gf);
      setPublicMonthly(pm);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(perCapita.map((r) => r.category))].sort(),
    [perCapita],
  );

  /** Resumo por categoria: receita total, per capita médio ponderado e penetração. */
  const byCategory = useMemo(() => {
    const map = new Map<string, { revenue: number; days: number; publicSum: number; pen: number[]; first: string; last: string }>();
    for (const r of perCapita) {
      const e = map.get(r.category) ?? { revenue: 0, days: 0, publicSum: 0, pen: [], first: r.date, last: r.date };
      e.revenue += Number(r.revenue) || 0;
      e.days += 1;
      e.publicSum += Number(r.public) || 0;
      if (r.date < e.first) e.first = r.date;
      if (r.date > e.last) e.last = r.date;
      if (r.penetration_pct != null) e.pen.push(Number(r.penetration_pct));
      map.set(r.category, e);
    }
    return [...map]
      .map(([category, e]) => ({
        category,
        revenue: e.revenue,
        days: e.days,
        publicSum: e.publicSum,
        firstDate: e.first,
        lastDate: e.last,
        perCapita: e.publicSum ? e.revenue / e.publicSum : null,
        penetration: e.pen.length ? e.pen.reduce((s, v) => s + v, 0) / e.pen.length : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [perCapita]);

  /** Série diária por categoria (para gráfico de linhas). */
  const dailySeries = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const r of perCapita) {
      const row = map.get(r.date) ?? { date: r.date };
      row[`${r.category}_pc`] = Number(r.per_capita ?? 0);
      row[`${r.category}_rev`] = Number(r.revenue ?? 0);
      map.set(r.date, row);
    }
    return [...map.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [perCapita]);

  /** Per capita médio por mês e categoria. */
  const monthlyPerCapita = useMemo(() => {
    const map = new Map<string, { revenue: number; publicSum: number }>();
    for (const r of perCapita) {
      const key = `${r.date.slice(0, 7)}|${r.category}`;
      const e = map.get(key) ?? { revenue: 0, publicSum: 0 };
      e.revenue += Number(r.revenue) || 0;
      e.publicSum += Number(r.public) || 0;
      map.set(key, e);
    }
    const byMonth = new Map<string, Record<string, number | string>>();
    for (const [key, e] of map) {
      const [month, category] = key.split("|");
      const row = byMonth.get(month) ?? { month };
      row[category] = e.publicSum ? Number((e.revenue / e.publicSum).toFixed(2)) : 0;
      byMonth.set(month, row);
    }
    return [...byMonth.values()].sort((a, b) => String(a.month).localeCompare(String(b.month)));
  }, [perCapita]);

  /** Ranking de lojas e jogos por receita acumulada. */
  const outletRanking = useMemo(() => {
    const map = new Map<string, { revenue: number; days: number }>();
    for (const r of outlets) {
      const e = map.get(r.outlet) ?? { revenue: 0, days: 0 };
      e.revenue += Number(r.revenue) || 0;
      e.days += 1;
      map.set(r.outlet, e);
    }
    const total = [...map.values()].reduce((s, e) => s + e.revenue, 0) || 1;
    return [...map]
      .map(([outlet, e]) => ({
        outlet,
        revenue: e.revenue,
        days: e.days,
        avgDay: e.days ? e.revenue / e.days : 0,
        share: (e.revenue / total) * 100,
        kind: outlet.startsWith("Jogo ·") ? ("jogo" as const) : ("loja" as const),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [outlets]);

  /** Curva média de entrada/evasão por hora (todos os dias com registro). */
  const hourlyCurve = useMemo(() => {
    const map = new Map<number, { entries: number; exits: number; days: Set<string> }>();
    for (const r of flow) {
      const e = map.get(r.hour) ?? { entries: 0, exits: 0, days: new Set<string>() };
      e.entries += r.entries;
      e.exits += r.exits;
      e.days.add(r.date);
      map.set(r.hour, e);
    }
    return [...map]
      .map(([hour, e]) => ({
        hour,
        label: `${String(hour).padStart(2, "0")}h`,
        entries: e.days.size ? Math.round(e.entries / e.days.size) : 0,
        exits: e.days.size ? Math.round(e.exits / e.days.size) : 0,
      }))
      .sort((a, b) => a.hour - b.hour);
  }, [flow]);

  const flowDays = useMemo(() => new Set(flow.map((f) => f.date)).size, [flow]);

  /** Pico de entrada: hora com maior média. */
  const peakHour = useMemo(
    () => hourlyCurve.reduce<(typeof hourlyCurve)[number] | null>((best, h) => (!best || h.entries > best.entries ? h : best), null),
    [hourlyCurve],
  );

  /** Público por ano com dias abertos e média por dia de operação. */
  const publicByYear = useMemo(() => {
    const map = new Map<number, { visitors: number; openDays: number }>();
    for (const r of publicMonthly) {
      const e = map.get(r.year) ?? { visitors: 0, openDays: 0 };
      e.visitors += r.visitors;
      e.openDays += r.open_days ?? 0;
      map.set(r.year, e);
    }
    return [...map]
      .map(([year, e]) => ({
        year,
        visitors: e.visitors,
        openDays: e.openDays,
        avgPerOpenDay: e.openDays ? Math.round(e.visitors / e.openDays) : null,
      }))
      .sort((a, b) => a.year - b.year);
  }, [publicMonthly]);

  const totalRevenue = useMemo(
    () => perCapita.reduce((s, r) => s + (Number(r.revenue) || 0), 0),
    [perCapita],
  );

  const range = useMemo(() => {
    const dates = perCapita.map((r) => r.date).sort();
    return { first: dates[0] ?? null, last: dates[dates.length - 1] ?? null };
  }, [perCapita]);

  return {
    loading,
    perCapita,
    outlets,
    flow,
    categories,
    byCategory,
    dailySeries,
    monthlyPerCapita,
    outletRanking,
    hourlyCurve,
    flowDays,
    peakHour,
    publicMonthly,
    publicByYear,
    totalRevenue,
    range,
  };
}
