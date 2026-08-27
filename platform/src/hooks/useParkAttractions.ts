import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AttractionRow = {
  attraction: string;
  area: string;
  year: number;
  month: number;
  rides: number;
  penetration_pct: number;
};

export type ParkPublicRow = { year: number; month: number; visitors: number };

export const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export type ParkOptions = {
  /** Ano de referência (padrão: mais recente disponível). */
  year?: number | null;
  /** Meses (1-12) considerados. Vazio/nulo = todos. */
  months?: number[] | null;
  /** Intervalo de atualização automática em ms (0 desliga). */
  refreshMs?: number;
  /** Tempo de validade do cache em ms. */
  cacheMs?: number;
};

type ParkCache = {
  rows: AttractionRow[];
  publicRows: ParkPublicRow[];
  fetchedAt: number;
};

let parkCache: ParkCache | null = null;
let inflight: Promise<ParkCache> | null = null;

async function fetchPark(): Promise<ParkCache> {
  const [a, p] = await Promise.all([
    supabase
      .from("park_attraction_monthly")
      .select("attraction, area, year, month, rides, penetration_pct")
      .order("year")
      .order("month"),
    supabase.from("park_public_monthly").select("year, month, visitors").order("month"),
  ]);
  return {
    rows: (a.data ?? []) as AttractionRow[],
    publicRows: (p.data ?? []) as ParkPublicRow[],
    fetchedAt: Date.now(),
  };
}

export function useParkAttractions(options: ParkOptions = {}) {
  const { year = null, months = null, refreshMs = 5 * 60_000, cacheMs = 5 * 60_000 } = options;

  const [rows, setRows] = useState<AttractionRow[]>(parkCache?.rows ?? []);
  const [publicRows, setPublicRows] = useState<ParkPublicRow[]>(parkCache?.publicRows ?? []);
  const [loading, setLoading] = useState(!parkCache);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    parkCache ? new Date(parkCache.fetchedAt) : null,
  );
  const alive = useRef(true);

  const load = useCallback(
    async (force = false) => {
      if (!force && parkCache && Date.now() - parkCache.fetchedAt < cacheMs) {
        setRows(parkCache.rows);
        setPublicRows(parkCache.publicRows);
        setLastUpdated(new Date(parkCache.fetchedAt));
        setLoading(false);
        return;
      }
      if (parkCache) setRefreshing(true);
      else setLoading(true);
      try {
        if (!inflight || force) inflight = fetchPark();
        const data = await inflight;
        parkCache = data;
        if (!alive.current) return;
        setRows(data.rows);
        setPublicRows(data.publicRows);
        setLastUpdated(new Date(data.fetchedAt));
      } finally {
        inflight = null;
        if (alive.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [cacheMs],
  );

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!refreshMs) return;
    const id = window.setInterval(() => void load(true), refreshMs);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, refreshMs]);

  const monthFilter = months && months.length ? months.join(",") : "";

  return useMemo(() => {
    const monthSet = monthFilter ? new Set(monthFilter.split(",").map(Number)) : null;
    const scoped = monthSet ? rows.filter((r) => monthSet.has(r.month)) : rows;
    const scopedPublic = monthSet ? publicRows.filter((r) => monthSet.has(r.month)) : publicRows;

    const years = [...new Set(rows.map((r) => r.year))].sort();
    const current = (year && years.includes(year) ? year : years.at(-1)) ?? new Date().getFullYear();
    const idx = years.indexOf(current);
    const previous = idx > 0 ? years[idx - 1] : current - 1;

    const sum = (list: AttractionRow[]) => list.reduce((s, r) => s + r.rides, 0);
    const cur = scoped.filter((r) => r.year === current);
    const prev = scoped.filter((r) => r.year === previous);
    // meses comparáveis: só onde o ano atual tem dados
    const curMonths = new Set(cur.map((r) => r.month));
    const prevComparable = prev.filter((r) => curMonths.has(r.month));


    const byAttraction = [...new Set(scoped.map((r) => r.attraction))]
      .map((name) => {
        const c = cur.filter((r) => r.attraction === name);
        const p = prevComparable.filter((r) => r.attraction === name);
        const currentRides = sum(c);
        const previousRides = sum(p);
        const pen = c.length ? c.reduce((s, r) => s + Number(r.penetration_pct), 0) / c.length : 0;
        return {
          attraction: name,
          area: (c[0] ?? p[0] ?? scoped.find((r) => r.attraction === name))!.area,
          currentRides,
          previousRides,
          growth: previousRides ? ((currentRides - previousRides) / previousRides) * 100 : null,
          penetration: pen,
        };
      })
      .sort((a, b) => b.currentRides - a.currentRides);

    const byArea = [...new Set(scoped.map((r) => r.area))]
      .map((area) => ({
        area,
        currentRides: sum(cur.filter((r) => r.area === area)),
        previousRides: sum(prevComparable.filter((r) => r.area === area)),
      }))
      .sort((a, b) => b.currentRides - a.currentRides);

    const byMonth = MONTH_LABELS.map((label, i) => {
      const m = i + 1;
      return {
        month: label,
        monthNumber: m,
        atual: sum(cur.filter((r) => r.month === m)),
        anterior: sum(prev.filter((r) => r.month === m)),
        publicoAtual: scopedPublic.find((r) => r.year === current && r.month === m)?.visitors ?? 0,
        publicoAnterior: scopedPublic.find((r) => r.year === previous && r.month === m)?.visitors ?? 0,
      };
    })
      .filter((r) => (monthSet ? monthSet.has(r.monthNumber) : true))
      .filter((r) => r.atual > 0 || r.anterior > 0);

    const totalCurrent = sum(cur);
    const totalPrevious = sum(prevComparable);

    const publicCurrent = scopedPublic
      .filter((r) => r.year === current)
      .reduce((s, r) => s + r.visitors, 0);

    return {
      loading,
      refreshing,
      lastUpdated,
      refresh: () => load(true),
      rows: scoped,
      years,
      currentYear: current,
      previousYear: previous,
      byAttraction,
      byArea,
      byMonth,
      totalCurrent,
      totalPrevious,
      growth: totalPrevious ? ((totalCurrent - totalPrevious) / totalPrevious) * 100 : null,
      publicCurrent,
      ridesPerVisitor: publicCurrent ? totalCurrent / publicCurrent : 0,
      hasData: scoped.length > 0,
    };
  }, [rows, publicRows, loading, refreshing, lastUpdated, load, year, monthFilter]);
}

