import { Users, CalendarDays, TrendingUp, Gauge } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Kpi, Card, CardTitle, EmptyState, ChartSkeleton } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/format";
import { useCustomerRegistrations } from "@/hooks/useCustomerRegistrations";
import VisitorForecastPanel from "@/components/audience/VisitorForecastPanel";


export default function VisitorsPage() {
  const {
    loading,
    total,
    byMonth,
    byYear,
    peak,
    mediaDiaria,
    firstDate,
    lastDate,
    last30,
    delta30Pct,
    last365,
    deltaYoYPct,
    last90Days,
  } = useCustomerRegistrations();

  const fmtDate = (d: string | null) =>
    d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—";
  const fmtPct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);
  const series90 = last90Days.map((d) => ({
    label: new Date(`${d.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    registrations: d.registrations,
  }));

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Público"
        title="Cadastros de Clientes"
        subtitle={`Base real de cadastros do parque — ${fmtDate(firstDate)} a ${fmtDate(lastDate)}.`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Cadastros totais" value={formatNumber(total)} icon={<Users className="size-4 text-primary" />} />
        <Kpi label="Média diária" value={formatNumber(mediaDiaria)} icon={<Gauge className="size-4 text-accent" />} accent="accent" />
        <Kpi
          label={peak ? `Pico diário (${fmtDate(peak.date)})` : "Pico diário"}
          value={peak ? formatNumber(peak.registrations) : "—"}
          icon={<TrendingUp className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label="Meses com dados"
          value={String(byMonth.length)}
          icon={<CalendarDays className="size-4 text-muted-foreground" />}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Últimos 30 dias"
          value={formatNumber(last30)}
          icon={<TrendingUp className="size-4 text-primary" />}
        />
        <Kpi
          label="Variação vs 30 dias anteriores"
          value={fmtPct(delta30Pct)}
          icon={<TrendingUp className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Últimos 12 meses"
          value={formatNumber(last365)}
          icon={<CalendarDays className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label="Variação ano a ano"
          value={fmtPct(deltaYoYPct)}
          icon={<Gauge className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Últimos 90 dias" hint="Cadastros diários no fim da base" />
          {loading ? (
            <ChartSkeleton />
          ) : series90.length === 0 ? (
            <EmptyState title="Sem cadastros recentes" description="Importe a base de clientes atualizada." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series90}>
                <defs>
                  <linearGradient id="reg90Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={6} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Cadastros"]} />
                <Area type="monotone" dataKey="registrations" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#reg90Grad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>


      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Cadastros por mês" hint="Volume mensal de novos clientes" />
          {loading ? (
            <ChartSkeleton />
          ) : byMonth.length === 0 ? (
            <EmptyState title="Sem cadastros carregados" description="Importe a base de clientes para ver a série mensal." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={byMonth}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Cadastros"]} />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  fill="url(#regGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1 lg:grid-cols-2 items-start">
        <Card>
          <CardTitle title="Cadastros por ano" />
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Cadastros"]} />
                <Bar dataKey="registrations" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title="Detalhe mensal" hint="Últimos 12 meses da base" />
          <DataTable
            rows={byMonth.slice(-12)}
            rowKey={(r) => r.key}
            columns={[
              { key: "mes", header: "Mês", render: (r) => r.label },
              {
                key: "reg",
                header: "Cadastros",
                align: "right",
                render: (r) => formatNumber(r.registrations),
              },
              {
                key: "share",
                header: "% do total",
                align: "right",
                render: (r) => `${((r.registrations / (total || 1)) * 100).toFixed(1)}%`,
              },
            ]}
          />
        </Card>
      </Section>

      <div className="mt-8">
        <PageHeader
          eyebrow="Audience · Operação"
          title="Previsão de visitantes"
          subtitle="Ingressos já emitidos para os próximos dias de operação."
        />
        <VisitorForecastPanel />
      </div>
    </div>
  );
}

