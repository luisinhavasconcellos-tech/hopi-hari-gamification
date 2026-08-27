import { Briefcase, DollarSign, School, Target } from "lucide-react";
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
import { useDistributors } from "@/hooks/useDistributors";
import { useSchoolPortfolio, SCHOOL_GROUPS } from "@/hooks/useSchoolPortfolio";
import { useBusinessPortfolio } from "@/hooks/useBusinessPortfolio";
import { DistributorDailyPanel } from "@/components/audience/DistributorDailyPanel";
import { DistributorGoalPanel } from "@/components/audience/DistributorGoalPanel";



const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function ChannelsPage() {
  const {
    loading,
    ranking,
    bySegment,
    segmentByMonth,
    byMonth,
    totalQty,
    totalRev,
    prevRev,
    revGrowth,
    goalPct,
    growth,
    avgTicket,
    prevAvgTicket,
    activeCount,
    currentYear,
    previousYear,
    hasData,
  } = useDistributors();


  const top = ranking.slice(0, 12);
  const schools = useSchoolPortfolio();
  const business = useBusinessPortfolio();
  const topSchools = schools.byDistributor.slice(0, 12);

  // Vendas rateadas por tipo de escola (proporcional à carteira de cada distribuidor)
  const salesByGroup = (() => {
    const acc: Record<string, { group: string; quantity: number; revenue: number; schools: number }> =
      Object.fromEntries(
        SCHOOL_GROUPS.map((g) => [g, { group: g, quantity: 0, revenue: 0, schools: 0 }]),
      );
    let matched = 0;
    for (const r of ranking) {
      const carteira = schools.byName.get(r.name.toUpperCase().trim());
      if (!carteira) continue;
      const totalGroupSchools = SCHOOL_GROUPS.reduce((s, g) => s + (carteira.groupSchools[g] ?? 0), 0);
      if (!totalGroupSchools) continue;
      matched += r.quantity;
      for (const g of SCHOOL_GROUPS) {
        const w = (carteira.groupSchools[g] ?? 0) / totalGroupSchools;
        acc[g].quantity += r.quantity * w;
        acc[g].revenue += r.revenue * w;
        acc[g].schools += carteira.groupSchools[g] ?? 0;
      }
    }
    const list = SCHOOL_GROUPS.map((g) => ({
      ...acc[g],
      quantity: Math.round(acc[g].quantity),
      revenue: Math.round(acc[g].revenue),
    }));
    const totalQ = list.reduce((s, r) => s + r.quantity, 0);
    return {
      list: list.map((r) => ({ ...r, share: totalQ ? (r.quantity / totalQ) * 100 : 0 })),
      matched,
      totalQ,
    };
  })();



  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Audience · Comercial"
        title="Distribuidores"
        subtitle={`Volume, faturamento e meta por parceiro — ${currentYear} comparado a ${previousYear}.`}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">

        <Kpi label={`Ingressos ${currentYear}`} value={formatNumber(totalQty)} delta={growth ?? undefined} icon={<Briefcase className="size-4 text-primary" />} />
        <Kpi
          label={`Faturamento ${currentYear}`}
          value={brl(totalRev)}
          delta={revGrowth ?? undefined}
          icon={<DollarSign className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label={`Faturamento ${previousYear} (mesmos meses)`}
          value={brl(prevRev)}
          icon={<DollarSign className="size-4 text-muted-foreground" />}
        />
        <Kpi
          label="Atingimento de meta"
          value={goalPct === null ? "—" : `${goalPct.toFixed(1)}%`}
          icon={<Target className="size-4 text-accent" />}
          accent="accent"
        />
      </div>


      <Section cols="grid-cols-1 lg:grid-cols-2 items-stretch">
        <Card className="flex flex-col">
          <CardTitle
            title="Empresas x Escolas"
            hint="Segmentação pela carteira de atuação de cada distribuidor"
          />
          {loading ? (
            <ChartSkeleton height={220} />
          ) : !hasData ? (
            <EmptyState title="Sem vendas de distribuidores carregadas" />
          ) : (
            <div className="grid flex-1 gap-3 sm:grid-cols-2 items-stretch">
              {bySegment.map((s) => (
                <div key={s.segment} className="flex h-full flex-col rounded-xl border border-border bg-muted/50 p-4">
                  <div className="text-xs leading-snug text-muted-foreground">{s.segment}</div>
                  <div className="mt-1 text-xl sm:text-2xl font-semibold leading-tight tabular-nums">
                    {formatNumber(s.quantity)}
                  </div>
                  <div className="text-[11px] leading-snug text-muted-foreground">
                    {s.share.toFixed(1)}% dos ingressos · {s.activePartners}/{s.partners} parceiros ativos
                  </div>

                  <div className="mt-auto space-y-1.5 pt-3 text-[11px] text-muted-foreground">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0">Faturamento</span>
                      <span className="text-right text-foreground tabular-nums">{brl(s.revenue)}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0">Ticket médio</span>
                      <span className="text-right text-foreground tabular-nums">{brl(s.ticket)}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0">Meta</span>
                      <span className="text-right text-foreground tabular-nums">
                        {s.goalPct === null ? "—" : `${s.goalPct.toFixed(0)}%`}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0">vs {previousYear}</span>
                      <span className={`text-right tabular-nums ${(s.growth ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                        {pct(s.growth)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex flex-col">

          <CardTitle title={`Empresas x Escolas por mês — ${currentYear}`} />
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={segmentByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name="Empresas & Eventos" dataKey="empresas" stackId="s" fill="hsl(var(--chart-4))" />
                <Bar
                  name="Escolas & Varejo regional"
                  dataKey="escolas"
                  stackId="s"
                  fill="hsl(var(--chart-2))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>



      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title={`Vendas por mês — ${currentYear}`}
            hint={`${activeCount} distribuidores ativos · ticket médio ${brl(avgTicket)}`}
          />
          {loading ? (
            <ChartSkeleton />
          ) : !hasData ? (
            <EmptyState title="Sem vendas de distribuidores carregadas" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name={String(previousYear)} dataKey="anterior" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                <Bar name={String(currentYear)} dataKey="quantidade" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Line name="Meta" type="monotone" dataKey="meta" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title={`Faturamento por mês — ${previousYear} x ${currentYear}`}
            hint={`Total ${currentYear} ${brl(totalRev)} vs ${brl(prevRev)} em ${previousYear} (${pct(revGrowth)}) · ticket médio ${brl(avgTicket)} vs ${brl(prevAvgTicket)}`}
          />
          {loading ? (
            <ChartSkeleton />
          ) : !hasData ? (
            <EmptyState title="Sem faturamento de distribuidores carregado" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={(v: number) => compact(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name={String(previousYear)} dataKey="faturamentoAnterior" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                <Bar name={String(currentYear)} dataKey="faturamento" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>



      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title={`Ranking de distribuidores — ${currentYear}`}
            hint="Passe o mouse para ver a carteira de cada parceiro (escolas, redes e municípios atendidos)"
          />
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={170}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
                  stroke="hsl(var(--muted-foreground))"
                />

                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.15)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const r = payload[0].payload as (typeof top)[number];
                    const carteira = schools.byName.get(r.name.toUpperCase().trim());
                    return (
                      <div className="max-w-[280px] rounded-xl border border-border bg-background/95 p-3 text-xs shadow-xl backdrop-blur">
                        <div className="text-sm font-medium text-foreground">{r.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.segment} · {r.region ?? "região não informada"}
                        </div>
                        <div className="mt-2 flex justify-between gap-4">
                          <span className="text-muted-foreground">Ingressos</span>
                          <span className="tabular-nums text-foreground">{formatNumber(r.quantity)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Faturamento</span>
                          <span className="tabular-nums text-foreground">{brl(r.revenue)}</span>
                        </div>
                        {carteira ? (
                          <div className="mt-2 border-t border-border pt-2">
                            <div className="text-muted-foreground">
                              Vende para {formatNumber(carteira.schools)} escolas em {formatNumber(carteira.municipalities)} municípios
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {carteira.networks.map((n) => `${n.network} (${formatNumber(n.schools)})`).join(" · ")}
                            </div>
                            <div className="mt-1 text-[11px] text-foreground/80">
                              Top: {carteira.topMunicipalities.map((m) => `${m.municipality} (${formatNumber(m.schools)})`).join(", ")}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                            Carteira de clientes não mapeada — atende empresas e eventos.
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="quantity" fill="hsl(var(--chart-2))" barSize={16} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>


      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Carteira de distribuidores" hint="Região de atuação, volume, faturamento e meta" />
          <DataTable
            rows={ranking}
            rowKey={(r) => r.key}
            columns={[
              {
                key: "name",
                header: "Distribuidor",
                render: (r) => (
                  <div className="min-w-[200px] max-w-[280px]">
                    <div className="truncate text-foreground">{r.name}</div>
                    <div
                      className="truncate text-[11px] text-muted-foreground"
                      title={r.region ?? "região não informada"}
                    >
                      {r.code ? `${r.code} · ` : ""}
                      {r.region ?? "região não informada"}
                    </div>
                  </div>
                ),
              },
              {
                key: "segment",
                header: "Segmento",
                render: (r) => (
                  <span className="inline-block whitespace-nowrap rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                    {r.segment === "Empresas & Eventos" ? "Empresas" : "Escolas"}
                  </span>
                ),
              },

              { key: "qty", header: `Ingressos ${currentYear}`, align: "right", render: (r) => formatNumber(r.quantity) },

              { key: "rev", header: `Faturamento ${currentYear}`, align: "right", render: (r) => brl(r.revenue) },
              { key: "prevRev", header: `Faturamento ${previousYear}`, align: "right", render: (r) => brl(r.prevRevenue) },
              {
                key: "revGrowth",
                header: "Δ Faturamento",
                align: "right",
                render: (r) => (
                  <span className={(r.revenueGrowth ?? 0) >= 0 ? "text-success" : "text-destructive"}>
                    {pct(r.revenueGrowth)}
                  </span>
                ),
              },
              { key: "ticket", header: "Ticket médio", align: "right", render: (r) => brl(r.ticket) },
              {
                key: "goal",
                header: "Meta",
                align: "right",
                render: (r) => (r.goalPct === null ? "—" : `${r.goalPct.toFixed(0)}%`),
              },
              {
                key: "growth",
                header: `Ingressos vs ${previousYear}`,
                align: "right",
                render: (r) => (
                  <span className={(r.growth ?? 0) >= 0 ? "text-success" : "text-destructive"}>{pct(r.growth)}</span>
                ),
              },

            ]}
          />
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Carteira de escolas"
            hint={`${formatNumber(schools.total)} escolas mapeadas em ${formatNumber(schools.municipalities)} municípios (SP, RJ e MG)`}
          />
          {schools.loading ? (
            <ChartSkeleton height={200} />
          ) : !schools.hasData ? (
            <EmptyState title="Sem carteira de escolas carregada" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <div className="text-xs text-muted-foreground">Escolas com distribuidor</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatNumber(schools.coveredByDistributor)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatNumber(schools.uncovered)} sem carteira definida (RJ/MG)
                </div>
              </div>
              {schools.byState.map((s) => (
                <div key={s.uf} className="rounded-xl border border-border bg-muted/50 p-4">
                  <div className="text-xs text-muted-foreground">{s.uf}</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(s.schools)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatNumber(s.municipalities)} municípios
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1 lg:grid-cols-2 items-stretch">
        <Card className="flex flex-col">
          <CardTitle
            title="Vendas por tipo de escola"
            hint="Ingressos rateados pela composição da carteira de cada distribuidor (municipal, pública estadual/federal e particular)"
          />
          {loading || schools.loading ? (
            <ChartSkeleton />
          ) : !salesByGroup.totalQ ? (
            <EmptyState title="Sem carteira de escolas associada às vendas" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByGroup.list} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="group"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
                  />
                  <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.15)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const r = payload[0].payload as (typeof salesByGroup.list)[number];
                      return (
                        <div className="rounded-xl border border-border bg-background/95 p-3 text-xs shadow-xl backdrop-blur">
                          <div className="text-sm font-medium text-foreground">{r.group}</div>
                          <div className="mt-1 flex justify-between gap-6">
                            <span className="text-muted-foreground">Ingressos</span>
                            <span className="tabular-nums text-foreground">
                              {formatNumber(r.quantity)} ({r.share.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-muted-foreground">Faturamento</span>
                            <span className="tabular-nums text-foreground">{brl(r.revenue)}</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-muted-foreground">Escolas</span>
                            <span className="tabular-nums text-foreground">{formatNumber(r.schools)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--chart-1))" barSize={48} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {salesByGroup.list.map((r) => (
                  <div key={r.group} className="rounded-xl border border-border bg-muted/50 p-3">
                    <div className="line-clamp-1 text-[11px] text-muted-foreground">{r.group}</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">{r.share.toFixed(1)}%</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatNumber(r.quantity)} ingressos · {brl(r.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="flex flex-col">
          <CardTitle title="Escolas por distribuidor" hint="Top 12 carteiras (São Paulo)" />
          {schools.loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={topSchools} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Escolas"]} />
                <Bar dataKey="schools" fill="hsl(var(--chart-4))" barSize={16} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="flex flex-col">
          <CardTitle title="Escolas por rede de ensino" />
          {schools.loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={schools.byNetwork} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="network"
                  width={140}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Escolas"]} />
                <Bar dataKey="schools" fill="hsl(var(--chart-2))" barSize={16} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>


      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Cobertura de escolas por distribuidor" hint="Municípios atendidos, rede predominante e participação na carteira" />
          <DataTable
            rows={schools.byDistributor}
            rowKey={(r) => r.name}
            columns={[
              {
                key: "name",
                header: "Distribuidor",
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <School className="size-3.5 text-muted-foreground" />
                    <span className="text-foreground">{r.name}</span>
                  </div>
                ),
              },
              { key: "schools", header: "Escolas", align: "right", render: (r) => formatNumber(r.schools) },
              { key: "mun", header: "Municípios", align: "right", render: (r) => formatNumber(r.municipalities) },
              { key: "net", header: "Rede predominante", render: (r) => r.topNetwork },
              { key: "priv", header: "% particular", align: "right", render: (r) => `${r.privatePct.toFixed(0)}%` },
              { key: "share", header: "% da carteira", align: "right", render: (r) => `${r.share.toFixed(1)}%` },
            ]}
          />
        </Card>
      </Section>

      <Section cols="grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardTitle
            title="Carteira de empresas por distribuidor"
            hint={`${formatNumber(business.total)} clientes corporativos em ${business.distributors} carteiras`}
          />
          {business.loading ? (
            <ChartSkeleton height={320} />
          ) : !business.hasData ? (
            <EmptyState title="Sem carteira de empresas carregada" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={business.byDistributor}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
                barCategoryGap="28%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  {...tooltipStyle}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof business.byDistributor)[number];
                    return (
                      <div className="rounded-lg border border-border bg-background/95 p-3 text-xs shadow-xl">
                        <div className="font-medium text-foreground">{d.name}</div>
                        <div className="mt-1 text-muted-foreground">
                          {formatNumber(d.clients)} clientes · {d.share.toFixed(1)}% da carteira
                        </div>
                        <div className="mt-2 space-y-0.5 text-muted-foreground">
                          {d.segments.map((s) => (
                            <div key={s.segment}>
                              {s.segment}: {formatNumber(s.clients)}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          Ex.: {d.topClients.slice(0, 3).join(", ")}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="clients" fill="hsl(var(--chart-3))" barSize={16} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title="Clientes por segmento" hint="Empresas, ONGs, sindicatos, PDVs e associações" />
          {business.loading ? (
            <ChartSkeleton height={320} />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={business.bySegment}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
                barCategoryGap="28%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="segment"
                  width={130}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Clientes"]} />
                <Bar dataKey="clients" fill="hsl(var(--chart-4))" barSize={16} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Empresas atendidas por distribuidor" hint="Base cadastral das carteiras corporativas" />
          <DataTable
            rows={business.byDistributor}
            rowKey={(r) => r.name}
            columns={[
              {
                key: "name",
                header: "Distribuidor",
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <Briefcase className="size-3.5 text-muted-foreground" />
                    <span className="text-foreground">{r.name}</span>
                  </div>
                ),
              },
              { key: "clients", header: "Clientes", align: "right", render: (r) => formatNumber(r.clients) },
              { key: "cnpj", header: "Com CNPJ", align: "right", render: (r) => formatNumber(r.withCnpj) },
              { key: "seg", header: "Segmento principal", render: (r) => r.topSegment },
              {
                key: "ex",
                header: "Exemplos",
                render: (r) => (
                  <span className="block max-w-[380px] truncate text-muted-foreground">
                    {r.topClients.slice(0, 3).join(", ")}
                  </span>
                ),
              },
              { key: "share", header: "% da base", align: "right", render: (r) => `${r.share.toFixed(1)}%` },
            ]}
          />
        </Card>
      </Section>

      <DistributorGoalPanel />

      <DistributorDailyPanel />


    </div>

  );
}

