import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MONTH_LABELS } from "@/hooks/useParkAttractions";

export type Distributor = {
  full_key: string;
  name: string;
  code: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
};

export type DistributorSale = {
  distributor_key: string;
  year: number;
  month: number;
  quantity: number;
  revenue: number;
  goal_quantity: number | null;
};

export function useDistributors() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [sales, setSales] = useState<DistributorSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, s] = await Promise.all([
        supabase.from("distributors").select("full_key, name, code, region, phone, email").order("name"),
        supabase
          .from("distributor_sales_monthly")
          .select("distributor_key, year, month, quantity, revenue, goal_quantity")
          .order("year")
          .order("month"),
      ]);
      if (!alive) return;
      setDistributors((d.data ?? []) as Distributor[]);
      setSales(((s.data ?? []) as DistributorSale[]).map((r) => ({ ...r, revenue: Number(r.revenue) })));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const years = [...new Set(sales.map((r) => r.year))].sort();
    const current = years.at(-1) ?? new Date().getFullYear();
    const previous = years.length > 1 ? years[years.length - 2] : current - 1;
    const cur = sales.filter((r) => r.year === current);
    const curMonths = new Set(cur.filter((r) => r.quantity > 0).map((r) => r.month));
    const prevComparable = sales.filter((r) => r.year === previous && curMonths.has(r.month));

    const qty = (l: DistributorSale[]) => l.reduce((s, r) => s + r.quantity, 0);
    const rev = (l: DistributorSale[]) => l.reduce((s, r) => s + Number(r.revenue), 0);

    const info = new Map(distributors.map((d) => [d.full_key, d]));

    const segmentOf = (region: string | null) =>
      /empresa|evento|corporativ/i.test(region ?? "")
        ? "Empresas & Eventos"
        : "Escolas & Varejo regional";

    const ranking = [...new Set(sales.map((r) => r.distributor_key))]
      .map((key) => {
        const c = cur.filter((r) => r.distributor_key === key);
        const p = prevComparable.filter((r) => r.distributor_key === key);
        const d = info.get(key);
        const goal = c.reduce((s, r) => s + (r.goal_quantity ?? 0), 0);
        const quantity = qty(c);
        const revenue = rev(c);
        const prevRevenue = rev(p);
        return {
          key,
          name: d?.name ?? key,
          code: d?.code ?? null,
          region: d?.region ?? null,
          segment: segmentOf(d?.region ?? null),
          phone: d?.phone ?? null,
          email: d?.email ?? null,
          quantity,
          revenue,
          prevQuantity: qty(p),
          prevRevenue,
          revenueGrowth: prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
          goal,
          goalPct: goal ? (quantity / goal) * 100 : null,
          ticket: quantity ? rev(c) / quantity : 0,
          growth: qty(p) ? ((quantity - qty(p)) / qty(p)) * 100 : null,
        };
      })
      .sort((a, b) => b.quantity - a.quantity);

    const byMonth = MONTH_LABELS.map((label, i) => ({
      month: label,
      quantidade: qty(cur.filter((r) => r.month === i + 1)),
      faturamento: rev(cur.filter((r) => r.month === i + 1)),
      anterior: qty(sales.filter((r) => r.year === previous && r.month === i + 1)),
      faturamentoAnterior: rev(sales.filter((r) => r.year === previous && r.month === i + 1)),
      meta: sales
        .filter((r) => r.year === current && r.month === i + 1)
        .reduce((s, r) => s + (r.goal_quantity ?? 0), 0),
    })).filter((r) => r.quantidade > 0 || r.anterior > 0 || r.meta > 0);




    const totalQty = qty(cur);
    const totalRev = rev(cur);
    const totalGoal = cur.reduce((s, r) => s + (r.goal_quantity ?? 0), 0);

    const bySegment = ["Empresas & Eventos", "Escolas & Varejo regional"].map((segment) => {
      const list = ranking.filter((r) => r.segment === segment);
      const quantity = list.reduce((s, r) => s + r.quantity, 0);
      const revenue = list.reduce((s, r) => s + r.revenue, 0);
      const prevQuantity = list.reduce((s, r) => s + r.prevQuantity, 0);
      const prevRevenue = list.reduce((s, r) => s + r.prevRevenue, 0);
      const goal = list.reduce((s, r) => s + r.goal, 0);
      return {
        segment,
        partners: list.length,
        activePartners: list.filter((r) => r.quantity > 0).length,
        quantity,
        revenue,
        prevQuantity,
        prevRevenue,
        revenueGrowth: prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
        goal,
        goalPct: goal ? (quantity / goal) * 100 : null,
        ticket: quantity ? revenue / quantity : 0,
        growth: prevQuantity ? ((quantity - prevQuantity) / prevQuantity) * 100 : null,
        share: totalQty ? (quantity / totalQty) * 100 : 0,
      };
    });


    const segmentByMonth = MONTH_LABELS.map((label, i) => {
      const monthRows = cur.filter((r) => r.month === i + 1);
      const sum = (seg: string) =>
        monthRows
          .filter((r) => segmentOf(info.get(r.distributor_key)?.region ?? null) === seg)
          .reduce((s, r) => s + r.quantity, 0);
      return {
        month: label,
        empresas: sum("Empresas & Eventos"),
        escolas: sum("Escolas & Varejo regional"),
      };
    }).filter((r) => r.empresas > 0 || r.escolas > 0);

    return {

      loading,
      distributors,
      years,
      currentYear: current,
      previousYear: previous,
      ranking,
      bySegment,
      segmentByMonth,
      byMonth,
      totalQty,
      totalRev,
      totalGoal,
      goalPct: totalGoal ? (totalQty / totalGoal) * 100 : null,
      prevQty: qty(prevComparable),
      prevRev: rev(prevComparable),
      revGrowth: rev(prevComparable)
        ? ((totalRev - rev(prevComparable)) / rev(prevComparable)) * 100
        : null,
      prevAvgTicket: qty(prevComparable) ? rev(prevComparable) / qty(prevComparable) : 0,
      growth: qty(prevComparable) ? ((totalQty - qty(prevComparable)) / qty(prevComparable)) * 100 : null,
      avgTicket: totalQty ? totalRev / totalQty : 0,
      activeCount: ranking.filter((r) => r.quantity > 0).length,
      hasData: sales.length > 0,
    };
  }, [distributors, sales, loading]);

}
