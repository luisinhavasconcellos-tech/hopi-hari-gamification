import { Flame, Clock, CalendarDays, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Kpi, Card, CardTitle, EmptyState, ChartSkeleton } from "@/components/dashboard/primitives";
import { Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/mock-data";
import { useRegistrationHeatmap } from "@/hooks/useRegistrationHeatmap";

const heatColor = (ratio: number) => {
  if (ratio <= 0) return "hsl(var(--muted) / 0.25)";
  const alpha = 0.12 + ratio * 0.88;
  return `hsl(var(--chart-1) / ${alpha.toFixed(2)})`;
};

export default function HeatmapsPage() {
  const {
    loading,
    timed,
    maxTimed,
    totalTimed,
    byHour,
    peak,
    bestHour,
    bestDay,
    weekdayLabels,
    hasData,
  } = useRegistrationHeatmap();

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Comportamento"
        title="Heatmap de Cadastros"
        subtitle="Densidade real de cadastros por dia da semana e hora do dia."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Cadastros com horário"
          value={formatNumber(totalTimed)}
          icon={<Users className="size-4 text-primary" />}
        />
        <Kpi
          label="Dia mais forte"
          value={bestDay.label}
          icon={<CalendarDays className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Hora de pico"
          value={bestHour.label}
          icon={<Clock className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label="Célula mais quente"
          value={`${weekdayLabels[peak.weekday]} ${String(peak.hour).padStart(2, "0")}h`}
          icon={<Flame className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Dia da semana × hora"
            hint="Cadastros sem horário (importações à meia-noite) foram excluídos"
          />
          {loading ? (
            <ChartSkeleton />
          ) : !hasData ? (
            <EmptyState title="Sem dados de horário" description="Importe a base de clientes com data e hora." />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="flex text-[10px] text-muted-foreground pl-10 gap-[2px]">
                  {hours.map((h) => (
                    <div key={h} className="flex-1 text-center">
                      {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
                    </div>
                  ))}
                </div>
                {timed.map((row, w) => (
                  <div key={w} className="flex items-center gap-[2px] mt-[2px]">
                    <div className="w-10 text-[11px] text-muted-foreground">{weekdayLabels[w]}</div>
                    {row.map((v, h) => (
                      <div
                        key={h}
                        title={`${weekdayLabels[w]} ${String(h).padStart(2, "0")}h — ${formatNumber(v)} cadastros`}
                        className="flex-1 h-7 rounded-[3px] border border-border/60"
                        style={{ background: heatColor(v / maxTimed) }}
                      />
                    ))}
                  </div>
                ))}
                <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>0</span>
                  <div className="h-2 w-40 rounded-full bg-gradient-to-r from-[hsl(var(--chart-1)/0.12)] to-[hsl(var(--chart-1))]" />
                  <span>{formatNumber(maxTimed)}</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Distribuição por hora" hint="Total de cadastros por hora do dia" />
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byHour.filter((h) => h.hour !== 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Cadastros"]} />
                <Bar dataKey="registrations" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>
    </div>
  );
}
