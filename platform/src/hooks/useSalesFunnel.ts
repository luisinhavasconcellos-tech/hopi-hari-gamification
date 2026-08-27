import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FunnelDeal = {
  year: number;
  stage: string;
  company: string;
  pax: number | null;
  event_date: string | null;
  event_type: string | null;
  status: string | null;
  loss_reason: string | null;
  total_value: number;
  paid_value: number | null;
};

export type FunnelMonthly = { year: number; month: number; revenue: number };

export const STAGE_LABELS: Record<string, string> = {
  prospeccao: "Prospecção",
  negociacao: "Negociação",
  em_processo: "Em processo",
  fechado: "Fechados",
  nao_realizado: "Não realizados",
};

export const STAGE_ORDER = ["prospeccao", "negociacao", "em_processo", "fechado", "nao_realizado"];

/** Etapas que formam o caminho principal do funil (sem a ramificação de perda). */
export const FUNNEL_PATH = ["prospeccao", "negociacao", "em_processo", "fechado"];

export const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type FunnelPeriod = {
  year?: number;
  compareYear?: number;
  monthFrom?: number;
  monthTo?: number;
};

export type StageTransition = {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  fromDeals: number;
  toDeals: number;
  rate: number | null;
  basis: string;
  drop: number;
  valueFrom: number;
  valueTo: number;
  branch: boolean;
};

const monthOf = (d: string | null) => (d ? Number(d.slice(5, 7)) : null);

export function useSalesFunnel(period: FunnelPeriod = {}) {
  const [deals, setDeals] = useState<FunnelDeal[]>([]);
  const [monthly, setMonthly] = useState<FunnelMonthly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const all: FunnelDeal[] = [];
      const size = 1000;
      for (let from = 0; ; from += size) {
        const { data, error } = await supabase
          .from("sales_funnel_deals")
          .select("year, stage, company, pax, event_date, event_type, status, loss_reason, total_value, paid_value")
          .order("year", { ascending: false })
          .range(from, from + size - 1);
        if (error || !data?.length) break;
        all.push(...(data as unknown as FunnelDeal[]));
        if (data.length < size) break;
      }
      const { data: m } = await supabase
        .from("sales_funnel_monthly")
        .select("year, month, revenue")
        .order("month");
      if (!alive) return;
      setDeals(all.map((d) => ({ ...d, total_value: Number(d.total_value ?? 0) })));
      setMonthly(((m ?? []) as unknown as FunnelMonthly[]).map((r) => ({ ...r, revenue: Number(r.revenue) })));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const { year: yearOpt, compareYear: compareOpt, monthFrom = 1, monthTo = 12 } = period;

  return useMemo(() => {
    const years = [...new Set(deals.map((d) => d.year))].sort((a, b) => b - a);
    const fallbackYear = years[0] ?? new Date().getFullYear();
    const currentYear = yearOpt && years.includes(yearOpt) ? yearOpt : fallbackYear;
    const otherYears = years.filter((y) => y !== currentYear);
    const previousYear =
      compareOpt && years.includes(compareOpt) && compareOpt !== currentYear
        ? compareOpt
        : otherYears.find((y) => y < currentYear) ?? otherYears[0] ?? currentYear - 1;

    const fullRange = monthFrom === 1 && monthTo === 12;
    const inPeriod = (d: FunnelDeal) => {
      if (fullRange) return true;
      const m = monthOf(d.event_date);
      if (m === null) return false;
      return m >= monthFrom && m <= monthTo;
    };

    const byYear = (y: number) => deals.filter((d) => d.year === y && inPeriod(d));
    const sum = (list: FunnelDeal[]) => list.reduce((s, d) => s + (d.total_value || 0), 0);
    const pax = (list: FunnelDeal[]) => list.reduce((s, d) => s + (d.pax ?? 0), 0);

    const curAll = byYear(currentYear);
    const prevAll = byYear(previousYear);

    const stages = STAGE_ORDER.map((stage) => {
      const cur = curAll.filter((d) => d.stage === stage);
      const prev = prevAll.filter((d) => d.stage === stage);
      return {
        stage,
        label: STAGE_LABELS[stage] ?? stage,
        deals: cur.length,
        value: sum(cur),
        pax: pax(cur),
        previousDeals: prev.length,
        previousValue: sum(prev),
        previousPax: pax(prev),
        dealsDelta: prev.length ? ((cur.length - prev.length) / prev.length) * 100 : null,
        valueDelta: sum(prev) ? ((sum(cur) - sum(prev)) / sum(prev)) * 100 : null,
      };
    });

    const stageMap = new Map(stages.map((s) => [s.stage, s]));

    /**
     * Transições entre etapas. Prospecção → Negociação → Em processo usa a etapa
     * anterior como base. O desfecho (Fechados / Não realizados) usa como base o
     * total de negócios que chegaram à decisão (em processo + fechados + perdidos),
     * já que fechados e perdidos saem do snapshot de "em processo".
     */
    const negociacao = stageMap.get("negociacao")!;
    const prospeccao = stageMap.get("prospeccao")!;
    const emProcesso = stageMap.get("em_processo")!;
    const fechados = stageMap.get("fechado")!;
    const perdidos = stageMap.get("nao_realizado")!;
    const outcomeBase = emProcesso.deals + fechados.deals + perdidos.deals;

    const transitions: StageTransition[] = [
      {
        from: prospeccao.stage,
        to: negociacao.stage,
        fromLabel: prospeccao.label,
        toLabel: negociacao.label,
        fromDeals: prospeccao.deals,
        toDeals: negociacao.deals,
        rate: prospeccao.deals ? (negociacao.deals / prospeccao.deals) * 100 : null,
        basis: "avanço sobre a etapa anterior",
        drop: Math.max(prospeccao.deals - negociacao.deals, 0),
        valueFrom: prospeccao.value,
        valueTo: negociacao.value,
        branch: false,
      },
      {
        from: negociacao.stage,
        to: emProcesso.stage,
        fromLabel: negociacao.label,
        toLabel: emProcesso.label,
        fromDeals: negociacao.deals,
        toDeals: emProcesso.deals,
        rate: negociacao.deals ? (emProcesso.deals / negociacao.deals) * 100 : null,
        basis: "avanço sobre a etapa anterior",
        drop: Math.max(negociacao.deals - emProcesso.deals, 0),
        valueFrom: negociacao.value,
        valueTo: emProcesso.value,
        branch: false,
      },
      {
        from: emProcesso.stage,
        to: fechados.stage,
        fromLabel: emProcesso.label,
        toLabel: fechados.label,
        fromDeals: outcomeBase,
        toDeals: fechados.deals,
        rate: outcomeBase ? (fechados.deals / outcomeBase) * 100 : null,
        basis: "sobre os negócios que chegaram ao desfecho",
        drop: Math.max(outcomeBase - fechados.deals, 0),
        valueFrom: emProcesso.value,
        valueTo: fechados.value,
        branch: false,
      },
      {
        from: emProcesso.stage,
        to: perdidos.stage,
        fromLabel: emProcesso.label,
        toLabel: perdidos.label,
        fromDeals: outcomeBase,
        toDeals: perdidos.deals,
        rate: outcomeBase ? (perdidos.deals / outcomeBase) * 100 : null,
        basis: "sobre os negócios que chegaram ao desfecho",
        drop: perdidos.deals,
        valueFrom: emProcesso.value,
        valueTo: perdidos.value,
        branch: true,
      },
    ];

    const transitionsFor = (stage: string | null) =>
      stage
        ? {
            incoming: transitions.filter((t) => t.to === stage),
            outgoing: transitions.filter((t) => t.from === stage),
          }
        : { incoming: [], outgoing: [] };

    const dealsByStage = (stage: string | null, year = currentYear) =>
      stage ? (year === currentYear ? curAll : byYear(year)).filter((d) => d.stage === stage) : [];

    const closed = curAll.filter((d) => d.stage === "fechado");
    const lost = curAll.filter((d) => d.stage === "nao_realizado");
    const pipeline = curAll.filter((d) => d.stage === "negociacao" || d.stage === "em_processo");
    const decided = closed.length + lost.length;

    const prevClosed = prevAll.filter((d) => d.stage === "fechado");
    const prevLost = prevAll.filter((d) => d.stage === "nao_realizado");
    const prevPipeline = prevAll.filter((d) => d.stage === "negociacao" || d.stage === "em_processo");

    const lossReasons = (() => {
      const map = new Map<string, { reason: string; deals: number; value: number }>();
      lost.forEach((d) => {
        const reason = d.loss_reason?.trim() || "Não informado";
        const e = map.get(reason) ?? { reason, deals: 0, value: 0 };
        e.deals += 1;
        e.value += d.total_value || 0;
        map.set(reason, e);
      });
      return [...map.values()].sort((a, b) => b.deals - a.deals);
    })();

    const eventTypes = (() => {
      const map = new Map<string, { type: string; deals: number; value: number; pax: number }>();
      [...closed, ...pipeline].forEach((d) => {
        const type = d.event_type?.trim() || "Não informado";
        const e = map.get(type) ?? { type, deals: 0, value: 0, pax: 0 };
        e.deals += 1;
        e.value += d.total_value || 0;
        e.pax += d.pax ?? 0;
        map.set(type, e);
      });
      return [...map.values()].sort((a, b) => b.value - a.value);
    })();

    const byMonth = MONTHS.map((label, idx) => {
      const m = idx + 1;
      return {
        month: label,
        monthIndex: m,
        atual: monthly.find((r) => r.year === currentYear && r.month === m)?.revenue ?? 0,
        anterior: monthly.find((r) => r.year === previousYear && r.month === m)?.revenue ?? 0,
      };
    })
      .filter((r) => r.monthIndex >= monthFrom && r.monthIndex <= monthTo)
      .filter((r) => r.atual > 0 || r.anterior > 0);

    const revenueCurrent = byMonth.reduce((s, r) => s + r.atual, 0);
    const revenuePrevious = byMonth.reduce((s, r) => s + r.anterior, 0);

    const topDeals = [...closed].sort((a, b) => b.total_value - a.total_value).slice(0, 12);
    const upcoming = [...pipeline]
      .filter((d) => d.event_date)
      .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1))
      .slice(0, 12);

    const conversionRate = decided ? (closed.length / decided) * 100 : null;
    const previousConversionRate =
      prevClosed.length + prevLost.length ? (prevClosed.length / (prevClosed.length + prevLost.length)) * 100 : null;

    return {
      loading,
      hasData: deals.length > 0,
      years,
      currentYear,
      previousYear,
      monthFrom,
      monthTo,
      periodLabel: fullRange ? "Ano completo" : `${MONTHS[monthFrom - 1]}–${MONTHS[monthTo - 1]}`,
      stages,
      transitions,
      transitionsFor,
      dealsByStage,
      closedCount: closed.length,
      closedValue: sum(closed),
      closedPax: pax(closed),
      lostCount: lost.length,
      lostValue: sum(lost),
      pipelineCount: pipeline.length,
      pipelineValue: sum(pipeline),
      previousPipelineValue: sum(prevPipeline),
      previousPipelineCount: prevPipeline.length,
      previousClosedCount: prevClosed.length,
      prospects: curAll.filter((d) => d.stage === "prospeccao").length,
      conversionRate,
      previousConversionRate,
      avgTicket: closed.length ? sum(closed) / closed.length : 0,
      previousAvgTicket: prevClosed.length ? sum(prevClosed) / prevClosed.length : 0,
      previousClosedValue: sum(prevClosed),
      closedValueDelta: sum(prevClosed) ? ((sum(closed) - sum(prevClosed)) / sum(prevClosed)) * 100 : null,
      byMonth,
      revenueCurrent,
      revenuePrevious,
      revenueGrowth: revenuePrevious ? ((revenueCurrent - revenuePrevious) / revenuePrevious) * 100 : null,
      lossReasons,
      eventTypes,
      topDeals,
      upcoming,
    };
  }, [deals, monthly, loading, yearOpt, compareOpt, monthFrom, monthTo]);
}
