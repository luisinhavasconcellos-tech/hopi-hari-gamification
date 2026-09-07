import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GoalRow {
  year: number;
  month: number;
  goal_revenue: number;
  realized_revenue: number;
}

export interface YearSummary {
  year: number;
  goal: number;
  realized: number;
  attainment: number;
  growth: number | null;
}

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function useDistributorGoals() {
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("distributor_goal_monthly")
        .select("year, month, goal_revenue, realized_revenue")
        .order("year")
        .order("month");
      if (!active) return;
      setRows(
        (data ?? []).map((r) => ({
          year: Number(r.year),
          month: Number(r.month),
          goal_revenue: Number(r.goal_revenue ?? 0),
          realized_revenue: Number(r.realized_revenue ?? 0),
        })),
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => {
    const years = Array.from(new Set(rows.map((r) => r.year))).sort();
    const currentYear = years.length ? years[years.length - 1] : new Date().getFullYear();
    const previousYear = currentYear - 1;

    const byYear = new Map<number, GoalRow[]>();
    rows.forEach((r) => {
      const list = byYear.get(r.year) ?? [];
      list.push(r);
      byYear.set(r.year, list);
    });

    const yearSummaries: YearSummary[] = years.map((year, idx) => {
      const list = byYear.get(year) ?? [];
      const goal = list.reduce((s, r) => s + r.goal_revenue, 0);
      const realized = list.reduce((s, r) => s + r.realized_revenue, 0);
      const prev = idx > 0 ? (byYear.get(years[idx - 1]) ?? []) : [];
      const prevRealized = prev.reduce((s, r) => s + r.realized_revenue, 0);
      return {
        year,
        goal,
        realized,
        attainment: goal > 0 ? (realized / goal) * 100 : 0,
        growth: prevRealized > 0 ? ((realized - prevRealized) / prevRealized) * 100 : null,
      };
    });

    const get = (year: number, month: number) =>
      rows.find((r) => r.year === year && r.month === month);

    const monthly = MONTHS_SHORT.map((label, i) => {
      const month = i + 1;
      const cur = get(currentYear, month);
      const prev = get(previousYear, month);
      const realized = cur?.realized_revenue ?? 0;
      const goal = cur?.goal_revenue ?? 0;
      return {
        month,
        label,
        meta: goal,
        realizado: realized,
        anterior: prev?.realized_revenue ?? 0,
        atingimento: goal > 0 ? (realized / goal) * 100 : 0,
        gap: realized - goal,
        yoy:
          prev && prev.realized_revenue > 0
            ? ((realized - prev.realized_revenue) / prev.realized_revenue) * 100
            : null,
      };
    });

    const realizedMonths = monthly.filter((m) => m.realizado > 0);
    const lastMonth = realizedMonths.length ? realizedMonths[realizedMonths.length - 1].month : 0;

    const ytdRealized = monthly.slice(0, lastMonth).reduce((s, m) => s + m.realizado, 0);
    const ytdGoal = monthly.slice(0, lastMonth).reduce((s, m) => s + m.meta, 0);
    const ytdPrevious = monthly.slice(0, lastMonth).reduce((s, m) => s + m.anterior, 0);
    const yearGoal = monthly.reduce((s, m) => s + m.meta, 0);

    const currentSummary = yearSummaries.find((y) => y.year === currentYear);
    const previousSummary = yearSummaries.find((y) => y.year === previousYear);

    const semesters = years.map((year) => {
      const list = byYear.get(year) ?? [];
      const s1 = list.filter((r) => r.month <= 6).reduce((s, r) => s + r.realized_revenue, 0);
      const s2 = list.filter((r) => r.month > 6).reduce((s, r) => s + r.realized_revenue, 0);
      return { year: String(year), primeiro: s1, segundo: s2 };
    });

    return {
      loading,
      hasData: rows.length > 0,
      currentYear,
      previousYear,
      monthly,
      yearSummaries,
      semesters,
      lastMonth,
      ytdRealized,
      ytdGoal,
      ytdPrevious,
      yearGoal,
      ytdAttainment: ytdGoal > 0 ? (ytdRealized / ytdGoal) * 100 : 0,
      ytdGrowth: ytdPrevious > 0 ? ((ytdRealized - ytdPrevious) / ytdPrevious) * 100 : null,
      yearAttainment: yearGoal > 0 ? (ytdRealized / yearGoal) * 100 : 0,
      currentSummary,
      previousSummary,
    };
  }, [rows, loading]);
}
