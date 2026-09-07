import { useMemo, useState } from "react";
import { DollarSign, ShoppingBag, Gamepad2, Clock, Users, TrendingUp, Database } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Kpi, Card, CardTitle, EmptyState, ChartSkeleton } from "@/components/dashboard/primitives";
import { DataTable, Section, CHART_COLORS, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/format";
import { useParkRevenue, MONTHS_PT } from "@/hooks/useParkRevenue";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const fmtDate = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—";

const monthLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MONTHS_PT[Number(mm) - 1]}/${y.slice(2)}`;
};

export default function PerCapitaPage() {
  const {
    loading,
    perCapita,
    outlets: outletRows,
    flow,
    categories,
    byCategory,
    monthlyPerCapita,
    dailySeries,
    outletRanking,
    hourlyCurve,
    flowDays,
    peakHour,
    publicByYear,
    publicMonthly,
    totalRevenue,
    range,
  } = useParkRevenue();

  const [outletKind, setOutletKind] = useState<"todos" | "loja" | "jogo">("todos");

  const outlets = useMemo(
    () => (outletKind === "todos" ? outletRanking : outletRanking.filter((o) => o.kind === outletKind)),
    [outletRanking, outletKind],
  );

  const abPerCapita = byCategory.find((c) => c.category === "A&B")?.perCapita ?? null;
  const totalPerCapita = useMemo(() => {
    const rev = byCategory.reduce((s, c) => s + c.revenue, 0);
    const pub = byCategory.reduce((s, c) => s + c.publicSum, 0);
    return pub ? rev / pub : null;
  }, [byCategory]);

  /** Data de corte entre a base histórica e os novos dados carregados. */
  const cutOptions = useMemo(() => {
    const dates = [...new Set(perCapita.map((r) => r.date))].sort();
    if (dates.length === 0) return [] as string[];
    const months = [...new Set(dates.map((d) => `${d.slice(0, 7)}-01`))];
    return months.slice(1, -1);
  }, [perCapita]);

  const [cutDate, setCutDate] = useState<string | null>(null);
  const effectiveCut = cutDate ?? cutOptions[Math.floor(cutOptions.length / 2)] ?? null;

  /** Per capita médio ponderado antes e depois do corte, por categoria. */
  const beforeAfter = useMemo(() => {
    if (!effectiveCut) return [];
    const agg = new Map<string, { bRev: number; bPub: number; bDays: number; aRev: number; aPub: number; aDays: number }>();
    for (const r of perCapita) {
      const e = agg.get(r.category) ?? { bRev: 0, bPub: 0, bDays: 0, aRev: 0, aPub: 0, aDays: 0 };
      const rev = Number(r.revenue) || 0;
      const pub = Number(r.public) || 0;
      if (r.date < effectiveCut) {
        e.bRev += rev;
        e.bPub += pub;
        e.bDays += 1;
      } else {
        e.aRev += rev;
        e.aPub += pub;
        e.aDays += 1;
      }
      agg.set(r.category, e);
    }
    return [...agg]
      .map(([category, e]) => {
        const before = e.bPub ? e.bRev / e.bPub : null;
        const after = e.aPub ? e.aRev / e.aPub : null;
        return {
          category,
          before,
          after,
          beforeDays: e.bDays,
          afterDays: e.aDays,
          delta: before && after ? after - before : null,
          deltaPct: before && after ? ((after - before) / before) * 100 : null,
        };
      })
      .sort((a, b) => (b.after ?? 0) - (a.after ?? 0));
  }, [perCapita, effectiveCut]);

  const totalBeforeAfter = useMemo(() => {
    if (!effectiveCut) return null;
    let bRev = 0, bPub = 0, aRev = 0, aPub = 0;
    for (const r of perCapita) {
      const rev = Number(r.revenue) || 0;
      const pub = Number(r.public) || 0;
      if (r.date < effectiveCut) { bRev += rev; bPub += pub; } else { aRev += rev; aPub += pub; }
    }
    const before = bPub ? bRev / bPub : null;
    const after = aPub ? aRev / aPub : null;
    return {
      before,
      after,
      deltaPct: before && after ? ((after - before) / before) * 100 : null,
    };
  }, [perCapita, effectiveCut]);

  /** Impacto de cada fonte carregada: volume, cobertura e peso na análise. */
  const sourceImpact = useMemo(() => {
    const cover = (dates: string[]) => {
      const s = dates.filter(Boolean).sort();
      return s.length ? `${fmtDate(s[0])} – ${fmtDate(s[s.length - 1])}` : "—";
    };
    const rows = [
      {
        source: "Per capita diário",
        rows: perCapita.length,
        coverage: cover(perCapita.map((r) => r.date)),
        metric: totalPerCapita ? `${brl2(totalPerCapita)} / visitante` : "—",
        feeds: "Per capita, receita por categoria, tendências mensais",
      },
      {
        source: "Receita por ponto de venda",
        rows: outletRows.length,
        coverage: cover(outletRows.map((r) => r.date)),
        metric: `${outletRanking.length} pontos · ${brl(outletRanking.reduce((s, o) => s + o.revenue, 0))}`,
        feeds: "Ranking de lojas e jogos",
      },
      {
        source: "Fluxo de portaria",
        rows: flow.length,
        coverage: cover(flow.map((r) => r.date)),
        metric: peakHour ? `Pico ${peakHour.label} · ${formatNumber(peakHour.entries)}/h` : "—",
        feeds: "Curva horária de entradas e saídas",
      },
      {
        source: "Público mensal histórico",
        rows: publicMonthly.length,
        coverage: publicByYear.length
          ? `${publicByYear[0].year} – ${publicByYear[publicByYear.length - 1].year}`
          : "—",
        metric: `${formatNumber(publicMonthly.reduce((s, r) => s + r.visitors, 0))} visitantes`,
        feeds: "Público anual e média por dia aberto",
      },
    ];
    const total = rows.reduce((s, r) => s + r.rows, 0) || 1;
    return rows.map((r) => ({ ...r, share: (r.rows / total) * 100 })).sort((a, b) => b.rows - a.rows);
  }, [perCapita, outletRows, outletRanking, flow, publicMonthly, publicByYear, peakHour, totalPerCapita]);

  const lastYears = useMemo(() => publicByYear.filter((y) => y.year >= 2015), [publicByYear]);

  const dailyChart = useMemo(
    () =>
      dailySeries.slice(-120).map((d) => ({
        ...d,
        label: new Date(`${String(d.date)}T12:00:00`).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
      })),
    [dailySeries],
  );


  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Receita no parque"
        title="Per Capita & Consumo"
        subtitle={`Receita por visitante em A&B, Mercadorias e Jogos — dados de ${fmtDate(range.first)} a ${fmtDate(range.last)}. A cobertura varia por categoria.`}
      />

      {byCategory.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {byCategory.map((c) => (
            <span
              key={c.category}
              className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"
            >
              {c.category}: {fmtDate(c.firstDate)} – {fmtDate(c.lastDate)} · {c.days} dias
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Receita registrada"
          value={brl(totalRevenue)}
          icon={<DollarSign className="size-4 text-primary" />}
        />
        <Kpi
          label="Per capita total"
          value={totalPerCapita ? brl2(totalPerCapita) : "—"}
          icon={<TrendingUp className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Per capita A&B"
          value={abPerCapita ? brl2(abPerCapita) : "—"}
          icon={<ShoppingBag className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label={peakHour ? `Pico de entrada (${peakHour.label})` : "Pico de entrada"}
          value={peakHour ? `${formatNumber(peakHour.entries)}/h` : "—"}
          icon={<Clock className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle title="Per capita antes x depois dos novos dados" />
            {cutOptions.length > 0 && (
              <select
                value={effectiveCut ?? ""}
                onChange={(e) => setCutDate(e.target.value)}
                className="rounded-md bg-muted/60 border border-border px-2 py-1 text-xs"
              >
                {cutOptions.map((c) => (
                  <option key={c} value={c} className="bg-background">
                    corte em {monthLabel(c.slice(0, 7))}
                  </option>
                ))}
              </select>
            )}
          </div>
          {loading ? (
            <ChartSkeleton />
          ) : beforeAfter.length === 0 ? (
            <EmptyState title="Sem base suficiente para comparar" />
          ) : (
            <>
              {totalBeforeAfter && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Antes</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {totalBeforeAfter.before ? brl2(totalBeforeAfter.before) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Depois</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {totalBeforeAfter.after ? brl2(totalBeforeAfter.after) : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Variação</p>
                    <p
                      className={`text-lg font-semibold tabular-nums ${
                        (totalBeforeAfter.deltaPct ?? 0) >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {totalBeforeAfter.deltaPct != null
                        ? `${totalBeforeAfter.deltaPct >= 0 ? "+" : ""}${totalBeforeAfter.deltaPct.toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-3">
                <DataTable
                  rows={beforeAfter}
                  rowKey={(r) => r.category}
                  columns={[
                    { key: "c", header: "Categoria", render: (r) => r.category },
                    {
                      key: "b",
                      header: "Antes",
                      align: "right",
                      render: (r) => (r.before ? brl2(r.before) : "—"),
                    },
                    {
                      key: "a",
                      header: "Depois",
                      align: "right",
                      render: (r) => (r.after ? brl2(r.after) : "—"),
                    },
                    {
                      key: "d",
                      header: "Δ %",
                      align: "right",
                      render: (r) =>
                        r.deltaPct == null ? (
                          "—"
                        ) : (
                          <span className={r.deltaPct >= 0 ? "text-success" : "text-destructive"}>
                            {r.deltaPct >= 0 ? "+" : ""}
                            {r.deltaPct.toFixed(1)}%
                          </span>
                        ),
                    },
                    {
                      key: "n",
                      header: "Dias",
                      align: "right",
                      render: (r) => `${r.beforeDays} / ${r.afterDays}`,
                    },
                  ]}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Per capita ponderado (receita ÷ público) em cada janela. "Dias" mostra a quantidade de
                lançamentos antes / depois do corte — janelas muito curtas tornam a variação instável.
              </p>
            </>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Impacto das fontes carregadas" />
          {loading ? (
            <ChartSkeleton />
          ) : (
            <div className="mt-2">
              <DataTable
                rows={sourceImpact}
                rowKey={(r) => r.source}
                columns={[
                  {
                    key: "s",
                    header: "Fonte",
                    width: "w-[32%]",
                    clamp: true,
                    render: (r) => (
                      <span className="flex items-center gap-2">
                        <Database className="size-3.5 text-primary shrink-0" />
                        {r.source}
                      </span>
                    ),
                  },
                  { key: "r", header: "Registros", align: "right", render: (r) => formatNumber(r.rows) },
                  { key: "sh", header: "Peso", align: "right", render: (r) => `${r.share.toFixed(1)}%` },
                  { key: "cv", header: "Cobertura", render: (r) => r.coverage },
                  { key: "m", header: "Indicador gerado", clamp: true, render: (r) => r.metric },
                ]}
              />
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {sourceImpact.map((s) => (
                  <li key={s.source}>
                    <span className="text-foreground">{s.source}:</span> alimenta {s.feeds.toLowerCase()}.
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </Section>



      <Section cols="grid-cols-1 lg:grid-cols-3">
        {byCategory.map((c, i) => (
          <Card key={c.category}>
            <CardTitle title={c.category} />
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {c.perCapita ? brl2(c.perCapita) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">per capita médio</p>
              </div>
              <div className="text-right">
                <p className="text-sm tabular-nums">{brl(c.revenue)}</p>
                <p className="text-xs text-muted-foreground">
                  {c.days} dias{c.penetration ? ` · ${c.penetration.toFixed(2)} itens/visitante` : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (c.revenue / (byCategory[0]?.revenue || 1)) * 100)}%`,
                  background: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
            </div>
          </Card>
        ))}
      </Section>

      <Section>
        <Card>
          <CardTitle title="Per capita médio por mês" />
          {loading ? (
            <ChartSkeleton />
          ) : monthlyPerCapita.length === 0 ? (
            <EmptyState title="Sem dados de per capita" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyPerCapita.map((m) => ({ ...m, label: monthLabel(String(m.month)) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [brl2(Number(v)), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {categories.map((c, i) => (
                  <Line
                    key={c}
                    type="monotone"
                    dataKey={c}
                    name={c}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title="Receita diária por categoria (últimos 120 dias)" />
          {loading ? (
            <ChartSkeleton />
          ) : dailyChart.length === 0 ? (
            <EmptyState title="Sem lançamentos diários" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={9} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [brl(Number(v)), String(name).replace("_rev", "")]}
                />
                {categories.map((c, i) => (
                  <Area
                    key={c}
                    type="monotone"
                    dataKey={`${c}_rev`}
                    name={c}
                    stackId="1"
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={0.25}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <CardTitle title="Ranking de lojas e jogos" />
            <div className="flex gap-1">
              {(["todos", "loja", "jogo"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setOutletKind(k)}
                  className={`px-2.5 py-1 rounded-md text-xs capitalize transition-colors ${
                    outletKind === k ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <ChartSkeleton />
          ) : outlets.length === 0 ? (
            <EmptyState title="Sem receita por ponto de venda" />
          ) : (
            <div className="mt-2">
              <DataTable
                maxHeight="max-h-[360px]"
                rows={outlets}
                rowKey={(r) => r.outlet}
                columns={[
                  {
                    key: "outlet",
                    header: "Ponto de venda",
                    width: "w-[40%]",
                    clamp: true,
                    render: (r) => (
                      <span className="flex items-center gap-2">
                        {r.kind === "jogo" ? (
                          <Gamepad2 className="size-3.5 text-accent shrink-0" />
                        ) : (
                          <ShoppingBag className="size-3.5 text-primary shrink-0" />
                        )}
                        {r.outlet.replace("Jogo · ", "")}
                      </span>
                    ),
                  },
                  { key: "rev", header: "Receita", align: "right", render: (r) => brl(r.revenue) },
                  { key: "day", header: "Média/dia", align: "right", render: (r) => brl(r.avgDay) },
                  { key: "share", header: "Share", align: "right", render: (r) => `${r.share.toFixed(1)}%` },
                ]}
              />
            </div>
          )}
        </Card>

        <Card>
          <CardTitle title="Fluxo médio de portaria por hora" />
          <p className="text-xs text-muted-foreground mt-1">
            Média por hora considerando {formatNumber(flowDays)} dias de operação registrados.
          </p>
          {loading ? (
            <ChartSkeleton />
          ) : hourlyCurve.length === 0 ? (
            <EmptyState title="Sem dados de portaria" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="entries" name="Entradas" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="exits" name="Saídas" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Público anual e média por dia de operação" />
          {loading ? (
            <ChartSkeleton />
          ) : lastYears.length === 0 ? (
            <EmptyState title="Sem histórico de público" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={lastYears}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="visitors" name="Público" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgPerOpenDay" name="Média/dia aberto" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3">
                <DataTable
                  maxHeight="max-h-[240px]"
                  rows={[...lastYears].reverse()}
                  rowKey={(r) => String(r.year)}
                  columns={[
                    {
                      key: "y",
                      header: "Ano",
                      render: (r) => (
                        <span className="flex items-center gap-2">
                          <Users className="size-3.5 text-muted-foreground" />
                          {r.year}
                        </span>
                      ),
                    },
                    { key: "v", header: "Público", align: "right", render: (r) => formatNumber(r.visitors) },
                    { key: "d", header: "Dias abertos", align: "right", render: (r) => (r.openDays ? formatNumber(r.openDays) : "—") },
                    {
                      key: "a",
                      header: "Média/dia",
                      align: "right",
                      render: (r) => (r.avgPerOpenDay ? formatNumber(r.avgPerOpenDay) : "—"),
                    },
                  ]}
                />
              </div>
            </>
          )}
        </Card>
      </Section>
    </div>
  );
}
