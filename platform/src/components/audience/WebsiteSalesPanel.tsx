import {
  Area,
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
import { Globe, DollarSign, CalendarDays, TrendingUp } from "lucide-react";
import { Card, CardTitle, ChartSkeleton, EmptyState, Kpi, PageHeader } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { useWebsiteSales } from "@/hooks/useWebsiteSales";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function WebsiteSalesPanel() {
  const s = useWebsiteSales();

  if (s.loading) return <ChartSkeleton />;
  if (!s.hasData)
    return <EmptyState title="Sem vendas do site" description="Importe o relatório diário de faturamento do site." />;

  return (
    <>
      <PageHeader
        eyebrow="Vendas"
        title="Vendas do site"
        subtitle={`Faturamento diário do e-commerce — ${s.monthLabel}`}
      />

      <Section cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<DollarSign className="size-4" />}
          label="Faturamento no mês"
          value={brl(s.total)}
          deltaLabel={`${s.days} dias com venda`}
        />
        <Kpi
          icon={<CalendarDays className="size-4" />}
          label="Média diária"
          value={brl(s.avg)}
          deltaLabel={`Projeção mês: ${brl(s.projection)}`}
        />
        <Kpi
          icon={<TrendingUp className="size-4" />}
          label="Melhor dia"
          value={s.best ? brl(s.best.revenue) : "—"}
          deltaLabel={s.best ? `${s.best.day} — ${s.best.weekday}` : undefined}
        />
        <Kpi
          icon={<Globe className="size-4" />}
          label="Peso do fim de semana"
          value={`${s.weekendShare.toFixed(1)}%`}
          deltaLabel="Sáb + Dom sobre o total"
        />
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Faturamento diário e acumulado" hint="Barras: dia · Linha: acumulado no mês" />
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={s.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                yAxisId="r"
                orientation="right"
                tickFormatter={compact}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => brl(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" name="Faturamento do dia" dataKey="revenue" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              <Line
                yAxisId="r"
                name="Acumulado"
                type="monotone"
                dataKey="accumulated"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <Section cols="grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardTitle title="Média por dia da semana" hint="Onde o site vende mais" />
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={s.byWeekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="weekday" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => brl(v)} />
              <Area name="Média" dataKey="average" fill="hsl(var(--chart-4) / 0.25)" stroke="hsl(var(--chart-4))" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle title="Detalhe dia a dia" hint={`${s.monthLabel}`} />
          <DataTable
            rows={s.daily}
            rowKey={(r) => r.date}
            maxHeight="max-h-[280px]"
            columns={[
              { key: "day", header: "Dia", width: "w-[20%]", render: (r) => r.day },
              { key: "weekday", header: "Semana", width: "w-[35%]", render: (r) => r.weekday },
              { key: "rev", header: "Faturamento", align: "right", width: "w-[22%]", render: (r) => brl(r.revenue) },
              {
                key: "acc",
                header: "Acumulado",
                align: "right",
                width: "w-[23%]",
                render: (r) => brl(r.accumulated),
              },
            ]}
          />
        </Card>
      </Section>
    </>
  );
}
