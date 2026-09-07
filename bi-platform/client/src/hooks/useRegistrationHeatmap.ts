import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HeatCell = { weekday: number; hour: number; registrations: number };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function useRegistrationHeatmap() {
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("customer_registration_heatmap")
        .select("weekday, hour, registrations");
      if (!alive) return;
      setCells((data ?? []) as HeatCell[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  cells.forEach((c) => {
    if (c.weekday >= 0 && c.weekday < 7 && c.hour >= 0 && c.hour < 24) {
      grid[c.weekday][c.hour] = c.registrations;
    }
  });

  // Hora 0 concentra registros importados sem horário — tratada à parte.
  const byHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, "0")}h`,
    registrations: grid.reduce((s, row) => s + row[h], 0),
  }));

  const byWeekday = WEEKDAYS.map((label, w) => ({
    label,
    weekday: w,
    registrations: grid[w].reduce((s, v) => s + v, 0),
  }));

  const timed = grid.map((row) => row.map((v, h) => (h === 0 ? 0 : v)));
  const maxTimed = Math.max(1, ...timed.flat());
  const totalTimed = timed.flat().reduce((s, v) => s + v, 0);
  const total = grid.flat().reduce((s, v) => s + v, 0);

  let peak = { weekday: 0, hour: 0, registrations: 0 };
  timed.forEach((row, w) =>
    row.forEach((v, h) => {
      if (v > peak.registrations) peak = { weekday: w, hour: h, registrations: v };
    }),
  );

  const bestHour = byHour.filter((h) => h.hour !== 0).reduce(
    (a, b) => (b.registrations > a.registrations ? b : a),
    { hour: 1, label: "01h", registrations: 0 },
  );
  const bestDay = byWeekday.reduce((a, b) => (b.registrations > a.registrations ? b : a));

  return {
    loading,
    grid,
    timed,
    maxTimed,
    total,
    totalTimed,
    byHour,
    byWeekday,
    peak,
    bestHour,
    bestDay,
    weekdayLabels: WEEKDAYS,
    hasData: cells.length > 0,
  };
}
