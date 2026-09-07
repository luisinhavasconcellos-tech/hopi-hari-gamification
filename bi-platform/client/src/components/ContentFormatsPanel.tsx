import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  platform: string;
  metric: string;
  format_label: string;
  value: number;
  period_start: string;
  period_end: string;
};

const METRICS: Array<{ key: string; label: string }> = [
  { key: "interacoes", label: "Interações" },
  { key: "visualizacoes", label: "Visualizações" },
  { key: "publicados", label: "Conteúdo publicado" },
];

const COLORS = ["#0064B4", "#FF6400", "#78C800", "#FFD200", "#4DA3E0", "#FF9A4D"];

const fmt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

export default function ContentFormatsPanel({ platform = "instagram" }: { platform?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [metric, setMetric] = useState("interacoes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("social_content_formats")
        .select("platform, metric, format_label, value, period_start, period_end")
        .eq("platform", platform)
        .order("value", { ascending: false });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [platform]);

  if (loading) return null;
  if (!rows.length) return null;

  const available = METRICS.filter((m) => rows.some((r) => r.metric === m.key));
  const active = available.some((m) => m.key === metric) ? metric : available[0]?.key;
  const data = rows.filter((r) => r.metric === active);
  const total = data.reduce((s, r) => s + Number(r.value), 0);
  const period = data[0];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold">
            Formatos de conteúdo · {platform === "facebook" ? "Facebook" : "Instagram"}
          </h3>

          <p className="text-xs text-muted-foreground mt-1">
            Social listening · {period ? `${period.period_start} a ${period.period_end}` : ""} · fonte Meta Business Suite
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {available.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                active === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={fmt} />
            <YAxis
              type="category"
              dataKey="format_label"
              width={110}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              formatter={(v: number) => [`${fmt(v)} (${total ? ((v / total) * 100).toFixed(1) : 0}%)`, "Total"]}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {data.slice(0, 6).map((r, i) => (
          <div key={r.format_label} className="rounded-lg border border-border/60 px-3 py-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {r.format_label}
            </span>
            <p className="font-semibold text-foreground mt-1">
              {fmt(Number(r.value))}
              <span className="text-muted-foreground font-normal ml-1">
                {total ? `· ${((Number(r.value) / total) * 100).toFixed(1)}%` : ""}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
