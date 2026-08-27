import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/mock-data";
import { useDailyTicket } from "@/hooks/useDailyTicket";

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

function pearson(pairs: { x: number; y: number }[]) {
  const n = pairs.length;
  if (n < 3) return null;
  const mx = pairs.reduce((s, p) => s + p.x, 0) / n;
  const my = pairs.reduce((s, p) => s + p.y, 0) / n;
  let num = 0,
    dx = 0,
    dy = 0;
  for (const p of pairs) {
    num += (p.x - mx) * (p.y - my);
    dx += (p.x - mx) ** 2;
    dy += (p.y - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
}

const strength = (r: number) => {
  const a = Math.abs(r);
  if (a >= 0.8) return "muito forte";
  if (a >= 0.6) return "forte";
  if (a >= 0.4) return "moderada";
  if (a >= 0.2) return "fraca";
  return "quase nula";
};

/** Compara receita total e público no período previsto (ex.: 24/08 a 07/09). */
export default function PeriodCorrelationPanel({ start, end }: { start?: string; end?: string }) {
  const { loading, series } = useDailyTicket("total", 400);

  const window = useMemo(
    () => series.filter((r) => (!start || r.date >= start) && (!end || r.date <= end)),
    [series, start, end],
  );

  const stats = useMemo(() => {
    const both = window.filter((r) => r.visitors > 0 && r.revenue > 0);
    const histBoth = series.filter((r) => r.visitors > 0 && r.revenue > 0);
    const usedHistory = both.length < 3;
    const base = usedHistory ? histBoth.slice(-90) : both;
    const r = pearson(base.map((p) => ({ x: p.visitors, y: p.revenue })));
    const rev = both.reduce((s, d) => s + d.revenue, 0);
    const vis = both.reduce((s, d) => s + d.visitors, 0);
    return {
      r,
      usedHistory,
      pairs: base.length,
      periodRevenue: window.reduce((s, d) => s + d.revenue, 0),
      periodVisitors: window.reduce((s, d) => s + d.visitors, 0),
      overlapDays: both.length,
      ticket: vis ? rev / vis : null,
    };
  }, [window, series]);

  const range = window.length ? `${window[0].label} a ${window[window.length - 1].label}` : "—";

  return (
    <Card>
      <CardTitle
        title={`Receita x Público no período (${range})`}
        hint="Barras: receita do dia · Linha: público (realizado ou previsto) · Dispersão: cada dia como um ponto"
      />

      {loading ? (
        <ChartSkeleton />
      ) : !window.length ? (
        <EmptyState title="Sem dados no período" description="Importe receita diária e previsão de público." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Box label="Receita já lançada no período" value={brl(stats.periodRevenue)} sub="Dias com faturamento importado" />
            <Box label="Público do período" value={formatNumber(stats.periodVisitors)} sub="Realizado + previsto" />
            <Box
              label="Receita por visitante"
              value={stats.ticket ? brl(stats.ticket) : "—"}
              sub={`${stats.overlapDays} dia(s) com receita e público`}
            />
            <Box
              label="Correlação (r de Pearson)"
              value={stats.r === null ? "—" : stats.r.toFixed(2)}
              sub={
                stats.r === null
                  ? `Poucos dias com os dois dados`
                  : `${strength(stats.r)} · ${stats.pairs} dias${stats.usedHistory ? " (base histórica)" : ""}`
              }
              tone={stats.r === null ? undefined : stats.r >= 0.4 ? "success" : stats.r <= -0.4 ? "destructive" : undefined}
            />
          </div>


          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={window}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                yAxisId="r"
                orientation="right"
                tickFormatter={compact}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                {...tooltipStyle}
                separator=": "
                formatter={(v: number, name: string) => (name === "Receita" ? brl(v) : formatNumber(v))}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" name="Receita" dataKey="revenue" fill="hsl(var(--chart-1))" radius={[5, 5, 0, 0]} />
              <Line
                yAxisId="r"
                name="Público"
                type="monotone"
                dataKey="visitors"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-5">
            <p className="text-xs text-muted-foreground mb-2">
              Dispersão receita x público — quanto mais alinhados os pontos, mais a receita acompanha o público
              {stats.usedHistory ? " (base histórica: o período previsto ainda não tem faturamento lançado)" : ""}.
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  dataKey="visitors"
                  name="Público"
                  tickFormatter={compact}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  type="number"
                  dataKey="revenue"
                  name="Receita"
                  tickFormatter={compact}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <ZAxis range={[70, 70]} />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v: number, name: string) => (name === "Receita" ? brl(v) : formatNumber(v))}
                  labelFormatter={() => ""}
                />
                <Scatter
                  name="Dia"
                  data={
                    stats.usedHistory
                      ? series.filter((r) => r.visitors > 0 && r.revenue > 0).slice(-90)
                      : window.filter((r) => r.visitors > 0 && r.revenue > 0)
                  }
                  fill="hsl(var(--chart-2))"
                />

              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Receita = in-park (A&amp;B, mercadorias, jogos) + vendas do site. Público usa o realizado quando existe e a
            previsão nos dias futuros.
          </p>
        </>
      )}
    </Card>
  );
}

function Box({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "success" | "destructive" }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
