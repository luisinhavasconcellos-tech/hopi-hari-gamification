import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";

export const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Canais que vendem ingresso (excluem A&B, mercadorias, serviços e jogos). */
export const TICKET_CHANNELS = [
  "E-COMMERCE",
  "BILHETERIA",
  "TLMKT",
  "ESCOLA",
  "ESCOLA PUBLICA",
  "ESCOLA PARTICULAR",
  "TURISMO",
  "EVENTOS",
  "CONSIGNAÇÃO",
  "HOPI NIVER",
  "AGVT",
  "EMPRESA",
  "PARCEIROS",
  "DIVULGAÇÃO",
];

export type PublicMonth = { year: number; month: number; visitors: number; open_days: number | null };
export type ForecastDay = { date: string; visitors: number };
export type RevenueMonth = { channel: string; year: number; month: number; quantity: number; revenue: number };

export type MonthPoint = { month: number; label: string } & Record<string, number | string>;

export function useAttendance() {
  const [loading, setLoading] = useState(true);
  const [publicMonthly, setPublicMonthly] = useState<PublicMonth[]>([]);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [ticketSales, setTicketSales] = useState<RevenueMonth[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [pm, fc, sr] = await Promise.all([
        fetchAllRows<PublicMonth>((from, to) =>
          supabase
            .from("park_public_monthly")
            .select("year, month, visitors, open_days")
            .order("year")
            .order("month")
            .order("id")
            .range(from, to),
        ),
        fetchAllRows<ForecastDay>((from, to) =>
          supabase.from("park_visitors_forecast").select("date, visitors").order("date").order("id").range(from, to),
        ),
        fetchAllRows<RevenueMonth>((from, to) =>
          supabase
            .from("sales_revenue_monthly")
            .select("channel, year, month, quantity, revenue")
            .in("channel", TICKET_CHANNELS)
            .order("year")
            .order("month")
            .order("id")
            .range(from, to),
        ),
      ]);
      if (!alive) return;
      setPublicMonthly(
        pm.rows.map((r) => ({ ...r, visitors: Number(r.visitors), open_days: r.open_days })),
      );
      setForecast(fc.rows.map((r) => ({ ...r, visitors: Number(r.visitors) })));
      setTicketSales(
        sr.rows.map((r) => ({
          ...r,
          quantity: Number(r.quantity),
          revenue: Number(r.revenue),
        })),
      );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const data = useMemo(() => {
    const years = Array.from(new Set(publicMonthly.map((r) => r.year))).sort((a, b) => a - b);
    const lastYear = years[years.length - 1] ?? new Date().getFullYear();
    const recentYears = years.filter((y) => y >= lastYear - 4);

    /** Público mensal por ano (últimos 5 anos) para o comparativo. */
    const monthlyByYear: MonthPoint[] = MONTHS_PT.map((label, i) => {
      const point: MonthPoint = { month: i + 1, label };
      recentYears.forEach((y) => {
        const row = publicMonthly.find((r) => r.year === y && r.month === i + 1);
        if (row) point[`y${y}`] = row.visitors;
      });
      return point;
    });

    /** Acumulado do ano até o último mês com dado em cada ano. */
    const cumulativeByYear: MonthPoint[] = (() => {
      const acc: Record<number, number> = {};
      return MONTHS_PT.map((label, i) => {
        const point: MonthPoint = { month: i + 1, label };
        recentYears.forEach((y) => {
          const row = publicMonthly.find((r) => r.year === y && r.month === i + 1);
          if (row) {
            acc[y] = (acc[y] ?? 0) + row.visitors;
            point[`y${y}`] = acc[y];
          }
        });
        return point;
      });
    })();

    /** Totais anuais + variação YoY. */
    const yearTotals = years.map((y) => {
      const rows = publicMonthly.filter((r) => r.year === y);
      const visitors = rows.reduce((a, r) => a + r.visitors, 0);
      const openDays = rows.reduce((a, r) => a + (r.open_days ?? 0), 0);
      return {
        year: y,
        visitors,
        months: rows.length,
        openDays,
        perOpenDay: openDays ? Math.round(visitors / openDays) : null,
      };
    });

    /** Previsão agregada. */
    let acc = 0;
    const forecastDaily = forecast.map((r) => {
      const d = new Date(`${r.date}T12:00:00`);
      acc += r.visitors;
      return {
        date: r.date,
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        weekday: d.getDay(),
        visitors: r.visitors,
        accumulated: acc,
      };
    });
    const forecastTotal = acc;
    const forecastDays = forecastDaily.length;
    const forecastAvg = forecastDays ? Math.round(forecastTotal / forecastDays) : 0;

    /**
     * Comparativo do período previsto com anos anteriores: como o histórico é
     * mensal, o mesmo intervalo de dias é estimado pela média por dia de operação
     * de cada mês, ponderada pelos dias previstos em cada mês.
     */
    const forecastMonths = Array.from(new Set(forecastDaily.map((d) => `${d.year}-${d.month}`))).map((k) => {
      const [y, m] = k.split("-").map(Number);
      const days = forecastDaily.filter((d) => d.year === y && d.month === m);
      return {
        year: y,
        month: m,
        label: `${MONTHS_PT[m - 1]}/${y}`,
        days: days.length,
        visitors: days.reduce((a, d) => a + d.visitors, 0),
      };
    });

    const comparisonYears = recentYears.filter((y) => y < (forecastMonths[0]?.year ?? lastYear + 1)).slice(-3);
    const periodComparison = comparisonYears
      .map((y) => {
        let estimated = 0;
        let hasData = false;
        forecastMonths.forEach((fm) => {
          const row = publicMonthly.find((r) => r.year === y && r.month === fm.month);
          if (!row) return;
          hasData = true;
          const perDay = row.open_days ? row.visitors / row.open_days : row.visitors / 30;
          estimated += perDay * fm.days;
        });
        return { year: y, estimated: Math.round(estimated), hasData };
      })
      .filter((r) => r.hasData);

    const lastComparable = periodComparison[periodComparison.length - 1] ?? null;
    const forecastVsLastYearPct =
      lastComparable && lastComparable.estimated > 0
        ? ((forecastTotal - lastComparable.estimated) / lastComparable.estimated) * 100
        : null;

    /** Preço médio do ingresso por mês (receita/quantidade dos canais de ingresso). */
    const priceKeys = Array.from(new Set(ticketSales.map((r) => `${r.year}-${r.month}`)));
    const priceMonthly = priceKeys
      .map((k) => {
        const [y, m] = k.split("-").map(Number);
        const rows = ticketSales.filter((r) => r.year === y && r.month === m);
        const quantity = rows.reduce((a, r) => a + r.quantity, 0);
        const revenue = rows.reduce((a, r) => a + r.revenue, 0);
        const pub = publicMonthly.find((r) => r.year === y && r.month === m);
        return {
          key: k,
          year: y,
          month: m,
          label: `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`,
          quantity,
          revenue,
          avgPrice: quantity ? revenue / quantity : 0,
          visitors: pub?.visitors ?? null,
          revenuePerVisitor: pub?.visitors ? revenue / pub.visitors : null,
        };
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);

    /** Preço médio por canal no último ano com vendas. */
    const priceYear = Math.max(...ticketSales.map((r) => r.year), 0);
    const priceByChannel = TICKET_CHANNELS.map((ch) => {
      const rows = ticketSales.filter((r) => r.channel === ch && r.year === priceYear);
      const quantity = rows.reduce((a, r) => a + r.quantity, 0);
      const revenue = rows.reduce((a, r) => a + r.revenue, 0);
      return { channel: ch, quantity, revenue, avgPrice: quantity ? revenue / quantity : 0 };
    })
      .filter((r) => r.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);

    const priceCurrent = priceMonthly[priceMonthly.length - 1] ?? null;
    const priceSameMonthLastYear = priceCurrent
      ? priceMonthly.find((r) => r.year === priceCurrent.year - 1 && r.month === priceCurrent.month) ?? null
      : null;
    const priceYoYPct =
      priceCurrent && priceSameMonthLastYear && priceSameMonthLastYear.avgPrice > 0
        ? ((priceCurrent.avgPrice - priceSameMonthLastYear.avgPrice) / priceSameMonthLastYear.avgPrice) * 100
        : null;

    /** Comparativo mês a mês do ano corrente vs ano anterior. */
    const currentYear = lastYear;
    const monthVsPrevYear = MONTHS_PT.map((label, i) => {
      const cur = publicMonthly.find((r) => r.year === currentYear && r.month === i + 1);
      const prev = publicMonthly.find((r) => r.year === currentYear - 1 && r.month === i + 1);
      return {
        label,
        month: i + 1,
        current: cur?.visitors ?? null,
        previous: prev?.visitors ?? null,
        deltaPct:
          cur && prev && prev.visitors > 0 ? ((cur.visitors - prev.visitors) / prev.visitors) * 100 : null,
      };
    }).filter((r) => r.current !== null || r.previous !== null);

    return {
      years,
      recentYears,
      currentYear,
      monthlyByYear,
      cumulativeByYear,
      yearTotals,
      forecastDaily,
      forecastTotal,
      forecastDays,
      forecastAvg,
      forecastMonths,
      periodComparison,
      forecastVsLastYearPct,
      priceMonthly,
      priceByChannel,
      priceYear,
      priceCurrent,
      priceYoYPct,
      monthVsPrevYear,
    };
  }, [publicMonthly, forecast, ticketSales]);

  return { loading, ...data };
}
