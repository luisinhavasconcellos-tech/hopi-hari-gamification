import { useMemo, useState } from "react";
import { CupSoda, DollarSign, Package, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Kpi, Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { CHART_COLORS, DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/format";
import { useProductMix } from "@/hooks/useSalesRevenue";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)} mi` : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)} mil` : brl(v);

const TABS = [
  { key: "fb", label: "Alimentos & Bebidas", channels: ["A & B"] },
  { key: "merc", label: "Mercadorias", channels: ["MERC", "PLAKA"] },
  { key: "serv", label: "Serviços do parque", channels: ["SERV", "HOPI NIVER"] },
] as const;

export default function ProductsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("fb");
  const active = TABS.find((t) => t.key === tab)!;
  const channels = useMemo(() => [...active.channels], [active]);
  const mix = useProductMix(channels);

  const top = mix.items.filter((i) => i.product !== "OUTROS PRODUTOS").slice(0, 12);
  const chart = [...top].reverse().map((i) => ({ product: i.product, revenue: i.revenue }));

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Operação"
        title="F&B / Produtos"
        subtitle={`Vendas, ticket médio e mix por produto — base de vendas 2023 a ${mix.currentYear}.`}
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
              t.key === tab
                ? "border-primary/50 bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label={`Faturamento ${mix.currentYear}`}
          value={brlCompact(mix.total)}
          icon={<DollarSign className="size-4 text-primary" />}
        />
        <Kpi
          label={`Itens vendidos ${mix.currentYear}`}
          value={formatNumber(Math.round(mix.quantity))}
          icon={<Package className="size-4 text-accent" />}
          accent="accent"
        />
        <Kpi
          label="Ticket médio por item"
          value={brl2(mix.avgTicket)}
          icon={<CupSoda className="size-4 text-success" />}
          accent="success"
        />
        <Kpi
          label="Produto líder"
          value={top[0] ? `${top[0].product} · ${top[0].share.toFixed(1)}%` : "—"}
          icon={<TrendingUp className="size-4 text-muted-foreground" />}
        />
      </div>

      <Section cols="grid-cols-1 lg:grid-cols-2 items-start">
        <Card>
          <CardTitle title={`Top produtos por receita — ${mix.currentYear}`} hint={active.label} />
          {mix.loading ? (
            <ChartSkeleton height={380} />
          ) : !mix.hasData ? (
            <EmptyState title="Sem dados de produtos para este grupo" />
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="product"
                  width={170}
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [brl(v), "Receita"]} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={16}>
                  {chart.map((c, i) => (
                    <Cell key={c.product} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle title={`Receita mês a mês — ${mix.previousYear} x ${mix.currentYear}`} hint={active.label} />
          {mix.loading ? (
            <ChartSkeleton height={380} />
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={mix.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => brl(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name={String(mix.previousYear)} dataKey="anterior" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
                <Bar name={String(mix.currentYear)} dataKey="atual" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Mix de produtos"
            hint={`Top 15 por canal + agrupamento "outros produtos" · comparativo com ${mix.previousYear}`}
          />
          <DataTable
            rows={mix.items}
            rowKey={(r) => r.product}
            maxHeight="max-h-[520px]"
            columns={[
              { key: "product", header: "Produto", width: "w-[34%]", clamp: true, render: (r) => r.product },
              {
                key: "qty",
                header: "Qtde",
                align: "right",
                width: "w-[12%]",
                render: (r) => formatNumber(Math.round(r.quantity)),
              },
              { key: "rev", header: `Receita ${mix.currentYear}`, align: "right", width: "w-[16%]", render: (r) => brl(r.revenue) },
              { key: "price", header: "Preço médio", align: "right", width: "w-[13%]", render: (r) => brl2(r.avgPrice) },
              {
                key: "prev",
                header: `Receita ${mix.previousYear} (ano cheio)`,
                align: "right",
                width: "w-[13%]",
                render: (r) => (r.prevRevenue ? brl(r.prevRevenue) : "—"),
              },
              { key: "share", header: "Share", align: "right", width: "w-[12%]", render: (r) => `${r.share.toFixed(1)}%` },
            ]}
          />
        </Card>
      </Section>
    </div>
  );
}
