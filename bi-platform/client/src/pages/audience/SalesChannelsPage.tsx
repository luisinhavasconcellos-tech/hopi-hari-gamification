import { BarChart3, DollarSign, ShoppingCart, TrendingUp, Ticket } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Kpi, Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { CHART_COLORS, DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/format";
import { useSalesChannels } from "@/hooks/useSalesChannels";
import { useSalesRevenue } from "@/hooks/useSalesRevenue";
import SalesMeetingPanel from "@/components/audience/SalesMeetingPanel";
import WebsiteSalesPanel from "@/components/audience/WebsiteSalesPanel";


const pct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCompact = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)} mi` : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)} mil` : brl(v);

export default function SalesChannelsPage() {
  const {
    loading,
    byChannel,
    byMonth,
    byYear,
    totalCurrent,
    growth,
    currentYear,
    previousYear,
    hasData,
  } = useSalesChannels();

  const leader = byChannel[0];
  const rising = [...byChannel].filter((c) => c.growth !== null).sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))[0];

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Comercial"
        title="Canais de Venda"
        subtitle={`Mapa de catraca — entradas por canal de venda, ${byYear[0]?.year ?? ""} a ${currentYear}.`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label={`Entradas ${currentYear}`} value={formatNumber(totalCurrent)} icon={<Ticket className="size-4 text-primary" />} />
        <Kpi
          label={`Variação vs ${previousYear}`}
          value={pct(growth)}
          icon={<TrendingUp className="size-4 text-success" />}
          accent={(growth ?? 0) >= 0 ? "success" : undefined}
        />
        <Kpi
          label="Canal líder"
          value={leader ? `${leader.channel} · ${leader.share.toFixed(1)}%` : "—"}
          icon={<ShoppingCart className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Maior crescimento"
          value={rising ? `${rising.channel} ${pct(rising.growth)}` : "—"}
          icon={<BarChart3 className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1 lg:grid-cols-2 items-start">
        <Card>
          <CardTitle title={`Share por canal — ${currentYear}`} />
          {loading ? (
            <ChartSkeleton />
          ) : !hasData ? (
            <EmptyState title="Sem dados de canais carregados" />
          ) : (
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byChannel.filter((c) => c.current > 0)}
                    dataKey="current"
                    nameKey="channel"
                    innerRadius={62}
                    outerRadius={102}
                    paddingAngle={2}
                  >
                    {byChannel
                      .filter((c) => c.current > 0)
                      .map((c, i) => (
                        <Cell key={c.channel} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: number, n: string) => [`${formatNumber(v)} entradas`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 max-h-48 overflow-y-auto pr-1">
                {byChannel
                  .filter((c) => c.current > 0)
                  .map((c, i) => (
                    <div key={c.channel} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="size-2.5 rounded-[3px] shrink-0"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="truncate text-muted-foreground">{c.channel}</span>
                      <span className="ml-auto font-semibold text-foreground tabular-nums">
                        {c.share.toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>


        <Card>
          <CardTitle title={`Entradas por mês — ${previousYear} x ${currentYear}`} />
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name={String(previousYear)} dataKey="anterior" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                <Bar name={String(currentYear)} dataKey="atual" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Evolução anual de entradas" />
          {loading ? (
            <ChartSkeleton height={220} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatNumber(v), "Entradas"]} />
                <Bar dataKey="total" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Detalhe por canal" hint={`Comparação nos mesmos meses de ${previousYear}`} />
          <DataTable
            rows={byChannel}
            rowKey={(r) => r.channel}
            columns={[
              { key: "channel", header: "Canal", render: (r) => r.channel },
              { key: "cur", header: `${currentYear}`, align: "right", render: (r) => formatNumber(r.current) },
              { key: "prev", header: `${previousYear}`, align: "right", render: (r) => formatNumber(r.previous) },
              {
                key: "growth",
                header: "Variação",
                align: "right",
                render: (r) => (
                  <span className={(r.growth ?? 0) >= 0 ? "text-success" : "text-destructive"}>{pct(r.growth)}</span>
                ),
              },
              { key: "share", header: "Share", align: "right", render: (r) => `${r.share.toFixed(1)}%` },
            ]}
          />
        </Card>
      </Section>

      <SalesMeetingPanel />

      <RevenueBlock />
    </div>
  );
}


function RevenueBlock() {
  const rev = useSalesRevenue();

  if (!rev.loading && !rev.hasData) return null;

  return (
    <>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label={`Faturamento ${rev.currentYear}`}
          value={brlCompact(rev.totalCurrent)}
          icon={<DollarSign className="size-4 text-primary" />}
        />
        <Kpi
          label={`vs ${rev.previousYear} (mesmos meses)`}
          value={pct(rev.growth)}
          icon={<TrendingUp className="size-4 text-success" />}
          accent={(rev.growth ?? 0) >= 0 ? "success" : undefined}
        />
        <Kpi
          label="Grupo líder"
          value={rev.byGroup[0] ? `${rev.byGroup[0].group} · ${rev.byGroup[0].share.toFixed(0)}%` : "—"}
          icon={<ShoppingCart className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Canal com maior receita"
          value={rev.byChannel[0] ? `${rev.byChannel[0].channel} · ${brlCompact(rev.byChannel[0].revenue)}` : "—"}
          icon={<BarChart3 className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1 lg:grid-cols-2 items-start">
        <Card>
          <CardTitle title={`Faturamento por grupo — ${rev.currentYear}`} hint="Base de vendas 2023–2026" />
          {rev.loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rev.byGroup} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="group" width={130} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [brl(v), "Faturamento"]} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={26}>
                  {rev.byGroup.map((g, i) => (
                    <Cell key={g.group} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title={`Faturamento por mês — ${rev.previousYear} x ${rev.currentYear}`} />
          {rev.loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rev.byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name={String(rev.previousYear)} dataKey="anterior" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                <Bar name={String(rev.currentYear)} dataKey="atual" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Faturamento por canal" hint={`Comparação nos mesmos meses de ${rev.previousYear}`} />
          <DataTable
            rows={rev.byChannel}
            rowKey={(r) => r.channel}
            maxHeight="max-h-[460px]"
            columns={[
              { key: "channel", header: "Canal", width: "w-[24%]", render: (r) => r.channel },
              { key: "group", header: "Grupo", width: "w-[18%]", render: (r) => r.group },
              { key: "rev", header: `Receita ${rev.currentYear}`, align: "right", width: "w-[16%]", render: (r) => brl(r.revenue) },
              { key: "prev", header: `Receita ${rev.previousYear}`, align: "right", width: "w-[16%]", render: (r) => brl(r.prevRevenue) },
              {
                key: "growth",
                header: "Variação",
                align: "right",
                width: "w-[12%]",
                render: (r) => (
                  <span className={(r.growth ?? 0) >= 0 ? "text-success" : "text-destructive"}>{pct(r.growth)}</span>
                ),
              },
              { key: "share", header: "Share", align: "right", width: "w-[14%]", render: (r) => `${r.share.toFixed(1)}%` },
            ]}
          />
        </Card>
      </Section>

      <WebsiteSalesPanel />
    </>
  );
}
