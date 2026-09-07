import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RegistrationDay = { date: string; registrations: number };

export type RegistrationAggregates = {
  loading: boolean;
  days: RegistrationDay[];
  total: number;
  firstDate: string | null;
  lastDate: string | null;
  byMonth: Array<{ key: string; label: string; registrations: number }>;
  byYear: Array<{ year: string; registrations: number }>;
  byWeekday: Array<{ dia: string; registrations: number; media: number }>;
  peak: RegistrationDay | null;
  mediaDiaria: number;
  last30: number;
  prev30: number;
  delta30Pct: number | null;
  last365: number;
  prev365: number;
  deltaYoYPct: number | null;
  last90Days: RegistrationDay[];
};


const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function useCustomerRegistrations(): RegistrationAggregates {
  const [days, setDays] = useState<RegistrationDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const all: RegistrationDay[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("customer_registrations_daily")
          .select("date, registrations")
          .order("date", { ascending: true })
          .range(from, from + 999);
        if (error || !data?.length) break;
        all.push(...(data as RegistrationDay[]));
        if (data.length < 1000) break;
      }
      if (!alive) return;
      setDays(all);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const total = days.reduce((s, d) => s + d.registrations, 0);

  const monthMap = new Map<string, number>();
  const yearMap = new Map<string, number>();
  const weekdaySum = new Array(7).fill(0);
  const weekdayCount = new Array(7).fill(0);

  days.forEach((d) => {
    const [y, m] = d.date.split("-");
    monthMap.set(`${y}-${m}`, (monthMap.get(`${y}-${m}`) ?? 0) + d.registrations);
    yearMap.set(y, (yearMap.get(y) ?? 0) + d.registrations);
    const wd = new Date(`${d.date}T12:00:00`).getDay();
    weekdaySum[wd] += d.registrations;
    weekdayCount[wd] += 1;
  });

  const byMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, registrations]) => {
      const [y, m] = key.split("-");
      return { key, label: `${MONTHS[Number(m) - 1]}/${y.slice(2)}`, registrations };
    });

  const byYear = Array.from(yearMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, registrations]) => ({ year, registrations }));

  const byWeekday = WEEKDAYS.map((dia, i) => ({
    dia,
    registrations: weekdaySum[i],
    media: weekdayCount[i] ? Math.round(weekdaySum[i] / weekdayCount[i]) : 0,
  }));

  const peak = days.length ? days.reduce((a, b) => (b.registrations > a.registrations ? b : a)) : null;

  // Janelas relativas à última data com dados (a base é histórica).
  const sum = (from: number, to: number) =>
    days.slice(Math.max(0, days.length - from), Math.max(0, days.length - to)).reduce((s, d) => s + d.registrations, 0);

  const last30 = sum(30, 0);
  const prev30 = sum(60, 30);
  const last365 = sum(365, 0);
  const prev365 = sum(730, 365);
  const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

  return {
    loading,
    days,
    total,
    firstDate: days[0]?.date ?? null,
    lastDate: days.at(-1)?.date ?? null,
    byMonth,
    byYear,
    byWeekday,
    peak,
    mediaDiaria: days.length ? Math.round(total / days.length) : 0,
    last30,
    prev30,
    delta30Pct: pct(last30, prev30),
    last365,
    prev365,
    deltaYoYPct: pct(last365, prev365),
    last90Days: days.slice(-90),
  };
}

