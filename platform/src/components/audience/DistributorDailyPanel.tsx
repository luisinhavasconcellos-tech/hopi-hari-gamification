import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardTitle, ChartSkeleton, EmptyState, Kpi } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/mock-data";
import { useDistributorDaily } from "@/hooks/useDistributorDaily";
import { CalendarDays, DollarSign, Package, Receipt } from "lucide-react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function DistributorDailyPanel() {
  const d = useDistributorDaily();

  if (d.loading) {
    return (
      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Vendas diárias de distribuidores" />
          <ChartSkeleton height={280} />
        </Card>
      </Section>
    );
  }

  if (!d.hasData) {
    return (
      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Vendas diárias de distribuidores" />
          <EmptyState title="Sem vendas diárias carregadas" />
        </Card>
      </Section>
    );
  }

  const monthLabel = MONTHS[d.month - 1];

  return (
    <>
      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title={`${monthLabel}: ${d.currentYear} x ${d.previousYear}`}
            hint="Faturamento diário dos distribuidores, incluindo consignado no total do mês"
          />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mt-2">
            <Kpi
              label={`Faturamento ${monthLabel}/${d.currentYear}`}
              value={brl(d.current.revenue)}
              delta={d.revenueGrowth ?? undefined}
              icon={<DollarSign className="size-4 text-success" />}
              accent="success"
            />
            <Kpi
              label={`Faturamento ${monthLabel}/${d.previousYear}`}
              value={brl(d.previous.revenue)}
              icon={<DollarSign className="size-4 text-muted-foreground" />}
            />
            <Kpi
              label="Ingressos no mês"
              value={formatNumber(d.current.quantity)}
              delta={d.quantityGrowth ?? undefined}
              icon={<Package className="size-4 text-primary" />}
            />
            <Kpi
              label="Ticket médio"
              value={brl(d.current.ticket)}
              delta={d.ticketGrowth ?? undefined}
              icon={<Receipt className="size-4 text-accent" />}
              accent="accent"
            />
          </div>

          {d.goalCurrent !== null && (
            <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                  Meta {d.currentYear}: {brl(d.goalCurrent)}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    (d.goalAttainment ?? 0) >= 100 ? "text-success" : "text-accent"
                  }`}
                >
                  {(d.goalAttainment ?? 0).toFixed(1)}% atingido ·{" "}
                  {d.goalGap !== null && d.goalGap >= 0 ? "+" : ""}
                  {d.goalGap !== null ? brl(d.goalGap) : "—"}
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (d.goalAttainment ?? 0) >= 100 ? "bg-success" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, d.goalAttainment ?? 0))}%` }}
                />
              </div>
              {d.goalPrevious !== null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Meta {d.previousYear}: {brl(d.goalPrevious)} · realizado{" "}
                  {brl(d.previous.revenue)} ({(d.previousAttainment ?? 0).toFixed(1)}%)
                </p>
              )}
            </div>
          )}

          <div className="mt-5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$ ${compact(Number(v))}`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [brl(Number(value)), String(name)]}
                  labelFormatter={(l) => `Dia ${l}/${String(d.month).padStart(2, "0")}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="anterior"
                  name={`${d.previousYear}`}
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground) / 0.15)"
                  strokeWidth={1.5}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="atual"
                  name={`${d.currentYear}`}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      <Section cols="grid-cols-1 lg:grid-cols-2 items-stretch">
        <Card className="flex flex-col">
          <CardTitle
            title="Acumulado do mês"
            hint={`Diferença atual: ${d.revenueGap >= 0 ? "+" : ""}${brl(d.revenueGap)}`}
          />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$ ${compact(Number(v))}`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [brl(Number(value)), String(name)]}
                  labelFormatter={(l) => `Até o dia ${l}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="acumuladoAnterior"
                  name={`Acumulado ${d.previousYear}`}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="acumuladoAtual"
                  name={`Acumulado ${d.currentYear}`}
                  stroke="hsl(var(--success))"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardTitle
            title="Detalhe por dia"
            hint={`${d.current.activeDays} dias com venda em ${d.currentYear} · consignado ${brl(d.current.consignedRevenue)}`}
          />
          <div className="max-h-[260px] overflow-auto">
            <DataTable
              rows={d.daily}

              rowKey={(r) => r.day}
              columns={[
                { key: "day", header: "Dia", render: (r) => `${r.day}/${String(d.month).padStart(2, "0")}` },
                {
                  key: "qa",
                  header: `Ingr. ${d.currentYear}`,
                  align: "right",
                  render: (r) => (r.qtdAtual === null ? "—" : formatNumber(r.qtdAtual)),
                },
                {
                  key: "ra",
                  header: `Receita ${d.currentYear}`,
                  align: "right",
                  render: (r) => (r.atual === null ? "—" : brl(r.atual)),
                },
                {
                  key: "rp",
                  header: `Receita ${d.previousYear}`,
                  align: "right",
                  render: (r) => (r.anterior === null ? "—" : brl(r.anterior)),
                },
                {
                  key: "var",
                  header: "Var.",
                  align: "right",
                  render: (r) => {
                    if (r.atual === null || r.anterior === null || !r.anterior)
                      return <span className="text-muted-foreground">—</span>;
                    const v = ((r.atual - r.anterior) / r.anterior) * 100;
                    return (
                      <span className={v >= 0 ? "text-success" : "text-destructive"}>
                        {v > 0 ? "+" : ""}
                        {v.toFixed(1)}%
                      </span>
                    );
                  },
                },
              ]}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Consignado {d.previousYear}: {brl(d.previous.consignedRevenue)} ·{" "}
            {formatNumber(d.previous.consignedQty)} ingressos
          </p>
        </Card>
      </Section>
    </>
  );
}
