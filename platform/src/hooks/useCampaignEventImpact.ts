import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pearson, type EnrichedCampaign } from "@/hooks/useCampaigns";

type MonthRow = { ym: string; rides: number; revenue: number; quantity: number };

export type EventImpact = {
  id: string;
  title: string;
  category: string | null;
  start: string;
  end: string;
  days: number;
  rides: number;
  ridesPerDay: number;
  revenue: number;
  revenuePerDay: number;
  quantity: number;
  campaigns: { id: string; name: string; interactions: number; views: number; assets: number }[];
  campaignInteractions: number;
  campaignViews: number;
  campaignAssets: number;
};

const ymOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dayMs = 86400000;
const parse = (d: string) => new Date(`${d}T12:00:00Z`);

/** Normaliza texto para casar nomes de campanha e evento. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const STOP = new Set(["de", "do", "da", "dos", "das", "e", "o", "a", "em", "com", "2026", "2025"]);
const tokens = (s: string) => norm(s).split(" ").filter((t) => t.length > 2 && !STOP.has(t));

function nameOverlap(a: string, b: string) {
  const ta = new Set(tokens(a));
  const tb = tokens(b);
  if (ta.size === 0 || tb.length === 0) return 0;
  const hits = tb.filter((t) => ta.has(t)).length;
  return hits / Math.min(ta.size, tb.length);
}

export function useCampaignEventImpact(campaigns: EnrichedCampaign[]) {
  const [events, setEvents] = useState<{ id: string; title: string; category: string | null; start_date: string; end_date: string }[]>([]);
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: ev }, { data: rides }, { data: sales }] = await Promise.all([
        supabase
          .from("park_events")
          .select("id, title, category, start_date, end_date")
          .eq("active", true)
          .not("start_date", "is", null)
          .order("start_date", { ascending: true }),
        supabase.from("park_attraction_monthly").select("year, month, rides").limit(20000),
        supabase.from("sales_revenue_monthly").select("year, month, revenue, quantity").limit(20000),
      ]);
      if (!alive) return;

      const map = new Map<string, MonthRow>();
      const touch = (y: number, m: number) => {
        const ym = `${y}-${String(m).padStart(2, "0")}`;
        let r = map.get(ym);
        if (!r) map.set(ym, (r = { ym, rides: 0, revenue: 0, quantity: 0 }));
        return r;
      };
      (rides ?? []).forEach((r) => {
        touch(Number(r.year), Number(r.month)).rides += Number(r.rides ?? 0);
      });
      (sales ?? []).forEach((r) => {
        const row = touch(Number(r.year), Number(r.month));
        row.revenue += Number(r.revenue ?? 0);
        row.quantity += Number(r.quantity ?? 0);
      });

      setMonths([...map.values()].sort((a, b) => a.ym.localeCompare(b.ym)));
      setEvents(
        ((ev ?? []) as Record<string, unknown>[])
          .filter((e) => e.start_date)
          .map((e) => ({
            id: String(e.id),
            title: String(e.title),
            category: (e.category as string) ?? null,
            start_date: String(e.start_date),
            end_date: String(e.end_date ?? e.start_date),
          })),
      );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const byYm = new Map(months.map((m) => [m.ym, m]));

    /** Soma rides/receita proporcional aos dias do intervalo (dados são mensais). */
    const prorate = (from: Date, to: Date) => {
      let rides = 0, revenue = 0, quantity = 0, covered = 0;
      const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      while (cur.getTime() <= to.getTime()) {
        const y = cur.getUTCFullYear(), m = cur.getUTCMonth() + 1;
        const dim = daysInMonth(y, m);
        const mStart = Date.UTC(y, m - 1, 1, 12);
        const mEnd = Date.UTC(y, m - 1, dim, 12);
        const ovStart = Math.max(mStart, from.getTime());
        const ovEnd = Math.min(mEnd, to.getTime());
        const d = Math.max(0, Math.round((ovEnd - ovStart) / dayMs) + 1);
        const row = byYm.get(`${y}-${String(m).padStart(2, "0")}`);
        if (row && d > 0) {
          const f = d / dim;
          rides += row.rides * f;
          revenue += row.revenue * f;
          quantity += row.quantity * f;
          covered += d;
        }
        cur.setUTCMonth(cur.getUTCMonth() + 1);
      }
      return { rides, revenue, quantity, covered };
    };

    const impacts: EventImpact[] = events.map((e) => {
      const start = parse(e.start_date);
      const end = parse(e.end_date);
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
      const agg = prorate(start, end);

      // Campanhas ligadas ao evento: nome parecido OU veiculação até 30 dias antes / durante
      const linked = campaigns.filter((c) => {
        if (nameOverlap(e.title, c.name) >= 0.5) return true;
        if (!c.period_start) return false;
        const cs = parse(c.period_start).getTime();
        const ce = parse(c.period_end ?? c.period_start).getTime();
        return ce >= start.getTime() - 30 * dayMs && cs <= end.getTime();
      });

      return {
        id: e.id,
        title: e.title,
        category: e.category,
        start: e.start_date,
        end: e.end_date,
        days,
        rides: Math.round(agg.rides),
        ridesPerDay: agg.covered ? agg.rides / agg.covered : 0,
        revenue: agg.revenue,
        revenuePerDay: agg.covered ? agg.revenue / agg.covered : 0,
        quantity: Math.round(agg.quantity),
        campaigns: linked.map((c) => ({
          id: c.id,
          name: c.name,
          interactions: c.interactions,
          views: c.views,
          assets: c.assets,
        })),
        campaignInteractions: linked.reduce((s, c) => s + c.interactions, 0),
        campaignViews: linked.reduce((s, c) => s + c.views, 0),
        campaignAssets: linked.reduce((s, c) => s + c.assets, 0),
      };
    });

    const sample = impacts.filter((i) => i.campaigns.length > 0 && (i.rides > 0 || i.revenue > 0));
    const corr = (x: (i: EventImpact) => number, y: (i: EventImpact) => number) =>
      pearson(sample.map(x), sample.map(y));

    const eventCorrelations = [
      { key: "int_rides", label: "Interações das campanhas × público (rides/dia)", r: corr((i) => i.campaignInteractions, (i) => i.ridesPerDay) },
      { key: "int_rev", label: "Interações das campanhas × receita/dia", r: corr((i) => i.campaignInteractions, (i) => i.revenuePerDay) },
      { key: "views_rev", label: "Visualizações das campanhas × receita/dia", r: corr((i) => i.campaignViews, (i) => i.revenuePerDay) },
      { key: "assets_rides", label: "Peças criativas × público (rides/dia)", r: corr((i) => i.campaignAssets, (i) => i.ridesPerDay) },
      { key: "camps_rev", label: "Nº de campanhas × receita/dia", r: corr((i) => i.campaigns.length, (i) => i.revenuePerDay) },
      { key: "rides_rev", label: "Público (rides/dia) × receita/dia", r: corr((i) => i.ridesPerDay, (i) => i.revenuePerDay) },
    ];

    // Painel mensal: campanhas e eventos ativos vs. público e receita do mês
    const monthly = months
      .filter((m) => m.rides > 0 || m.revenue > 0)
      .map((m) => {
        const [y, mm] = m.ym.split("-").map(Number);
        const dim = daysInMonth(y, mm);
        const mStart = Date.UTC(y, mm - 1, 1, 12);
        const mEnd = Date.UTC(y, mm - 1, dim, 12);
        const overlapDays = (s?: string | null, e?: string | null) => {
          if (!s) return 0;
          const a = parse(s).getTime();
          const b = parse(e ?? s).getTime();
          return Math.max(0, Math.round((Math.min(b, mEnd) - Math.max(a, mStart)) / dayMs) + 1);
        };
        const campaignDays = campaigns.reduce((s, c) => s + overlapDays(c.period_start, c.period_end), 0);
        const activeCampaigns = campaigns.filter((c) => overlapDays(c.period_start, c.period_end) > 0).length;
        const eventDays = events.reduce((s, e) => s + overlapDays(e.start_date, e.end_date), 0);
        return {
          ym: m.ym,
          label: new Date(`${m.ym}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          rides: m.rides,
          revenue: m.revenue,
          quantity: m.quantity,
          campaignDays,
          activeCampaigns,
          eventDays,
        };
      });

    const withCampaigns = monthly.filter((m) => m.campaignDays > 0);
    const monthlyCorrelations = [
      {
        key: "cdays_rides",
        label: "Dias de campanha no mês × público",
        r: pearson(withCampaigns.map((m) => m.campaignDays), withCampaigns.map((m) => m.rides)),
      },
      {
        key: "cdays_rev",
        label: "Dias de campanha no mês × receita",
        r: pearson(withCampaigns.map((m) => m.campaignDays), withCampaigns.map((m) => m.revenue)),
      },
      {
        key: "edays_rides",
        label: "Dias de evento no mês × público",
        r: pearson(monthly.map((m) => m.eventDays), monthly.map((m) => m.rides)),
      },
      {
        key: "edays_rev",
        label: "Dias de evento no mês × receita",
        r: pearson(monthly.map((m) => m.eventDays), monthly.map((m) => m.revenue)),
      },
    ];

    const linkedCount = impacts.filter((i) => i.campaigns.length > 0).length;

    return {
      loading,
      impacts: [...impacts].sort((a, b) => b.revenue - a.revenue),
      sample,
      eventCorrelations,
      monthly,
      monthlyCorrelations,
      totalEvents: events.length,
      linkedCount,
      hasData: events.length > 0 && months.length > 0,
    };
  }, [events, months, campaigns, loading]);
}
