import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DistributorDailyRow = {
  sale_date: string | null;
  year: number;
  month: number;
  kind: string;
  quantity: number;
  revenue: number;
};

/** Vendas diárias de distribuidores (comparação ano atual x ano anterior no mesmo mês). */
export function useDistributorDaily() {
  const [rows, setRows] = useState<DistributorDailyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("distributor_sales_daily")
        .select("sale_date, year, month, kind, quantity, revenue")
        .order("sale_date", { ascending: true });
      if (!alive) return;
      setRows(((data ?? []) as DistributorDailyRow[]).map((r) => ({ ...r, revenue: Number(r.revenue) })));
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
    const month = rows.find((r) => r.year === current)?.month ?? new Date().getMonth() + 1;

    const pick = (year: number) => rows.filter((r) => r.year === year && r.month === month);
    const cur = pick(current);
    const prev = pick(previous);

    const sum = (l: DistributorDailyRow[], k: "quantity" | "revenue") =>
      l.reduce((s, r) => s + Number(r[k]), 0);

    const dayOf = (r: DistributorDailyRow) => (r.sale_date ? Number(r.sale_date.slice(8, 10)) : null);
    const days = [...new Set(rows.filter((r) => r.month === month).map(dayOf).filter((d): d is number => d !== null))].sort(
      (a, b) => a - b,
    );

    let curAcc = 0;
    let prevAcc = 0;
    const daily = days.map((day) => {
      const c = cur.find((r) => dayOf(r) === day);
      const p = prev.find((r) => dayOf(r) === day);
      curAcc += c?.revenue ?? 0;
      prevAcc += p?.revenue ?? 0;
      return {
        day: String(day).padStart(2, "0"),
        atual: c?.revenue ?? null,
        anterior: p?.revenue ?? null,
        qtdAtual: c?.quantity ?? null,
        qtdAnterior: p?.quantity ?? null,
        acumuladoAtual: c ? curAcc : null,
        acumuladoAnterior: p ? prevAcc : null,
      };
    });

    const totals = (l: DistributorDailyRow[]) => {
      const revenue = sum(l, "revenue");
      const quantity = sum(l, "quantity");
      const consigned = l.filter((r) => r.kind === "consignado");
      return {
        revenue,
        quantity,
        ticket: quantity ? revenue / quantity : 0,
        activeDays: l.filter((r) => r.kind === "daily").length,
        consignedRevenue: sum(consigned, "revenue"),
        consignedQty: sum(consigned, "quantity"),
      };
    };

    const c = totals(cur);
    const p = totals(prev);
    const delta = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

    const goals: Record<number, number> = { 2026: 3486591, 2025: 2386296.29 };
    const goalCurrent = goals[current] ?? null;
    const goalPrevious = goals[previous] ?? null;

    return {
      loading,
      hasData: rows.length > 0,
      month,
      currentYear: current,
      previousYear: previous,
      daily,
      current: c,
      previous: p,
      goalCurrent,
      goalPrevious,
      goalAttainment: goalCurrent ? (c.revenue / goalCurrent) * 100 : null,
      goalGap: goalCurrent ? c.revenue - goalCurrent : null,
      previousAttainment: goalPrevious ? (p.revenue / goalPrevious) * 100 : null,
      revenueGrowth: delta(c.revenue, p.revenue),
      quantityGrowth: delta(c.quantity, p.quantity),
      ticketGrowth: delta(c.ticket, p.ticket),
      revenueGap: c.revenue - p.revenue,
    };

  }, [rows, loading]);
}
