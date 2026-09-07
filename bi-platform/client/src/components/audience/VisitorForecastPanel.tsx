import { useEffect, useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users, CalendarDays, TrendingUp, Ticket } from "lucide-react";
import { Card, CardTitle, ChartSkeleton, EmptyState, Kpi } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/format";

type Row = { date: string; visitors: number };

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export default function VisitorForecastPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("park_visitors_forecast")
        .select("date, visitors")
        .order("date", { ascending: true });
      if (!alive) return;
      setRows(((data ?? []) as Row[]).map((r) => ({ ...r, visitors: Number(r.visitors) })));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const s = useMemo(() => {
    let acc = 0;
    const daily = rows.map((r) => {
      const d = new Date(`${r.date}T12:00:00`);
      acc += r.visitors;
      return {
        date: r.date,
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        weekday: WEEKDAYS[d.getDay()],
        visitors: r.visitors,
        accumulated: acc,
      };
    });
    const total = acc;
    const best = daily.reduce<(typeof daily)[number] | null>((b, r) => (!b || r.visitors > b.visitors ? r : b), null);
    const weekend = daily.filter((r) => r.weekday === "Sábado" || r.weekday === "Domingo");
    const byWeekday = WEEKDAYS.map((w) => {
      const list = daily.filter((r) => r.weekday === w);
      return { weekday: w.replace("-feira", ""), average: list.length ? Math.round(list.reduce((a, r) => a + r.visitors, 0) / list.length) : 0 };
    }).filter((r) => r.average > 0);

    return {
      daily,
      total,
      days: daily.length,
      avg: daily.length ? Math.round(total / daily.length) : 0,
      best,
      byWeekday,
      weekendShare: total ? (weekend.reduce((a, r) => a + r.visitors, 0) / total) * 100 : 0,
      range: daily.length ? `${daily[0].label} a ${daily[daily.length - 1].label}` : "",
    };
  }, [rows]);

  if (loading) return <ChartSkeleton />;
  if (!rows.length)
    return <EmptyState title="Sem previsão de visitantes" description="Importe o relatório de visitantes por dia." />;

  return (
    <>
      <Section cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<Users className="size-4" />} label="Visitantes previstos" value={formatNumber(s.total)} deltaLabel={`${s.days} dias de operação — ${s.range}`} />
        <Kpi icon={<CalendarDays className="size-4" />} label="Média por dia" value={formatNumber(s.avg)} deltaLabel="Ingressos já emitidos" accent="accent" />
        <Kpi
          icon={<TrendingUp className="size-4" />}
          label="Maior dia"
          value={s.best ? formatNumber(s.best.visitors) : "—"}
          deltaLabel={s.best ? `${s.best.label} — ${s.best.weekday}` : undefined}
          accent="success"
        />
        <Kpi icon={<Ticket className="size-4" />} label="Peso do fim de semana" value={`${s.weekendShare.toFixed(1)}%`} deltaLabel="Sáb + Dom sobre o total" />
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Visitantes previstos por dia" hint="Barras: dia · Linha: acumulado do período" />
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={s.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="r" orientation="right" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => formatNumber(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" name="Visitantes do dia" dataKey="visitors" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              <Line yAxisId="r" name="Acumulado" type="monotone" dataKey="accumulated" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <Section cols="grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardTitle title="Média por dia da semana" hint="Onde a operação concentra público" />
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={s.byWeekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="weekday" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => formatNumber(v)} />
              <Bar name="Média" dataKey="average" fill="hsl(var(--chart-4))" radius={[6, 6, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle title="Detalhe dia a dia" hint={s.range} />
          <DataTable
            rows={s.daily}
            rowKey={(r) => r.date}
            maxHeight="max-h-[280px]"
            columns={[
              { key: "day", header: "Dia", width: "w-[22%]", render: (r) => r.label },
              { key: "weekday", header: "Semana", width: "w-[33%]", render: (r) => r.weekday },
              { key: "v", header: "Visitantes", align: "right", width: "w-[22%]", render: (r) => formatNumber(r.visitors) },
              { key: "acc", header: "Acumulado", align: "right", width: "w-[23%]", render: (r) => formatNumber(r.accumulated) },
            ]}
          />
        </Card>
      </Section>
    </>
  );
}
