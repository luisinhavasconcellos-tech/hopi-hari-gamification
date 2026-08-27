import { useMemo, useState } from "react";
import { Users, MapPin, Radio, Activity, Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle, CHART_COLORS } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/mock-data";
import { useSegmentReport, segmentsToCsv, type SegmentRow } from "@/hooks/useSegmentReport";
import { useAudienceAggregates } from "@/hooks/useAudienceAggregates";

const PERIODS = [7, 30, 90] as const;

function pct(v: number) {
  return `${v.toFixed(1)}%`;
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  accent?: "success";
}) {
  return (
    <div className="relative glass rounded-2xl p-4 sm:p-5 h-full flex flex-col overflow-hidden fade-up">
      <div
        className={`absolute -top-16 -right-16 size-44 rounded-full blur-3xl opacity-70 bg-gradient-to-br ${
          accent === "success" ? "from-success/25" : "from-primary/25"
        } to-transparent`}
      />
      <div className="relative flex items-start justify-between gap-2 min-h-[2.25rem]">
        <div className="text-xs leading-snug text-muted-foreground">{label}</div>
        {icon && (
          <div className="size-8 shrink-0 grid place-items-center rounded-lg bg-muted/50 text-foreground/80">
            {icon}
          </div>
        )}
      </div>
      <div className="relative mt-2 font-display text-2xl sm:text-3xl leading-tight tracking-tight break-words">
        {value}
      </div>
      {hint && (
        <p className="relative mt-auto pt-2 text-[11px] leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}


function SegmentTable({ rows, showBase }: { rows: SegmentRow[]; showBase: boolean }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.label}
      columns={[
        { key: "label", header: "Segmento", render: (r) => r.label },
        ...(showBase
          ? [
              {
                key: "customers",
                header: "Base",
                align: "right" as const,
                render: (r: SegmentRow) => formatNumber(r.customers),
              },
              {
                key: "share",
                header: "% base",
                align: "right" as const,
                render: (r: SegmentRow) => pct(r.baseShare),
              },
            ]
          : []),
        { key: "sessions", header: "Sessões", align: "right", render: (r) => formatNumber(r.sessions) },
        { key: "events", header: "Eventos", align: "right", render: (r) => formatNumber(r.events) },
        { key: "intensity", header: "Ev./sessão", align: "right", render: (r) => r.intensity.toFixed(1) },
        { key: "eventShare", header: "% eventos", align: "right", render: (r) => pct(r.eventShare) },
      ]}
    />
  );
}

export default function SegmentsPage() {
  const [days, setDays] = useState<number>(30);
  const aggregates = useAudienceAggregates(days);
  const report = useSegmentReport(days);
  const {
    loading,
    byAge,
    byRegion,
    byChannel,
    byDay,
    totalCustomers,
    totalRegistrations,
    totalEvents,
    identifiedSessions,
    coverage,
    topAge,
    topRegion,
    topChannel,
    hasBase,
    hasBehavior,
  } = report;

  const ageChart = useMemo(() => byAge.slice(0, 10), [byAge]);
  const regionChart = useMemo(() => byRegion.slice(0, 10), [byRegion]);

  const exportCsv = () => {
    const csv = segmentsToCsv([
      { name: "faixa_etaria", rows: byAge },
      { name: "regiao_cpf", rows: byRegion },
      { name: "canal", rows: byChannel },
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `segmentos-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-5 lg:px-8 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Audience · Público"
          title="Segmentos"
          subtitle="Relatório agregado por faixa etária, região e canal — cruzando a base cadastral com o comportamento consentido. Sem análises individuais."
        />
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setDays(p)}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  days === p ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
          <button
            onClick={() => aggregates.refresh()}
            disabled={aggregates.loading}
            title={
              aggregates.data
                ? `Agregações ${aggregates.cached ? "em cache" : "recalculadas"} · ${aggregates.data.elapsed_ms ?? 0} ms`
                : "Atualizar cache de agregações"
            }
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {aggregates.loading
              ? "Atualizando…"
              : aggregates.cached
                ? "Cache ativo"
                : "Recalculado"}
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3.5" /> Exportar CSV
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        <KpiCard
          label="Base segmentada"
          value={formatNumber(Math.max(totalCustomers, totalRegistrations))}
          hint={topAge ? `Faixa dominante: ${topAge.label} (${pct(topAge.baseShare)})` : undefined}
          icon={<Users className="size-4 text-primary" />}
        />
        <KpiCard
          label="Região líder"
          value={topRegion ? topRegion.label : "—"}
          hint={topRegion ? `${pct(topRegion.baseShare)} da base` : undefined}
          icon={<MapPin className="size-4 text-primary" />}
        />
        <KpiCard
          label="Canal líder"
          value={topChannel ? topChannel.label : "—"}
          hint={topChannel ? `${formatNumber(topChannel.events)} eventos` : "sem eventos no período"}
          icon={<Radio className="size-4 text-primary" />}
        />
        <KpiCard
          label={`Eventos (${days} dias)`}
          value={formatNumber(totalEvents)}
          hint={`${formatNumber(identifiedSessions)} sessões · ${pct(coverage)} da base consentida`}
          icon={<Activity className="size-4 text-primary" />}
          accent="success"
        />
      </div>


      <Section>
        <Card>
          <CardTitle title="Faixa etária" hint="Base cadastral x eventos consentidos" />
          {loading ? (
            <ChartSkeleton />
          ) : ageChart.length === 0 ? (
            <EmptyState title="Sem dados de faixa etária" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ageChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="r" orientation="right" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="l" name="Clientes" dataKey="customers" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="r" name="Eventos" dataKey="events" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title="Região (CPF)" hint="Origem fiscal declarada no cadastro" />
          {loading ? (
            <ChartSkeleton />
          ) : regionChart.length === 0 ? (
            <EmptyState title="Sem dados de região" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={regionChart} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(Number(v))} />
                <Bar name="Clientes" dataKey="customers" fill="hsl(var(--chart-3))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section>
        <Card>
          <CardTitle title="Canal de origem" hint={`Eventos consentidos nos últimos ${days} dias`} />
          {loading ? (
            <ChartSkeleton />
          ) : byChannel.length === 0 ? (
            <EmptyState title="Sem eventos por canal" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byChannel} dataKey="events" nameKey="label" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {byChannel.map((c, i) => (
                    <Cell key={c.label} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title="Evolução dos eventos consentidos" />
          {loading ? (
            <ChartSkeleton />
          ) : !hasBehavior ? (
            <EmptyState title="Nenhum evento consentido no período" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="events" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Relatório por faixa etária" />
          {loading ? (
            <ChartSkeleton />
          ) : byAge.length === 0 ? (
            <EmptyState title="Sem dados" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[...byAge].sort((a, b) => (b.customers ?? 0) - (a.customers ?? 0))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, _n, item: any) => [
                      `${formatNumber(Number(v))} (${pct(item?.payload?.baseShare ?? 0)})`,
                      "Clientes",
                    ]}
                  />
                  <Bar name="Clientes" dataKey="customers" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4">
                <SegmentTable rows={byAge} showBase />
              </div>
            </>
          )}
        </Card>
      </Section>


      <Section>
        <Card>
          <CardTitle title="Relatório por região" />
          {loading ? <ChartSkeleton /> : byRegion.length === 0 ? <EmptyState title="Sem dados" /> : <SegmentTable rows={byRegion} showBase />}
        </Card>
        <Card>
          <CardTitle title="Relatório por canal" />
          {loading ? (
            <ChartSkeleton />
          ) : byChannel.length === 0 ? (
            <EmptyState title="Sem eventos por canal" />
          ) : (
            <SegmentTable rows={byChannel} showBase={false} />
          )}
        </Card>
      </Section>

      {!hasBase && !loading && (
        <p className="mt-6 text-xs text-muted-foreground">
          A base cadastral ainda não foi carregada — os relatórios ficam completos assim que os cadastros forem sincronizados.
        </p>
      )}
    </div>
  );
}
