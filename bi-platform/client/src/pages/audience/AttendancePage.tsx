import { CalendarDays, DollarSign, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardTitle, ChartSkeleton, EmptyState, Kpi, PageHeader } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import DailyTicketPanel from "@/components/audience/DailyTicketPanel";
import PeriodCorrelationPanel from "@/components/audience/PeriodCorrelationPanel";
import { formatNumber } from "@/lib/format";
import { useAttendance } from "@/hooks/useAttendance";

const SERIES_COLORS = ["hsl(var(--chart-5))", "hsl(var(--chart-4))", "hsl(var(--chart-3))", "hsl(var(--chart-2))", "hsl(var(--chart-1))"];

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);

export default function AttendancePage() {
  const a = useAttendance();

  const forecastRange = a.forecastDaily.length
    ? `${a.forecastDaily[0].label} a ${a.forecastDaily[a.forecastDaily.length - 1].label}`
    : "—";

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Operação"
        title="Visitantes vs Público Esperado"
        subtitle="Público esperado (ingressos já emitidos) comparado ao público realizado em anos anteriores e ao preço médio do ingresso."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Público esperado"
          value={formatNumber(a.forecastTotal)}
          deltaLabel={`${a.forecastDays} dias — ${forecastRange}`}
          icon={<Users className="size-4 text-primary" />}
        />
        <Kpi
          label="Média por dia prevista"
          value={formatNumber(a.forecastAvg)}
          deltaLabel="Ingressos já emitidos"
          icon={<CalendarDays className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Emitidos vs realizado do ano passado"
          value={pct(a.forecastVsLastYearPct)}
          deltaLabel={
            a.periodComparison.length
              ? `Base ${a.periodComparison[a.periodComparison.length - 1].year}: ${formatNumber(
                  a.periodComparison[a.periodComparison.length - 1].estimated,
                )}`
              : "Sem base histórica"
          }
          icon={<TrendingUp className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label="Preço médio do ingresso"
          value={a.priceCurrent ? brl(a.priceCurrent.avgPrice) : "—"}
          deltaLabel={a.priceCurrent ? `${a.priceCurrent.label} · YoY ${pct(a.priceYoYPct)}` : undefined}
          icon={<DollarSign className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1">
        <DailyTicketPanel />
      </Section>

      <Section cols="grid-cols-1">
        <PeriodCorrelationPanel
          start={a.forecastDaily[0]?.date}
          end={a.forecastDaily[a.forecastDaily.length - 1]?.date}
        />
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Público esperado dia a dia" hint="Barras: público do dia · Linha: acumulado" />
          {a.loading ? (
            <ChartSkeleton />
          ) : !a.forecastDaily.length ? (
            <EmptyState title="Sem previsão carregada" description="Importe o relatório de público esperado." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={a.forecastDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="r" orientation="right" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => formatNumber(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="l" name="Público esperado" dataKey="visitors" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Line yAxisId="r" name="Acumulado" type="monotone" dataKey="accumulated" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1 xl:grid-cols-2 items-start">
        <Card>
          <CardTitle title="Período previsto vs anos anteriores" hint="Histórico = público realizado estimado pela média/dia do mesmo mês. O previsto conta só ingressos já emitidos e ainda cresce até a data." />
          {a.loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[
                  ...a.periodComparison.map((r) => ({ label: String(r.year), visitors: r.estimated })),
                  { label: "Previsto", visitors: a.forecastTotal },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Público"]} />
                <Bar dataKey="visitors" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title="Meses do período previsto" hint="Quantos dias e quanto público em cada mês" />
          <DataTable
            rows={a.forecastMonths}
            rowKey={(r) => `${r.year}-${r.month}`}
            columns={[
              { key: "m", header: "Mês", render: (r) => r.label },
              { key: "d", header: "Dias", align: "right", render: (r) => String(r.days) },
              { key: "v", header: "Público esperado", align: "right", render: (r) => formatNumber(r.visitors) },
              {
                key: "avg",
                header: "Média/dia",
                align: "right",
                render: (r) => formatNumber(Math.round(r.visitors / (r.days || 1))),
              },
            ]}
          />
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Público mensal por ano" hint="Comparativo dos últimos anos de operação" />
          {a.loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={a.monthlyByYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => formatNumber(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {a.recentYears.map((y, i) => (
                  <Line
                    key={y}
                    name={String(y)}
                    type="monotone"
                    dataKey={`y${y}`}
                    stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                    strokeWidth={y === a.currentYear ? 3 : 2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1 xl:grid-cols-2 items-start">
        <Card>
          <CardTitle title="Acumulado do ano" hint="Curva acumulada por ano" />
          {a.loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={a.cumulativeByYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => formatNumber(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {a.recentYears.map((y, i) => (
                  <Line
                    key={y}
                    name={String(y)}
                    type="monotone"
                    dataKey={`y${y}`}
                    stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                    strokeWidth={y === a.currentYear ? 3 : 2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title={`Mês a mês ${a.currentYear} vs ${a.currentYear - 1}`} />
          <DataTable
            rows={a.monthVsPrevYear}
            rowKey={(r) => r.label}
            maxHeight="max-h-[300px]"
            columns={[
              { key: "m", header: "Mês", render: (r) => r.label },
              { key: "p", header: String(a.currentYear - 1), align: "right", render: (r) => (r.previous === null ? "—" : formatNumber(r.previous)) },
              { key: "c", header: String(a.currentYear), align: "right", render: (r) => (r.current === null ? "—" : formatNumber(r.current)) },
              {
                key: "d",
                header: "Var.",
                align: "right",
                render: (r) => (
                  <span className={r.deltaPct === null ? "" : r.deltaPct >= 0 ? "text-success" : "text-destructive"}>
                    {pct(r.deltaPct)}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Preço médio do ingresso vs público"
            hint="Receita de canais de ingresso ÷ ingressos vendidos, por mês"
          />
          {a.loading ? (
            <ChartSkeleton />
          ) : !a.priceMonthly.length ? (
            <EmptyState title="Sem vendas de ingresso" description="Importe a receita por canal." />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={a.priceMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="r" orientation="right" tickFormatter={(v: number) => `R$${Math.round(v)}`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  {...tooltipStyle}
                  separator=": "
                  formatter={(v: number, name: string) => (name.includes("Preço") ? brl(v) : formatNumber(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="l" name="Público do mês" dataKey="visitors" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Line yAxisId="r" name="Preço médio" type="monotone" dataKey="avgPrice" stroke="hsl(var(--chart-4))" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1 xl:grid-cols-2 items-start">
        <Card>
          <CardTitle title={`Preço médio por canal — ${a.priceYear}`} hint="Ingressos vendidos e ticket médio" />
          <DataTable
            rows={a.priceByChannel}
            rowKey={(r) => r.channel}
            maxHeight="max-h-[320px]"
            columns={[
              { key: "c", header: "Canal", render: (r) => r.channel },
              { key: "q", header: "Ingressos", align: "right", render: (r) => formatNumber(r.quantity) },
              { key: "p", header: "Preço médio", align: "right", render: (r) => brl(r.avgPrice) },
              { key: "r", header: "Receita", align: "right", render: (r) => `R$ ${compact(r.revenue)}` },
            ]}
          />
        </Card>

        <Card>
          <CardTitle title="Público por ano" hint="Total anual e média por dia de operação" />
          <DataTable
            rows={[...a.yearTotals].reverse().slice(0, 12)}
            rowKey={(r) => String(r.year)}
            maxHeight="max-h-[320px]"
            columns={[
              { key: "y", header: "Ano", render: (r) => String(r.year) },
              { key: "v", header: "Público", align: "right", render: (r) => formatNumber(r.visitors) },
              { key: "d", header: "Dias abertos", align: "right", render: (r) => (r.openDays ? formatNumber(r.openDays) : "—") },
              { key: "pd", header: "Média/dia", align: "right", render: (r) => (r.perOpenDay ? formatNumber(r.perOpenDay) : "—") },
            ]}
          />
        </Card>
      </Section>
    </div>
  );
}
