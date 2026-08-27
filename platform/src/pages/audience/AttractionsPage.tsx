import { useMemo, useState } from "react";
import { FerrisWheel, Gauge, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Kpi, Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/mock-data";
import { useParkAttractions } from "@/hooks/useParkAttractions";

const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);

export default function AttractionsPage() {
  const {
    loading,
    byAttraction,
    byArea,
    byMonth,
    totalCurrent,
    growth,
    currentYear,
    previousYear,
    ridesPerVisitor,
    hasData,
  } = useParkAttractions();
  const [area, setArea] = useState<string>("todas");

  const areas = useMemo(() => ["todas", ...byArea.map((a) => a.area)], [byArea]);
  const filtered = useMemo(
    () => (area === "todas" ? byAttraction : byAttraction.filter((a) => a.area === area)),
    [byAttraction, area],
  );
  const top = filtered.slice(0, 12);
  const best = [...byAttraction].filter((a) => a.growth !== null).sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))[0];

  return (
    <div className="px-5 lg:px-8 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Audience · Operação"
          title="Atrações"
          subtitle={`Giros por atração e área — comparativo ${previousYear} x ${currentYear} com penetração sobre o público do parque.`}
        />
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
          {areas.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`rounded-md px-3 py-1.5 text-xs capitalize transition-colors ${
                area === a ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label={`Giros ${currentYear}`} value={formatNumber(totalCurrent)} icon={<FerrisWheel className="size-4 text-primary" />} />
        <Kpi
          label={`Variação vs ${previousYear}`}
          value={pct(growth)}
          icon={<TrendingUp className="size-4 text-success" />}
          accent={(growth ?? 0) >= 0 ? "success" : undefined}
        />
        <Kpi
          label="Giros por visitante"
          value={ridesPerVisitor ? ridesPerVisitor.toFixed(1) : "—"}
          icon={<Users className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Maior alta"
          value={best ? `${best.attraction} ${pct(best.growth)}` : "—"}
          icon={<Gauge className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title={`Giros por mês — ${previousYear} x ${currentYear}`} />
          {loading ? (
            <ChartSkeleton />
          ) : !hasData ? (
            <EmptyState title="Sem dados de atrações carregados" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name={String(previousYear)} dataKey="anterior" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                <Bar name={String(currentYear)} dataKey="atual" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Line
                  name={`Público ${currentYear}`}
                  type="monotone"
                  dataKey="publicoAtual"
                  stroke="hsl(var(--chart-5))"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardTitle title="Top atrações por giros" hint={area === "todas" ? undefined : `Área: ${area}`} />
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={top} layout="vertical" margin={{ left: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="attraction" width={100} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Giros"]} />
                <Bar dataKey="currentRides" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title="Giros por área temática" />
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={byArea}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="area" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name={String(previousYear)} dataKey="previousRides" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                <Bar name={String(currentYear)} dataKey="currentRides" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Detalhe por atração" hint="Penetração = % do público que utilizou a atração" />
          <DataTable
            rows={filtered}
            rowKey={(r) => r.attraction}
            columns={[
              { key: "attraction", header: "Atração", render: (r) => r.attraction },
              { key: "area", header: "Área", render: (r) => r.area },
              { key: "cur", header: `Giros ${currentYear}`, align: "right", render: (r) => formatNumber(r.currentRides) },
              { key: "prev", header: `Giros ${previousYear}`, align: "right", render: (r) => formatNumber(r.previousRides) },
              {
                key: "growth",
                header: "Variação",
                align: "right",
                render: (r) => (
                  <span className={(r.growth ?? 0) >= 0 ? "text-success" : "text-destructive"}>{pct(r.growth)}</span>
                ),
              },
              { key: "pen", header: "Penetração média", align: "right", render: (r) => `${r.penetration.toFixed(1)}%` },
            ]}
          />
        </Card>
      </Section>
    </div>
  );
}
