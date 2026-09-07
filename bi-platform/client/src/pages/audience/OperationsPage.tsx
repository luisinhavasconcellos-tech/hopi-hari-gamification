import { useMemo, useState } from "react";
import { Activity, AlertTriangle, ChevronRight, Gauge, RefreshCw, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Kpi, Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle, CHART_COLORS } from "@/components/audience/AudienceUI";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber } from "@/lib/format";
import { useParkAttractions, MONTH_LABELS } from "@/hooks/useParkAttractions";
import { useReputation, SOURCE_LABEL, type ReputationReview } from "@/hooks/useReputation";

const pct = (v: number | null) => (v === null ? "\u2014" : `${v.toFixed(1)}%`);

const MONTH_PRESETS: { key: string; label: string; months: number[] | null }[] = [
  { key: "all", label: "Ano todo", months: null },
  { key: "s1", label: "1\u00ba semestre", months: [1, 2, 3, 4, 5, 6] },
  { key: "s2", label: "2\u00ba semestre", months: [7, 8, 9, 10, 11, 12] },
  { key: "high", label: "Alta temporada", months: [1, 7, 10, 12] },
];

const REP_PERIODS = [30, 90, 180, 365];

function relativeTime(date: Date | null) {
  if (!date) return "\u2014";
  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `h\u00e1 ${Math.round(diff / 60)} min`;
  return `h\u00e1 ${Math.round(diff / 3600)} h`;
}

function StatusBar({
  loading,
  refreshing,
  lastUpdated,
  onRefresh,
}: {
  loading: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
}) {
  const busy = loading || refreshing;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`size-2 rounded-full ${busy ? "bg-warning animate-pulse" : "bg-success"}`}
        aria-hidden
      />
      <span className="text-muted-foreground">
        {busy ? "Atualizando dados\u2026" : `Atualizado ${relativeTime(lastUpdated)}`}
      </span>
      <Button variant="ghost" size="sm" onClick={onRefresh} disabled={busy} className="h-7 px-2">
        <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
        <span className="ml-1">Atualizar</span>
      </Button>
    </div>
  );
}

export default function OperationsPage() {
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [preset, setPreset] = useState("all");
  const [repDays, setRepDays] = useState(90);
  const [drillSource, setDrillSource] = useState<string | null>(null);
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  const months = MONTH_PRESETS.find((p) => p.key === preset)?.months ?? null;

  const {
    loading,
    refreshing,
    lastUpdated,
    refresh,
    years,
    byAttraction,
    byArea,
    byMonth,
    totalCurrent,
    currentYear,
    previousYear,
    publicCurrent,
    ridesPerVisitor,
    hasData,
  } = useParkAttractions({ year: yearFilter, months });
  const {
    totals,
    reviews,
    loading: repLoading,
    refreshing: repRefreshing,
    lastUpdated: repUpdated,
    reload: repReload,
  } = useReputation(repDays, 5 * 60_000);

  // Intensidade de uso por mês: giros / visitantes (proxy de carga operacional)
  const loadByMonth = useMemo(
    () =>
      byMonth
        .filter((m) => m.publicoAtual > 0)
        .map((m) => ({
          month: m.month,
          publico: m.publicoAtual,
          giros: m.atual,
          intensidade: m.publicoAtual ? Number((m.atual / m.publicoAtual).toFixed(2)) : 0,
        })),
    [byMonth],
  );

  const peak = useMemo(
    () => [...loadByMonth].sort((a, b) => b.publico - a.publico)[0] ?? null,
    [loadByMonth],
  );
  const peakLoad = useMemo(
    () => [...loadByMonth].sort((a, b) => b.intensidade - a.intensidade)[0] ?? null,
    [loadByMonth],
  );

  // Gargalos: maior penetração = maior pressão de fila
  const bottlenecks = useMemo(
    () => [...byAttraction].filter((a) => a.currentRides > 0).slice(0, 12),
    [byAttraction],
  );
  const highPenetration = useMemo(
    () => [...byAttraction].sort((a, b) => b.penetration - a.penetration).slice(0, 10),
    [byAttraction],
  );
  const lowUse = useMemo(
    () =>
      [...byAttraction]
        .filter((a) => a.currentRides > 0)
        .sort((a, b) => a.penetration - b.penetration)
        .slice(0, 8),
    [byAttraction],
  );

  const areaShare = useMemo(() => {
    const total = byArea.reduce((s, a) => s + a.currentRides, 0);
    return byArea.map((a) => ({
      ...a,
      share: total ? (a.currentRides / total) * 100 : 0,
    }));
  }, [byArea]);

  // Drill down das reclamações: fonte → categoria → registros
  const drill = useMemo(() => {
    const bySource = new Map<string, ReputationReview[]>();
    reviews.forEach((r) => {
      const list = bySource.get(r.source) ?? [];
      list.push(r);
      bySource.set(r.source, list);
    });
    const sources = [...bySource.entries()].map(([source, list]) => ({
      source,
      label: SOURCE_LABEL[source as keyof typeof SOURCE_LABEL] ?? source,
      total: list.length,
      negatives: list.filter((r) => r.sentiment === "negativo").length,
      answered: list.filter((r) => r.responded_at).length,
    }));

    const sourceReviews = drillSource ? (bySource.get(drillSource) ?? []) : [];
    const catMap = new Map<string, ReputationReview[]>();
    sourceReviews.forEach((r) => {
      const key = r.category?.trim() || "Sem categoria";
      const list = catMap.get(key) ?? [];
      list.push(r);
      catMap.set(key, list);
    });
    const categories = [...catMap.entries()]
      .map(([category, list]) => ({
        category,
        total: list.length,
        negatives: list.filter((r) => r.sentiment === "negativo").length,
        avgResponse: (() => {
          const vals = list.map((r) => r.response_time_hours).filter((v): v is number => v != null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        })(),
      }))
      .sort((a, b) => b.total - a.total);

    const items = drillCategory
      ? sourceReviews.filter((r) => (r.category?.trim() || "Sem categoria") === drillCategory)
      : [];

    return { sources, categories, items };
  }, [reviews, drillSource, drillCategory]);

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Operação"
        title="Operacional"
        subtitle={`Carga do parque, uso das atrações e pressão de filas — ${currentYear} (comparativo ${previousYear}).`}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Período</span>
        <Select
          value={yearFilter ? String(yearFilter) : "auto"}
          onValueChange={(v) => setYearFilter(v === "auto" ? null : Number(v))}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Mais recente</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1">
          {MONTH_PRESETS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={preset === p.key ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto">
          <StatusBar
            loading={loading}
            refreshing={refreshing}
            lastUpdated={lastUpdated}
            onRefresh={() => void refresh()}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label={`Público ${currentYear}`}
          value={publicCurrent ? formatNumber(publicCurrent) : "—"}
          icon={<Users className="size-4 text-primary" />}
        />
        <Kpi
          label="Giros por visitante"
          value={ridesPerVisitor ? ridesPerVisitor.toFixed(1) : "—"}
          icon={<Activity className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Mês de pico"
          value={peak ? `${peak.month} · ${formatNumber(peak.publico)}` : "—"}
          icon={<Gauge className="size-4 text-success" />}
        />
        <Kpi
          label={`Reclamações (${repDays}d)`}
          value={repLoading ? "…" : totals.reviews ? formatNumber(totals.reviews) : "0"}
          icon={<AlertTriangle className="size-4 text-warning" />}
        />
      </div>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Carga operacional por mês"
            hint="Público do parque x giros realizados e intensidade de uso (giros por visitante)"
          />
          {loading ? (
            <ChartSkeleton />
          ) : !loadByMonth.length ? (
            <EmptyState title="Sem público mensal carregado" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={loadByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="l" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => (n === "Intensidade" ? v : formatNumber(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="l" name="Público" dataKey="publico" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="l" name="Giros" dataKey="giros" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Line
                  yAxisId="r"
                  name="Intensidade"
                  type="monotone"
                  dataKey="intensidade"
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
          <CardTitle
            title="Pressão de fila por atração"
            hint="Penetração média sobre o público — quanto maior, maior a demanda por capacidade"
          />
          {loading ? (
            <ChartSkeleton />
          ) : !hasData ? (
            <EmptyState title="Sem dados de atrações" />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={highPenetration} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="attraction" width={140} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Bar dataKey="penetration" radius={[0, 6, 6, 0]}>
                  {highPenetration.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title="Distribuição de carga por área" hint={`Participação nos giros de ${currentYear}`} />
          {loading ? (
            <ChartSkeleton />
          ) : !areaShare.length ? (
            <EmptyState title="Sem dados por área" />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={areaShare}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="area" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Area type="monotone" dataKey="share" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.25)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardTitle title="Atrações mais exigidas" hint={`Giros ${currentYear} e penetração média`} />
          <DataTable
            rows={bottlenecks}
            rowKey={(r) => r.attraction}
            maxHeight="max-h-[380px]"
            columns={[
              { key: "a", header: "Atração", width: "w-[45%]", clamp: true, render: (r) => r.attraction },
              { key: "ar", header: "Área", width: "w-[25%]", clamp: true, render: (r) => <span className="text-muted-foreground">{r.area}</span> },
              { key: "g", header: "Giros", align: "right", render: (r) => formatNumber(r.currentRides) },
              { key: "p", header: "Penetração", align: "right", render: (r) => pct(r.penetration) },
            ]}
          />
        </Card>

        <Card>
          <CardTitle title="Capacidade ociosa" hint="Atrações com menor penetração — oportunidade de redistribuir fluxo" />
          <DataTable
            rows={lowUse}
            rowKey={(r) => r.attraction}
            maxHeight="max-h-[380px]"
            columns={[
              { key: "a", header: "Atração", width: "w-[45%]", clamp: true, render: (r) => r.attraction },
              { key: "ar", header: "Área", width: "w-[25%]", clamp: true, render: (r) => <span className="text-muted-foreground">{r.area}</span> },
              { key: "g", header: "Giros", align: "right", render: (r) => formatNumber(r.currentRides) },
              { key: "p", header: "Penetração", align: "right", render: (r) => pct(r.penetration) },
            ]}
          />
        </Card>
      </Section>

      <Section cols="grid-cols-1 md:grid-cols-3">
        <Card>
          <CardTitle title="Pico de intensidade" />
          <p className="text-2xl font-semibold">{peakLoad ? `${peakLoad.intensidade.toFixed(2)} giros/visitante` : "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {peakLoad ? `Mês de ${peakLoad.month} — maior carga por visitante do ano.` : "Sem dados suficientes."}
          </p>
        </Card>
        <Card>
          <CardTitle title="Volume total de giros" />
          <p className="text-2xl font-semibold">{formatNumber(totalCurrent)}</p>
          <p className="text-xs text-muted-foreground mt-1">Somatório de {currentYear} em todas as áreas.</p>
        </Card>
        <Card>
          <CardTitle title="Atendimento a reclamações" />
          <p className="text-2xl font-semibold">
            {totals.avgResponseHours != null ? `${totals.avgResponseHours.toFixed(1)}h` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tempo médio de resposta (90 dias) · taxa de resposta {totals.answerRate != null ? `${totals.answerRate.toFixed(0)}%` : "—"}.
          </p>
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle
              title="Reclamações — drill down"
              hint="Explore por fonte, depois por categoria, até o registro individual"
            />
            <div className="flex items-center gap-3">
              <Select value={String(repDays)} onValueChange={(v) => setRepDays(Number(v))}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REP_PERIODS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      Últimos {d}d
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <StatusBar
                loading={repLoading}
                refreshing={repRefreshing}
                lastUpdated={repUpdated}
                onRefresh={() => void repReload(true)}
              />
            </div>
          </div>

          <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
            <button className="hover:text-foreground" onClick={() => { setDrillSource(null); setDrillCategory(null); }}>
              Fontes
            </button>
            {drillSource && (
              <>
                <ChevronRight className="size-3" />
                <button className="hover:text-foreground" onClick={() => setDrillCategory(null)}>
                  {SOURCE_LABEL[drillSource as keyof typeof SOURCE_LABEL] ?? drillSource}
                </button>
              </>
            )}
            {drillCategory && (
              <>
                <ChevronRight className="size-3" />
                <span className="text-foreground">{drillCategory}</span>
              </>
            )}
          </div>

          {repLoading ? (
            <ChartSkeleton height={220} />
          ) : !reviews.length ? (
            <EmptyState title="Sem reclamações no período" />
          ) : !drillSource ? (
            <DataTable
              rows={drill.sources}
              rowKey={(r) => r.source}
              onRowClick={(r) => setDrillSource(r.source)}
              columns={[
                { key: "s", header: "Fonte", width: "w-[40%]", render: (r) => r.label },
                { key: "t", header: "Registros", align: "right", render: (r) => formatNumber(r.total) },
                { key: "n", header: "Negativos", align: "right", render: (r) => formatNumber(r.negatives) },
                { key: "a", header: "Respondidos", align: "right", render: (r) => formatNumber(r.answered) },
              ]}
            />
          ) : !drillCategory ? (
            <DataTable
              rows={drill.categories}
              rowKey={(r) => r.category}
              onRowClick={(r) => setDrillCategory(r.category)}
              columns={[
                { key: "c", header: "Categoria", width: "w-[45%]", clamp: true, render: (r) => r.category },
                { key: "t", header: "Registros", align: "right", render: (r) => formatNumber(r.total) },
                { key: "n", header: "Negativos", align: "right", render: (r) => formatNumber(r.negatives) },
                {
                  key: "r",
                  header: "Resposta média",
                  align: "right",
                  render: (r) => (r.avgResponse != null ? `${r.avgResponse.toFixed(1)}h` : "—"),
                },
              ]}
            />
          ) : (
            <DataTable
              rows={drill.items}
              rowKey={(r) => r.id}
              maxHeight="max-h-[420px]"
              columns={[
                {
                  key: "t",
                  header: "Registro",
                  width: "w-[50%]",
                  clamp: true,
                  render: (r) => (
                    <div>
                      <p className="truncate">{r.title || r.body?.slice(0, 80) || "Sem título"}</p>
                      <p className="text-[11px] text-muted-foreground">{r.author || "Anônimo"}</p>
                    </div>
                  ),
                },
                {
                  key: "d",
                  header: "Data",
                  render: (r) =>
                    r.published_at ? new Date(r.published_at).toLocaleDateString("pt-BR") : "—",
                },
                { key: "se", header: "Sentimento", render: (r) => r.sentiment ?? "—" },
                {
                  key: "rt",
                  header: "Resposta",
                  align: "right",
                  render: (r) => (r.response_time_hours != null ? `${r.response_time_hours.toFixed(1)}h` : "—"),
                },
              ]}
            />
          )}
        </Card>
      </Section>
    </div>
  );
}
