import { CalendarDays, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Kpi, Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/mock-data";
import { useCustomerRegistrations } from "@/hooks/useCustomerRegistrations";

export default function WeekdaysPage() {
  const { loading, byWeekday, total } = useCustomerRegistrations();
  const ordered = [...byWeekday].sort((a, b) => b.media - a.media);
  const melhor = ordered[0];
  const pior = ordered.at(-1);

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Comportamento"
        title="Dias da Semana"
        subtitle="Distribuição real dos cadastros de clientes por dia da semana."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Kpi label="Cadastros analisados" value={formatNumber(total)} icon={<Users className="size-4 text-primary" />} />
        <Kpi
          label={melhor ? `Melhor dia — ${melhor.dia}` : "Melhor dia"}
          value={melhor ? `${formatNumber(melhor.media)}/dia` : "—"}
          icon={<TrendingUp className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label={pior ? `Menor dia — ${pior.dia}` : "Menor dia"}
          value={pior ? `${formatNumber(pior.media)}/dia` : "—"}
          icon={<CalendarDays className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Média de cadastros por dia da semana" />
          {loading ? (
            <ChartSkeleton />
          ) : total === 0 ? (
            <EmptyState title="Sem cadastros carregados" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byWeekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Média/dia"]} />
                <Bar dataKey="media" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Detalhe por dia" />
          <DataTable
            rows={byWeekday}
            rowKey={(r) => r.dia}
            columns={[
              { key: "dia", header: "Dia", render: (r) => r.dia },
              { key: "total", header: "Cadastros", align: "right", render: (r) => formatNumber(r.registrations) },
              { key: "media", header: "Média/dia", align: "right", render: (r) => formatNumber(r.media) },
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
    </div>
  );
}
