import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Filter, Handshake, Info, Layers, Target, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Kpi, Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { CHART_COLORS, DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/format";
import { MONTHS, useSalesFunnel } from "@/hooks/useSalesFunnel";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);
const rate = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}%`);
const dateBR = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const PERIOD_PRESETS = [
  { key: "full", label: "Ano completo", from: 1, to: 12 },
  { key: "s1", label: "1º semestre", from: 1, to: 6 },
  { key: "s2", label: "2º semestre", from: 7, to: 12 },
  { key: "t1", label: "T1", from: 1, to: 3 },
  { key: "t2", label: "T2", from: 4, to: 6 },
  { key: "t3", label: "T3", from: 7, to: 9 },
  { key: "t4", label: "T4", from: 10, to: 12 },
] as const;

const selectClass =
  "rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50";

function MetricLabel({ label, explanation }: { label: string; explanation: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <TooltipUI>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help underline decoration-dotted underline-offset-2">
            {label}
            <Info className="size-3 shrink-0 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs">
          <p>{explanation}</p>
        </TooltipContent>
      </TooltipUI>
    </TooltipProvider>
  );
}

function FunnelLegend() {
  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/50 p-3.5 text-xs">
      <div className="font-medium text-muted-foreground mb-2">Legenda do funil</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <span className="font-medium">Nº de negócios</span>
          <p className="text-muted-foreground leading-snug">Quantidade de oportunidades em cada etapa.</p>
        </div>
        <div>
          <span className="font-medium">Taxa de conversão</span>
          <p className="text-muted-foreground leading-snug">% de fechamentos sobre o total de negócios decididos (fechados + não realizados).</p>
        </div>
        <div>
          <span className="font-medium">Valor / Ganhos</span>
          <p className="text-muted-foreground leading-snug">Receita total estimada dos negócios na etapa.</p>
        </div>
      </div>
    </div>
  );
}

export default function SalesFunnelPage() {
  const [yearOpt, setYearOpt] = useState<number | undefined>(undefined);
  const [compareOpt, setCompareOpt] = useState<number | undefined>(undefined);
  const [preset, setPreset] = useState<(typeof PERIOD_PRESETS)[number]["key"]>("full");
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [drillMode, setDrillMode] = useState(false);
  const [drillType, setDrillType] = useState<string | null>(null);

  const range = PERIOD_PRESETS.find((p) => p.key === preset)!;
  const f = useSalesFunnel({ year: yearOpt, compareYear: compareOpt, monthFrom: range.from, monthTo: range.to });

  const funnelChart = f.stages.map((s) => ({
    label: s.label,
    deals: s.deals,
    value: s.value,
    stage: s.stage,
    branch: s.stage === "nao_realizado",
  }));

  const selected = f.stages.find((s) => s.stage === selectedStage) ?? null;
  const { incoming, outgoing } = f.transitionsFor(selectedStage);
  const linkedStages = new Set([...incoming.map((t) => t.from), ...outgoing.map((t) => t.to)]);

  const toggleStage = (stage: string) =>
    setSelectedStage((cur) => {
      setDrillType(null);
      return cur === stage ? null : stage;
    });

  const stageDeals = useMemo(() => f.dealsByStage(selectedStage), [f, selectedStage]);
  const drillGroups = useMemo(() => {
    const map = new Map<string, { type: string; deals: number; pax: number; value: number }>();
    stageDeals.forEach((d) => {
      const type = d.event_type?.trim() || "Não informado";
      const e = map.get(type) ?? { type, deals: 0, pax: 0, value: 0 };
      e.deals += 1;
      e.pax += d.pax ?? 0;
      e.value += d.total_value || 0;
      map.set(type, e);
    });
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [stageDeals]);
  const drillDeals = useMemo(
    () =>
      [...stageDeals]
        .filter((d) => !drillType || (d.event_type?.trim() || "Não informado") === drillType)
        .sort((a, b) => b.total_value - a.total_value),
    [stageDeals, drillType],
  );

  const cellOpacity = (stage: string) => {
    if (!selectedStage) return 1;
    if (stage === selectedStage) return 1;
    return linkedStages.has(stage) ? 0.7 : 0.15;
  };




  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Comercial"
        title="Funil de Vendas"
        subtitle={`Eventos corporativos — prospecção, negociação e fechamentos, ${f.previousYear} x ${f.currentYear}.`}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/50 p-3">
        <span className="text-xs text-muted-foreground">Período</span>
        <select className={selectClass} value={f.currentYear} onChange={(e) => setYearOpt(Number(e.target.value))}>
          {f.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">comparar com</span>
        <select className={selectClass} value={f.previousYear} onChange={(e) => setCompareOpt(Number(e.target.value))}>
          {f.years
            .filter((y) => y !== f.currentYear)
            .map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
        </select>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {PERIOD_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
              className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                p.key === preset
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDrillMode((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
            drillMode
              ? "border-accent/50 bg-accent/15 text-foreground"
              : "border-border text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Layers className="size-3.5" />
          Drill down
        </button>
        {!range || range.key === "full" ? null : (
          <span className="text-[11px] text-muted-foreground">
            {MONTHS[range.from - 1]}–{MONTHS[range.to - 1]} · negócios sem data são excluídos
          </span>
        )}
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label={
            <MetricLabel
              label={`Receita fechada ${f.currentYear} · ${f.closedCount} eventos`}
              explanation="Valor total dos eventos corporativos fechados no ano corrente."
            />
          }
          value={brl(f.closedValue)}
          icon={<Handshake className="size-4 text-primary" />}
        />
        <Kpi
          label={
            <MetricLabel
              label={`Pipeline aberto · ${f.pipelineCount}`}
              explanation="Negócios em negociação ou em processo de fechamento ainda não decididos."
            />
          }
          value={brl(f.pipelineValue)}
          icon={<Filter className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label={
            <MetricLabel
              label="Taxa de conversão"
              explanation="Fechamentos divididos pelo total de negócios decididos (fechados + não realizados)."
            />
          }
          value={f.conversionRate === null ? "—" : `${f.conversionRate.toFixed(1)}%`}
          icon={<Target className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label={
            <MetricLabel
              label={`Ticket médio (${f.currentYear})`}
              explanation="Valor médio por evento fechado. Receita fechada dividida pelo número de eventos."
            />
          }
          value={brl(f.avgTicket)}
          icon={<TrendingUp className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1 lg:grid-cols-2">
        <Card className="h-full flex flex-col">
          <CardTitle
            title={`Funil ${f.currentYear} · ${f.periodLabel}`}
            hint={
              selected
                ? `Transições destacadas para ${selected.label}`
                : "Nº de negócios por etapa — clique para ver as transições"
            }
          />
          {f.loading ? (
            <ChartSkeleton />
          ) : !f.hasData ? (
            <EmptyState title="Sem dados do funil carregados" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelChart} layout="vertical" margin={{ left: 8, right: 48, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="label" width={96} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: number, _n, p) => {
                      const label = (p?.payload as { label: string }).label;
                      return [
                        `${formatNumber(v)} negócios · ${brl((p?.payload as { value: number }).value)}`,
                        label,
                      ];
                    }}
                  />
                  <Bar
                    dataKey="deals"
                    radius={[0, 6, 6, 0]}
                    barSize={26}
                    minPointSize={4}
                    cursor="pointer"
                    onClick={(d: unknown) => {
                      const stage = (d as { payload?: { stage?: string }; stage?: string })?.payload?.stage
                        ?? (d as { stage?: string })?.stage;
                      if (stage) toggleStage(stage);
                    }}
                  >
                    <LabelList
                      dataKey="deals"
                      position="right"
                      formatter={(v: number) => formatNumber(v)}
                      style={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    {funnelChart.map((d, i) => {
                      const isSelected = selectedStage === d.stage;
                      const isLinked = linkedStages.has(d.stage);
                      return (
                        <Cell
                          key={i}
                          fill={d.branch ? "hsl(var(--destructive))" : CHART_COLORS[i % CHART_COLORS.length]}
                          fillOpacity={cellOpacity(d.stage)}
                          stroke={
                            isSelected
                              ? "hsl(var(--foreground))"
                              : isLinked
                                ? "hsl(var(--accent))"
                                : undefined
                          }
                          strokeDasharray={!isSelected && isLinked ? "4 3" : undefined}
                          strokeWidth={isSelected ? 1.5 : isLinked ? 1.5 : 0}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {selected && (
                <div className="mt-3 rounded-xl border border-primary/30 bg-primary/[0.06] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium">{selected.label}</div>
                    <button
                      type="button"
                      onClick={() => setSelectedStage(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Limpar seleção
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Negócios</div>
                      <div className="text-sm font-semibold tabular-nums">{formatNumber(selected.deals)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Pax</div>
                      <div className="text-sm font-semibold tabular-nums">
                        {selected.pax ? formatNumber(selected.pax) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Valor</div>
                      <div className="text-sm font-semibold tabular-nums">
                        {selected.value ? brl(selected.value) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{f.previousYear}</div>
                      <div className="text-sm font-semibold tabular-nums">
                        {selected.previousDeals ? formatNumber(selected.previousDeals) : "—"} ·{" "}
                        {selected.previousValue ? brl(selected.previousValue) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-background/40 p-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <ArrowLeft className="size-3.5" /> De onde vieram
                      </div>
                      {incoming.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Etapa de entrada do funil.</p>
                      ) : (
                        incoming.map((t) => (
                          <button
                            key={`${t.from}-${t.to}`}
                            type="button"
                            onClick={() => toggleStage(t.from)}
                            className="w-full text-left text-xs py-1 hover:text-foreground text-muted-foreground"
                          >
                            <span className="font-medium text-foreground">{t.fromLabel}</span> ·{" "}
                            {formatNumber(t.fromDeals)} negócios → <span className="text-success font-medium">{rate(t.rate)}</span>{" "}
                            chegaram aqui · {formatNumber(t.drop)} ficaram para trás
                          </button>
                        ))
                      )}
                    </div>
                    <div className="rounded-lg border border-border bg-background/40 p-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <ArrowRight className="size-3.5" /> Para onde vão
                      </div>
                      {outgoing.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Etapa final — não há próxima transição.</p>
                      ) : (
                        outgoing.map((t) => (
                          <button
                            key={`${t.from}-${t.to}`}
                            type="button"
                            onClick={() => toggleStage(t.to)}
                            className="w-full text-left text-xs py-1 hover:text-foreground text-muted-foreground"
                          >
                            <span className={`font-medium ${t.branch ? "text-destructive" : "text-foreground"}`}>
                              {t.toLabel}
                            </span>{" "}
                            · {formatNumber(t.toDeals)} negócios ·{" "}
                            <span className={t.branch ? "text-destructive" : "text-success"}>{rate(t.rate)}</span>{" "}
                            {t.basis}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
              <FunnelLegend />
            </>
          )}
        </Card>

        <Card className="h-full flex flex-col">
          <CardTitle
            title={`Receita mês a mês — ${f.previousYear} x ${f.currentYear}`}
            hint={f.revenueGrowth === null ? undefined : `Acumulado ${pct(f.revenueGrowth)}`}
          />
          {f.loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={f.byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name={String(f.previousYear)} dataKey="anterior" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                <Bar name={String(f.currentYear)} dataKey="atual" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card className="h-full flex flex-col">
          <CardTitle
            title="Transições entre etapas"
            hint={`Avanço e perda entre etapas consecutivas · ${f.currentYear} · ${f.periodLabel}`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {f.transitions.map((t) => {
              const active = selectedStage === t.from || selectedStage === t.to;
              return (
                <button
                  key={`${t.from}-${t.to}`}
                  type="button"
                  onClick={() => toggleStage(t.to)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    active
                      ? "border-primary/50 bg-primary/[0.08]"
                      : selectedStage
                        ? "border-border bg-muted/50 opacity-50 hover:opacity-100"
                        : "border-border bg-muted/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{t.fromLabel}</span>
                    <ArrowRight className={`size-3.5 shrink-0 ${t.branch ? "text-destructive" : "text-success"}`} />
                    <span className={`truncate ${t.branch ? "text-destructive" : "text-foreground"}`}>{t.toLabel}</span>
                  </div>
                  <div className="mt-1.5 text-lg font-semibold tabular-nums">{rate(t.rate)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatNumber(t.fromDeals)} → {formatNumber(t.toDeals)} negócios · {t.basis}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </Section>


      <Section cols="grid-cols-1">
        <Card className="h-full flex flex-col">
          <CardTitle
            title="Etapas do funil"
            hint={selected ? `Etapa selecionada: ${selected.label}` : "Clique em uma linha para destacar a etapa no gráfico"}
          />
          <DataTable
            rows={f.stages}
            rowKey={(r) => r.stage}
            onRowClick={(r) => toggleStage(r.stage)}
            isRowActive={(r) => r.stage === selectedStage}
            columns={[
              { key: "label", header: "Etapa", width: "w-[20%]", render: (r) => r.label },
              {
                key: "deals",
                header: (
                  <MetricLabel
                    label="Negócios"
                    explanation="Número de oportunidades na etapa no ano corrente."
                  />
                ),
                align: "right",
                width: "w-[13%]",
                render: (r) => formatNumber(r.deals),
              },
              {
                key: "pax",
                header: (
                  <MetricLabel
                    label="Pax"
                    explanation="Total de participantes estimados nos negócios da etapa."
                  />
                ),
                align: "right",
                width: "w-[13%]",
                render: (r) => (r.pax ? formatNumber(r.pax) : "—"),
              },
              {
                key: "value",
                header: (
                  <MetricLabel
                    label="Valor"
                    explanation="Receita total estimada dos negócios na etapa."
                  />
                ),
                align: "right",
                width: "w-[18%]",
                render: (r) => (r.value ? brl(r.value) : "—"),
              },
              {
                key: "prev",
                header: (
                  <MetricLabel
                    label={`Negócios ${f.previousYear}`}
                    explanation="Número de oportunidades na mesma etapa no ano anterior."
                  />
                ),
                align: "right",
                width: "w-[14%]",
                render: (r) => (r.previousDeals ? formatNumber(r.previousDeals) : "—"),
              },
              {
                key: "prevValue",
                header: (
                  <MetricLabel
                    label={`Valor ${f.previousYear}`}
                    explanation="Receita total estimada na mesma etapa no ano anterior."
                  />
                ),
                align: "right",
                width: "w-[15%]",
                render: (r) => (r.previousValue ? brl(r.previousValue) : "—"),
              },
              {
                key: "delta",
                header: (
                  <MetricLabel
                    label="Variação"
                    explanation={`Variação do valor da etapa entre ${f.previousYear} e ${f.currentYear} no mesmo período.`}
                  />
                ),
                align: "right",
                width: "w-[13%]",
                render: (r) => (
                  <span className={(r.valueDelta ?? 0) >= 0 ? "text-success" : "text-destructive"}>
                    {pct(r.valueDelta)}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      </Section>

      {drillMode && (
        <Section cols="grid-cols-1">
          <Card className="h-full flex flex-col">
            <CardTitle
              title="Drill down"
              hint={
                selected
                  ? `${selected.label}${drillType ? ` › ${drillType}` : ""} · ${f.currentYear} · ${f.periodLabel}`
                  : "Selecione uma etapa no gráfico ou na tabela para detalhar"
              }
            />
            {!selected ? (
              <EmptyState title="Nenhuma etapa selecionada" />
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedStage(null)}
                    className="rounded-lg border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground"
                  >
                    Todas as etapas
                  </button>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                  <span className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1">{selected.label}</span>
                  {drillType && (
                    <>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => setDrillType(null)}
                        className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1"
                      >
                        {drillType} ✕
                      </button>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  <DataTable
                    rows={drillGroups}
                    rowKey={(r) => r.type}
                    onRowClick={(r) => setDrillType((cur) => (cur === r.type ? null : r.type))}
                    isRowActive={(r) => r.type === drillType}
                    maxHeight="max-h-[420px]"
                    columns={[
                      { key: "type", header: "Tipo de evento", width: "w-[40%]", clamp: true, render: (r) => r.type },
                      {
                        key: "deals",
                        header: "Negócios",
                        align: "right",
                        width: "w-[18%]",
                        render: (r) => formatNumber(r.deals),
                      },
                      {
                        key: "pax",
                        header: "Pax",
                        align: "right",
                        width: "w-[16%]",
                        render: (r) => (r.pax ? formatNumber(r.pax) : "—"),
                      },
                      { key: "value", header: "Valor", align: "right", width: "w-[26%]", render: (r) => brl(r.value) },
                    ]}
                  />
                  <DataTable
                    rows={drillDeals.slice(0, 60)}
                    rowKey={(r) => `${r.company}-${r.event_date ?? ""}-${r.total_value}`}
                    maxHeight="max-h-[420px]"
                    columns={[
                      { key: "company", header: "Empresa", width: "w-[30%]", clamp: true, render: (r) => r.company },
                      {
                        key: "date",
                        header: "Data",
                        align: "right",
                        width: "w-[14%]",
                        render: (r) => dateBR(r.event_date),
                      },
                      {
                        key: "pax",
                        header: "Pax",
                        align: "right",
                        width: "w-[12%]",
                        render: (r) => (r.pax ? formatNumber(r.pax) : "—"),
                      },
                      {
                        key: "status",
                        header: "Status",
                        width: "w-[16%]",
                        clamp: true,
                        render: (r) => r.status ?? r.loss_reason ?? "—",
                      },
                      {
                        key: "value",
                        header: "Valor",
                        align: "right",
                        width: "w-[28%]",
                        render: (r) => brl(r.total_value),
                      },
                    ]}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Mostrando {Math.min(drillDeals.length, 60)} de {formatNumber(drillDeals.length)} negócios.
                </p>
              </>
            )}
          </Card>
        </Section>
      )}

      <Section cols="grid-cols-1 lg:grid-cols-2">
        <Card className="h-full flex flex-col">
          <CardTitle title="Motivos de perda" hint={`Negócios não realizados em ${f.currentYear}`} />
          <DataTable
            rows={f.lossReasons.slice(0, 12)}
            rowKey={(r) => r.reason}
            columns={[
              { key: "reason", header: "Motivo", width: "w-[50%]", clamp: true, render: (r) => r.reason },
              {
                key: "deals",
                header: (
                  <MetricLabel
                    label="Negócios"
                    explanation="Quantidade de negócios perdidos por este motivo."
                  />
                ),
                align: "right",
                width: "w-[18%]",
                render: (r) => formatNumber(r.deals),
              },
              {
                key: "value",
                header: (
                  <MetricLabel
                    label="Valor perdido"
                    explanation="Valor estimado que deixou de ser faturado por este motivo."
                  />
                ),
                align: "right",
                width: "w-[32%]",
                render: (r) => brl(r.value),
              },
            ]}
            maxHeight="max-h-[460px]"
          />
        </Card>

        <Card className="h-full flex flex-col">
          <CardTitle title="Tipos de evento" hint="Fechados + pipeline" />
          <DataTable
            rows={f.eventTypes.slice(0, 12)}
            rowKey={(r) => r.type}
            columns={[
              { key: "type", header: "Tipo", width: "w-[38%]", clamp: true, render: (r) => r.type },
              {
                key: "deals",
                header: (
                  <MetricLabel
                    label="Negócios"
                    explanation="Quantidade de negócios deste tipo (fechados + em negociação)."
                  />
                ),
                align: "right",
                width: "w-[16%]",
                render: (r) => formatNumber(r.deals),
              },
              {
                key: "pax",
                header: (
                  <MetricLabel
                    label="Pax"
                    explanation="Total de participantes estimados nos eventos deste tipo."
                  />
                ),
                align: "right",
                width: "w-[14%]",
                render: (r) => (r.pax ? formatNumber(r.pax) : "—"),
              },
              {
                key: "value",
                header: (
                  <MetricLabel
                    label="Valor"
                    explanation="Receita total estimada dos eventos deste tipo."
                  />
                ),
                align: "right",
                width: "w-[32%]",
                render: (r) => brl(r.value),
              },
            ]}
            maxHeight="max-h-[460px]"
          />
        </Card>
      </Section>

      <Section cols="grid-cols-1 lg:grid-cols-2">
        <Card className="h-full flex flex-col">
          <CardTitle title={`Maiores fechamentos ${f.currentYear}`} />
          <DataTable
            rows={f.topDeals}
            rowKey={(r) => `${r.company}-${r.event_date ?? ""}-${r.total_value}`}
            columns={[
              { key: "company", header: "Empresa", width: "w-[36%]", clamp: true, render: (r) => r.company },
              { key: "date", header: "Data", align: "right", width: "w-[18%]", render: (r) => dateBR(r.event_date) },
              { key: "pax", header: "Pax", align: "right", width: "w-[14%]", render: (r) => (r.pax ? formatNumber(r.pax) : "—") },
              { key: "value", header: "Valor", align: "right", width: "w-[32%]", render: (r) => brl(r.total_value) },
            ]}
            maxHeight="max-h-[460px]"
          />
        </Card>

        <Card className="h-full flex flex-col">
          <CardTitle title="Próximos eventos em negociação" />
          <DataTable
            rows={f.upcoming}
            rowKey={(r) => `${r.company}-${r.event_date ?? ""}`}
            columns={[
              { key: "company", header: "Empresa", width: "w-[26%]", clamp: true, render: (r) => r.company },
              { key: "date", header: "Data", align: "right", width: "w-[18%]", render: (r) => dateBR(r.event_date) },
              { key: "status", header: "Status", width: "w-[30%]", clamp: true, render: (r) => r.status ?? "—" },
              { key: "value", header: "Valor", align: "right", width: "w-[26%]", render: (r) => brl(r.total_value) },
            ]}
            maxHeight="max-h-[460px]"
          />
        </Card>
      </Section>
    </div>
  );
}
