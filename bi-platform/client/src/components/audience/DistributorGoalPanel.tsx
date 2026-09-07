import {
  Bar,
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
import { useDistributorGoals } from "@/hooks/useDistributorGoals";
import { DollarSign, Gauge, Target, TrendingUp } from "lucide-react";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function DistributorGoalPanel() {
  const g = useDistributorGoals();

  if (g.loading) {
    return (
      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Meta x realizado — distribuidores" />
          <ChartSkeleton height={300} />
        </Card>
      </Section>
    );
  }

  if (!g.hasData) {
    return (
      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Meta x realizado — distribuidores" />
          <EmptyState title="Sem histórico de metas carregado" />
        </Card>
      </Section>
    );
  }

  return (
    <>
      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title={`Meta x realizado ${g.currentYear}`}
            hint={`Acumulado até o mês ${String(g.lastMonth).padStart(2, "0")} · comparativo com ${g.previousYear}`}
          />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mt-2">
            <Kpi
              label={`Realizado ${g.currentYear} (YTD)`}
              value={brl(g.ytdRealized)}
              delta={g.ytdGrowth ?? undefined}
              icon={<DollarSign className="size-4 text-success" />}
              accent="success"
            />
            <Kpi
              label={`Realizado ${g.previousYear} (mesmo período)`}
              value={brl(g.ytdPrevious)}
              icon={<TrendingUp className="size-4 text-muted-foreground" />}
            />
            <Kpi
              label="Atingimento YTD"
              value={`${g.ytdAttainment.toFixed(1)}%`}
              icon={<Gauge className="size-4 text-primary" />}
            />
            <Kpi
              label={`Meta anual ${g.currentYear}`}
              value={brl(g.yearGoal)}
              icon={<Target className="size-4 text-accent" />}
              accent="accent"
            />
          </div>

          <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium">
                {g.yearAttainment.toFixed(1)}% da meta anual atingida
              </span>
              <span className="text-sm font-semibold text-accent">
                Falta {brl(Math.max(0, g.yearGoal - g.ytdRealized))}
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${g.yearAttainment >= 100 ? "bg-success" : "bg-primary"}`}
                style={{ width: `${Math.min(100, Math.max(0, g.yearAttainment))}%` }}
              />
            </div>
          </div>

          <div className="mt-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={g.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
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
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="meta" name={`Meta ${g.currentYear}`} fill="hsl(var(--muted-foreground) / 0.35)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizado" name={`Realizado ${g.currentYear}`} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="anterior"
                  name={`Realizado ${g.previousYear}`}
                  stroke="hsl(var(--accent))"
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      <Section cols="grid-cols-1 lg:grid-cols-2 items-stretch">
        <Card className="flex flex-col">
          <CardTitle title="Histórico anual" hint="Meta, realizado e crescimento ano a ano" />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={g.yearSummaries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$ ${compact(Number(v))}`}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [brl(Number(v)), String(n)]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="goal" name="Meta" fill="hsl(var(--muted-foreground) / 0.35)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realized" name="Realizado" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-auto">
            <DataTable
              rows={g.yearSummaries}
              rowKey={(r) => String(r.year)}
              columns={[
                { key: "year", header: "Ano", render: (r) => String(r.year) },
                { key: "goal", header: "Meta", align: "right", render: (r) => brl(r.goal) },
                { key: "realized", header: "Realizado", align: "right", render: (r) => brl(r.realized) },
                {
                  key: "att",
                  header: "Ating.",
                  align: "right",
                  render: (r) => (
                    <span className={r.attainment >= 100 ? "text-success" : "text-destructive"}>
                      {r.attainment.toFixed(1)}%
                    </span>
                  ),
                },
                {
                  key: "growth",
                  header: "YoY",
                  align: "right",
                  render: (r) =>
                    r.growth === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={r.growth >= 0 ? "text-success" : "text-destructive"}>
                        {r.growth > 0 ? "+" : ""}
                        {r.growth.toFixed(1)}%
                      </span>
                    ),
                },
              ]}
            />
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardTitle title={`Detalhe mensal ${g.currentYear}`} hint="Meta, realizado, gap e variação vs. ano anterior" />
          <div className="max-h-[440px] overflow-auto">
            <DataTable
              rows={g.monthly}
              rowKey={(r) => String(r.month)}
              columns={[
                { key: "label", header: "Mês", render: (r) => r.label },
                { key: "meta", header: "Meta", align: "right", render: (r) => brl(r.meta) },
                { key: "real", header: "Realizado", align: "right", render: (r) => brl(r.realizado) },
                {
                  key: "gap",
                  header: "Gap",
                  align: "right",
                  render: (r) => (
                    <span className={r.gap >= 0 ? "text-success" : "text-destructive"}>
                      {r.gap > 0 ? "+" : ""}
                      {brl(r.gap)}
                    </span>
                  ),
                },
                {
                  key: "yoy",
                  header: `vs ${g.previousYear}`,
                  align: "right",
                  render: (r) =>
                    r.yoy === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={r.yoy >= 0 ? "text-success" : "text-destructive"}>
                        {r.yoy > 0 ? "+" : ""}
                        {r.yoy.toFixed(1)}%
                      </span>
                    ),
                },
              ]}
            />
          </div>
        </Card>
      </Section>
    </>
  );
}
