import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GOAL = 4_000_000;

const PLATFORMS = ["instagram", "facebook", "tiktok", "youtube", "linkedin"];

const fmt = (n: number) => n.toLocaleString("pt-BR");
const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export default function GoalProgressChart() {
  const [rows, setRows] = useState<Array<{ platform: string; date: string; followers: number | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("daily_metrics")
        .select("platform,date,followers")
        .gt("followers", 0)
        .order("date", { ascending: true });
      setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const series = useMemo(() => {
    const dates = Array.from(new Set(rows.map((r) => r.date))).sort();
    const last: Record<string, number> = {};
    const byDate = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const d = byDate.get(r.date) ?? {};
      if (r.followers) d[r.platform] = r.followers;
      byDate.set(r.date, d);
    }
    const out: Array<{ date: string; total: number; goal: number }> = [];
    for (const date of dates) {
      const d = byDate.get(date) ?? {};
      for (const p of PLATFORMS) if (d[p]) last[p] = d[p];
      const total = PLATFORMS.reduce((s, p) => s + (last[p] ?? 0), 0);
      if (total > 0) out.push({ date, total, goal: GOAL });
    }
    return out.slice(-120);
  }, [rows]);

  const current = series.at(-1)?.total ?? 0;
  const pct = (current / GOAL) * 100;

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="text-sm font-semibold text-foreground">Hopi Hari vs meta de 4 milhões</h2>
        <span className="text-xs text-muted-foreground">
          {fmt(current)} seguidores · {pct.toFixed(1)}% da meta · faltam {fmt(Math.max(0, GOAL - current))}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Base agregada de todas as redes sociais</p>

      {loading ? (
        <div className="h-[260px] animate-pulse rounded-xl bg-muted/40" />
      ) : series.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
          Sem dados de seguidores ainda.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={series} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              interval="preserveStartEnd"
              minTickGap={28}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tickFormatter={fmtShort}
              domain={[(min: number) => Math.min(min * 0.98, GOAL * 0.9), GOAL * 1.02]}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(v) => fmtDate(String(v))}
              formatter={(v: number, name) => [fmt(v), name === "total" ? "Hopi Hari" : "Meta"]}
            />
            <Legend
              formatter={(v) => (v === "total" ? "Hopi Hari (todas as redes)" : `Meta ${GOAL / 1_000_000}M`)}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="goal"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
            />
            <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
