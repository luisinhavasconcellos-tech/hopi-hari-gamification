import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";
import { MONTH_LABELS } from "@/hooks/useParkAttractions";

export type RevenueRow = { channel: string; year: number; month: number; quantity: number; revenue: number };
export type ProductRow = { channel: string; product: string; year: number; quantity: number; revenue: number };

/** Agrupamento de negócio dos canais da base de vendas 2023–2026. */
export const CHANNEL_GROUPS: Record<string, string> = {
  "A & B": "Alimentos & Bebidas",
  MERC: "Mercadorias",
  PLAKA: "Mercadorias",
  SERV: "Serviços do parque",
  "HOPI NIVER": "Serviços do parque",
  BILHETERIA: "Ingressos",
  "E-COMMERCE": "Ingressos",
  TLMKT: "Ingressos",
  AGVT: "Ingressos",
  TURISMO: "Ingressos",
  PARCEIROS: "Ingressos",
  CONSIGNAÇÃO: "Ingressos",
  DIVULGAÇÃO: "Ingressos",
  EMPRESA: "B2B & Grupos",
  EVENTOS: "B2B & Grupos",
  ESCOLA: "B2B & Grupos",
  "ESCOLA PARTICULAR": "B2B & Grupos",
  "ESCOLA PUBLICA": "B2B & Grupos",
};

export const groupOf = (channel: string) => CHANNEL_GROUPS[channel] ?? "Outros";

export function useSalesRevenue() {
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [r, p] = await Promise.all([
        fetchAllRows<RevenueRow>((from, to) =>
          supabase
            .from("sales_revenue_monthly")
            .select("channel, year, month, quantity, revenue")
            .order("year")
            .order("month")
            .order("id")
            .range(from, to),
        ),
        fetchAllRows<ProductRow>((from, to) =>
          supabase
            .from("sales_product_yearly")
            .select("channel, product, year, quantity, revenue")
            .order("year")
            .order("id")
            .range(from, to),
        ),
      ]);
      if (!alive) return;
      setRows(r.rows.map((x) => ({ ...x, quantity: Number(x.quantity), revenue: Number(x.revenue) })));
      setProducts(p.rows.map((x) => ({ ...x, quantity: Number(x.quantity), revenue: Number(x.revenue) })));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const years = [...new Set(rows.map((r) => r.year))].sort();
    const currentYear = years.at(-1) ?? new Date().getFullYear();
    const previousYear = years.length > 1 ? years[years.length - 2] : currentYear - 1;

    const cur = rows.filter((r) => r.year === currentYear);
    const curMonths = new Set(cur.map((r) => r.month));
    const prevComparable = rows.filter((r) => r.year === previousYear && curMonths.has(r.month));
    const lastMonth = Math.max(0, ...cur.map((r) => r.month));

    const sumRev = (l: RevenueRow[]) => l.reduce((s, r) => s + r.revenue, 0);
    const sumQty = (l: RevenueRow[]) => l.reduce((s, r) => s + r.quantity, 0);

    const totalCurrent = sumRev(cur);
    const totalPrevious = sumRev(prevComparable);
    const growth = totalPrevious ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : null;

    const byChannel = [...new Set(rows.map((r) => r.channel))]
      .map((channel) => {
        const c = cur.filter((r) => r.channel === channel);
        const p = prevComparable.filter((r) => r.channel === channel);
        const revenue = sumRev(c);
        const prevRevenue = sumRev(p);
        const qty = sumQty(c);
        return {
          channel,
          group: groupOf(channel),
          revenue,
          prevRevenue,
          quantity: qty,
          avgTicket: qty ? revenue / qty : 0,
          share: totalCurrent ? (revenue / totalCurrent) * 100 : 0,
          growth: prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
        };
      })
      .filter((c) => c.revenue > 0 || c.prevRevenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const byGroup = [...new Set(byChannel.map((c) => c.group))]
      .map((group) => {
        const list = byChannel.filter((c) => c.group === group);
        const revenue = list.reduce((s, c) => s + c.revenue, 0);
        const prevRevenue = list.reduce((s, c) => s + c.prevRevenue, 0);
        return {
          group,
          revenue,
          prevRevenue,
          share: totalCurrent ? (revenue / totalCurrent) * 100 : 0,
          growth: prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const byMonth = MONTH_LABELS.map((label, i) => ({
      month: label,
      atual: sumRev(cur.filter((r) => r.month === i + 1)),
      anterior: sumRev(rows.filter((r) => r.year === previousYear && r.month === i + 1)),
    })).filter((_, index) => curMonths.has(index + 1));

    const byYear = years.map((y) => {
      const list = rows.filter((r) => r.year === y);
      return { year: y, revenue: sumRev(list), quantity: sumQty(list) };
    });

    return {
      loading,
      rows,
      products,
      years,
      currentYear,
      previousYear,
      lastMonth,
      byChannel,
      byGroup,
      byMonth,
      byYear,
      totalCurrent,
      totalPrevious,
      growth,
      hasData: rows.length > 0,
    };
  }, [rows, products, loading]);
}

/** Produtos de um conjunto de canais, agregados por ano com comparativo. */
export function useProductMix(channels: string[]) {
  const base = useSalesRevenue();
  return useMemo(() => {
    const set = new Set(channels);
    const list = base.products.filter((p) => set.has(p.channel));
    const years = [...new Set(list.map((p) => p.year))].sort();
    const currentYear = years.at(-1) ?? base.currentYear;
    const previousYear = years.length > 1 ? years[years.length - 2] : currentYear - 1;

    const agg = new Map<string, { product: string; revenue: number; quantity: number; prevRevenue: number }>();
    for (const p of list) {
      const e = agg.get(p.product) ?? { product: p.product, revenue: 0, quantity: 0, prevRevenue: 0 };
      if (p.year === currentYear) {
        e.revenue += p.revenue;
        e.quantity += p.quantity;
      }
      if (p.year === previousYear) e.prevRevenue += p.revenue;
      agg.set(p.product, e);
    }
    const total = [...agg.values()].reduce((s, e) => s + e.revenue, 0);
    const items = [...agg.values()]
      .map((e) => ({
        ...e,
        avgPrice: e.quantity ? e.revenue / e.quantity : 0,
        share: total ? (e.revenue / total) * 100 : 0,
        growth: e.prevRevenue ? ((e.revenue - e.prevRevenue) / e.prevRevenue) * 100 : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const monthly = base.rows.filter((r) => set.has(r.channel));
    const monthlyRevenue = MONTH_LABELS.map((label, i) => ({
      month: label,
      atual: monthly.filter((r) => r.year === currentYear && r.month === i + 1).reduce((s, r) => s + r.revenue, 0),
      anterior: monthly.filter((r) => r.year === previousYear && r.month === i + 1).reduce((s, r) => s + r.revenue, 0),
    })).filter((r) => r.atual > 0 || r.anterior > 0);

    const curQty = monthly.filter((r) => r.year === currentYear).reduce((s, r) => s + r.quantity, 0);

    return {
      loading: base.loading,
      currentYear,
      previousYear,
      items,
      total,
      quantity: curQty,
      avgTicket: curQty ? total / curQty : 0,
      monthlyRevenue,
      hasData: items.length > 0,
    };
  }, [base, channels.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
}
