import { useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/mock-data";
import { useDailyTicket, type RevenueSource } from "@/hooks/useDailyTicket";

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SOURCES: { key: RevenueSource; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "inpark", label: "In-park" },
  { key: "online", label: "Site" },
];

export default function DailyTicketPanel() {
  const [source, setSource] = useState<RevenueSource>("total");
  const { loading, series, stats } = useDailyTicket(source, 60);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle
          title="Faturamento x Visitantes — ticket médio por dia"
          hint="Barras: receita do dia · Linha clara: público (realizado ou previsto) · Linha destacada: receita por visitante · Tracejado: média móvel 7 dias"
        />
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              onClick={() => setSource(s.key)}
              className={`rounded-md px-3 py-1 text-xs transition-colors ${
                source === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Metric label="Ticket médio do período" value={stats.avgTicket === null ? "—" : brl(stats.avgTicket)} />
        <Metric label="Ticket médio (7 dias)" value={stats.last7 === null ? "—" : brl(stats.last7)} />
        <Metric
          label="Tendência vs 7 dias anteriores"
          value={stats.trendPct === null ? "—" : `${stats.trendPct > 0 ? "+" : ""}${stats.trendPct.toFixed(1)}%`}
          tone={stats.trendPct === null ? undefined : stats.trendPct >= 0 ? "success" : "destructive"}
        />
        <Metric
          label="Melhor dia"
          value={stats.best ? brl(stats.best.ticket ?? 0) : "—"}
          sub={stats.best ? `${stats.best.label} · ${formatNumber(stats.best.visitors)} visitantes` : undefined}
        />
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : !series.length ? (
        <EmptyState title="Sem dados diários" description="Importe receita diária e público por dia." />
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
            <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              yAxisId="r"
              orientation="right"
              tickFormatter={(v: number) => `R$${Math.round(v)}`}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              {...tooltipStyle}
              separator=": "
              formatter={(v: number, name: string) =>
                name.includes("Visitantes") ? formatNumber(v) : v ? brl(v) : "—"
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="l" name="Receita" dataKey="revenue" radius={[5, 5, 0, 0]}>
              {series.map((r) => (
                <Cell key={r.date} fill={r.isForecast ? "hsl(var(--muted-foreground))" : "hsl(var(--chart-1))"} />
              ))}
            </Bar>
            <Line
              yAxisId="l"
              name="Visitantes"
              type="monotone"
              dataKey="visitors"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="r"
              name="Ticket médio (R$/visitante)"
              type="monotone"
              dataKey="ticket"
              stroke="hsl(var(--chart-4))"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              yAxisId="r"
              name="Média móvel 7d"
              type="monotone"
              dataKey="ticketMa7"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Receita in-park (A&amp;B, mercadorias e jogos) + vendas do site. Dias sem público realizado usam a previsão de
        público (barras em cinza).
      </p>
    </Card>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "destructive";
}) {
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
