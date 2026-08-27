import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart, MessageCircle, Eye, Users, Sparkles, BarChart3, RefreshCw,
  Store, Layers, Filter, UserCircle, Package, Star, MapPin, CalendarDays,
  Calendar, Megaphone, Activity, Award, Ticket, MessageSquareWarning,
  Fingerprint, ScrollText, Settings, Target, Smile,
  DollarSign,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import {
  PageHeader,
  Kpi,
  Card,
  CardTitle,
  KpiSkeleton,
  ChartSkeleton,
  EmptyState,
  chartTooltipStyle,
} from "@/components/dashboard/primitives";
import { formatNumber, formatPct } from "@/lib/mock-data";
import { fetchFollowerCount } from "@/lib/followers";

const SECTION_SUMMARY = [
  { to: "/audience/channels", label: "Distribuidores", icon: Store, description: "Escolas, varejo e empresas que revendem ingressos." },
  { to: "/audience/sales-channels", label: "Canais de Venda", icon: Layers, description: "Receita por canal, produto e evolução mensal." },
  { to: "/audience/funnel", label: "Funil de Vendas", icon: Filter, description: "Prospecção, negociação e fechamento de eventos B2B." },
  { to: "/audience/visitors", label: "Cadastros", icon: Users, description: "Volume diário e histórico de cadastros de clientes." },
  { to: "/audience/profile", label: "Perfil Consumidor", icon: UserCircle, description: "Geografia, idade e perfil digital da base." },
  { to: "/audience/segments", label: "Segmentos", icon: Layers, description: "Recortes por faixa etária, região e canal." },
  { to: "/audience/percapita", label: "Per Capita & Consumo", icon: DollarSign, description: "Receita por visitante em A&B, mercadorias e jogos." },
  { to: "/audience/products", label: "F&B / Produtos", icon: Package, description: "Mix de produtos, ticket médio e receita por categoria." },
  { to: "/audience/attractions", label: "Atrações", icon: Star, description: "Embarques por atração e sazonalidade do parque." },
  { to: "/audience/heatmaps", label: "Heatmaps", icon: MapPin, description: "Concentração de cadastros por hora e dia." },
  { to: "/audience/weekdays", label: "Dias da Semana", icon: CalendarDays, description: "Comportamento por dia útil e fim de semana." },
  { to: "/audience/events", label: "Eventos", icon: Calendar, description: "Agenda do parque e insights por evento." },
  { to: "/audience/campaigns", label: "Campanhas", icon: Megaphone, description: "Impacto das campanhas no ganho de seguidores." },
  { to: "/audience/influencers", label: "Influenciadores", icon: Activity, description: "Descoberta de perfis por plataforma e nicho." },
  { to: "/audience/loyalty", label: "Fidelidade", icon: Award, description: "Clube, retenção, churn e LTV." },
  { to: "/audience/insights", label: "AI Insights", icon: Sparkles, description: "Leituras automáticas geradas por IA." },
  { to: "/audience/operations", label: "Operacional", icon: Ticket, description: "Capacidade, filas e uptime das operações." },
  { to: "/audience/reputation", label: "Reputação", icon: MessageSquareWarning, description: "ReclameAqui e TripAdvisor — sentimento e resposta." },
  { to: "/audience/identity", label: "Identidade & LGPD", icon: Fingerprint, description: "Consentimento e pseudonimização da base." },
  { to: "/audience/transparency", label: "Transparência de Dados", icon: ScrollText, description: "Logs de auditoria e políticas de retenção." },
  { to: "/audience/admin", label: "Admin", icon: Settings, description: "Estado das integrações e fontes de dados." },
];




type RecentPost = {
  id: string;
  shortcode: string | null;
  post_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  like_count: number | null;
  comments_count: number | null;
  view_count: number | null;
  media_type: string | null;
  timestamp: string | null;
};

type EngagementRow = {
  like_count: number | null;
  comments_count: number | null;
  view_count: number | null;
};

type MonthlyPoint = {
  month: string;
  posts: number;
  likes: number;
  comments: number;
  views: number;
};

export type SalesPoint = {
  key: string;
  month: string;
  revenue: number;
  quantity: number;
  goal: number;
  distRevenue: number;
  attainment: number | null;
  reviews: number;
  positives: number;
  negatives: number;
  sentiment: number | null; // % positivas
  prevRevenue: number; // mesmo mês do ano anterior
  prevQuantity: number;
  yoyPct: number | null;
  yoyDiff: number;
};


const monthLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");

const monthKeyLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return monthLabel(new Date(y, (m ?? 1) - 1, 1));
};

const CACHE_KEY = "audience-overview-cache-v5";
const CACHE_TTL_MS = 10 * 60 * 1000;

type PrevTotals = { revenue: number; quantity: number };

type CachePayload = {
  cachedAt: number;
  followers: number | null;
  recent: RecentPost[];
  engagement: EngagementRow[];
  monthly: MonthlyPoint[];
  sales: SalesPoint[];
  prevTotals: PrevTotals;
};


const readCache = (): CachePayload | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed?.cachedAt || Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

export default function AudienceIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [followers, setFollowers] = useState<number | null>(null);
  const [recent, setRecent] = useState<RecentPost[]>([]);
  const [engagement, setEngagement] = useState<EngagementRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [prevTotals, setPrevTotals] = useState<PrevTotals>({ revenue: 0, quantity: 0 });


  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = readCache();
      if (cached) {
        setFollowers(cached.followers);
        setRecent(cached.recent);
        setEngagement(cached.engagement);
        setMonthly(cached.monthly);
        setSales(cached.sales ?? []);
        setPrevTotals(cached.prevTotals ?? { revenue: 0, quantity: 0 });
        setCachedAt(cached.cachedAt);
        setFromCache(true);
        setLoading(false);
        return;
      }
    }


    force ? setRefreshing(true) : setLoading(true);

    const [
      igFollowers,
      { data: posts },
      { data: rows },
      { data: timeline },
      { data: revenueRows },
      { data: goalRows },
      { data: reviewRows },
    ] = await Promise.all([
        fetchFollowerCount("instagram"),
        supabase
          .from("instagram_posts")
          .select(
            "id, shortcode, post_url, thumbnail_url, caption, like_count, comments_count, view_count, media_type, timestamp",
          )
          .eq("scrape_status", "scraped")
          .order("timestamp", { ascending: false, nullsFirst: false })
          .limit(6),
        supabase
          .from("instagram_posts")
          .select("like_count, comments_count, view_count")
          .eq("scrape_status", "scraped")
          .order("timestamp", { ascending: false, nullsFirst: false })
          .limit(60),
        supabase
          .from("instagram_posts")
          .select("timestamp, like_count, comments_count, view_count")
          .eq("scrape_status", "scraped")
          .not("timestamp", "is", null)
          .order("timestamp", { ascending: true })
          .limit(1000),
        supabase
          .from("sales_revenue_monthly")
          .select("year, month, revenue, quantity")
          .order("year", { ascending: true })
          .limit(5000),
        supabase
          .from("distributor_sales_monthly")
          .select("year, month, quantity, revenue, goal_quantity")
          .order("year", { ascending: true })
          .limit(5000),
        supabase
          .from("reputation_reviews")
          .select("published_at, sentiment")
          .not("published_at", "is", null)
          .order("published_at", { ascending: true })
          .limit(5000),
      ]);

    // agrupar por mês
    const buckets = new Map<string, MonthlyPoint>();
    (timeline ?? []).forEach((r: any) => {
      if (!r.timestamp) return;
      const d = new Date(r.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur =
        buckets.get(key) ??
        ({ month: monthLabel(d), posts: 0, likes: 0, comments: 0, views: 0 } as MonthlyPoint);
      cur.posts += 1;
      cur.likes += Math.max(0, r.like_count ?? 0);
      cur.comments += Math.max(0, r.comments_count ?? 0);
      cur.views += Math.max(0, r.view_count ?? 0);
      buckets.set(key, cur);
    });
    const series = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([, v]) => v);

    // ---- Vendas × Metas × Sentimento (mensal) ----
    const salesMap = new Map<string, SalesPoint>();
    const ensure = (key: string): SalesPoint => {
      const cur =
        salesMap.get(key) ??
        ({
          key,
          month: monthKeyLabel(key),
          revenue: 0,
          quantity: 0,
          goal: 0,
          distRevenue: 0,
          attainment: null,
          reviews: 0,
          positives: 0,
          negatives: 0,
          sentiment: null,
        } as SalesPoint);
      salesMap.set(key, cur);
      return cur;
    };
    const mk = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

    (revenueRows ?? []).forEach((r: any) => {
      const cur = ensure(mk(r.year, r.month));
      cur.revenue += Number(r.revenue ?? 0);
      cur.quantity += Number(r.quantity ?? 0);
    });

    // meta de receita: meta de volume × ticket médio do distribuidor no mês
    (goalRows ?? []).forEach((r: any) => {
      const qty = Number(r.quantity ?? 0);
      const rev = Number(r.revenue ?? 0);
      const cur = ensure(mk(r.year, r.month));
      cur.distRevenue += rev;
      const goalQty = Number(r.goal_quantity ?? 0);
      const ticket = qty > 0 ? rev / qty : 0;
      if (goalQty && ticket) cur.goal += goalQty * ticket;
    });

    (reviewRows ?? []).forEach((r: any) => {
      const d = new Date(r.published_at);
      const cur = ensure(mk(d.getFullYear(), d.getMonth() + 1));
      cur.reviews += 1;
      if (r.sentiment === "positivo") cur.positives += 1;
      if (r.sentiment === "negativo") cur.negatives += 1;
    });

    const allSales = Array.from(salesMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    const byKey = new Map(allSales.map((p) => [p.key, p]));
    const prevKey = (key: string) => {
      const [y, m] = key.split("-");
      return `${Number(y) - 1}-${m}`;
    };

    const salesSeries = allSales.slice(-12).map((p) => {
      const prev = byKey.get(prevKey(p.key));
      const prevRevenue = prev?.revenue ?? 0;
      const prevQuantity = prev?.quantity ?? 0;
      return {
        ...p,
        attainment: p.goal > 0 ? (p.distRevenue / p.goal) * 100 : null,
        sentiment: p.reviews > 0 ? (p.positives / p.reviews) * 100 : null,
        prevRevenue,
        prevQuantity,
        yoyPct: prevRevenue > 0 ? ((p.revenue - prevRevenue) / prevRevenue) * 100 : null,
        yoyDiff: p.revenue - prevRevenue,
      };
    });

    // YoY comparável: soma apenas os meses do ano anterior que existem
    // para os mesmos meses da janela atual (evita comparar meses sem planilha).
    const prevTotalsCalc: PrevTotals = {
      revenue: salesSeries.reduce((s, p) => s + p.prevRevenue, 0),
      quantity: salesSeries.reduce((s, p) => s + p.prevQuantity, 0),
    };

    const payload: CachePayload = {
      cachedAt: Date.now(),
      followers: igFollowers || null,
      recent: (posts ?? []) as RecentPost[],
      engagement: (rows ?? []) as EngagementRow[],
      monthly: series,
      sales: salesSeries,
      prevTotals: prevTotalsCalc,
    };


    setFollowers(payload.followers);
    setRecent(payload.recent);
    setEngagement(payload.engagement);
    setMonthly(payload.monthly);
    setSales(payload.sales);
    setPrevTotals(payload.prevTotals);
    setCachedAt(payload.cachedAt);
    setFromCache(false);

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      /* quota — segue sem cache */
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  // Aggregations
  const totalLikes = engagement.reduce((s, r) => s + Math.max(0, r.like_count ?? 0), 0);
  const totalComments = engagement.reduce((s, r) => s + Math.max(0, r.comments_count ?? 0), 0);
  const totalViews = engagement.reduce((s, r) => s + Math.max(0, r.view_count ?? 0), 0);
  const sample = engagement.length;
  const avgLikes = sample ? totalLikes / sample : 0;
  const engagementRate =
    followers && sample
      ? ((totalLikes + totalComments) / sample / followers)
      : 0;

  const hasAnyData = sample > 0;

  // Vendas / metas / sentimento — sempre ligados aos meses realmente importados
  const salesRevenue = sales.reduce((s, p) => s + p.revenue, 0);
  const salesQty = sales.reduce((s, p) => s + p.quantity, 0);
  const avgTicket = salesQty > 0 ? salesRevenue / salesQty : null;

  // Meta: só considera meses com meta cadastrada na planilha de distribuidores
  const goalMonths = sales.filter((p) => p.goal > 0);
  const salesGoal = goalMonths.reduce((s, p) => s + p.goal, 0);
  const salesDistRevenue = goalMonths.reduce((s, p) => s + p.distRevenue, 0);
  const attainment = salesGoal > 0 ? (salesDistRevenue / salesGoal) * 100 : null;
  const goalPeriod = goalMonths.length
    ? `${goalMonths[0].month} – ${goalMonths[goalMonths.length - 1].month}`
    : null;

  // Sentimento: apenas meses com avaliações importadas
  const reviewMonths = sales.filter((p) => p.reviews > 0);
  const totalReviews = reviewMonths.reduce((s, p) => s + p.reviews, 0);
  const totalPositives = reviewMonths.reduce((s, p) => s + p.positives, 0);
  const totalNegatives = reviewMonths.reduce((s, p) => s + p.negatives, 0);
  const positiveShare = totalReviews > 0 ? (totalPositives / totalReviews) * 100 : null;
  const sentimentPeriod = reviewMonths.length
    ? `${reviewMonths[0].month} – ${reviewMonths[reviewMonths.length - 1].month}`
    : null;

  // YoY — compara apenas os meses que também existem no ano anterior
  const comparable = sales.filter((p) => p.prevRevenue > 0);
  const compRevenue = comparable.reduce((s, p) => s + p.revenue, 0);
  const compQty = comparable.reduce((s, p) => s + p.quantity, 0);
  const revenueYoyPct =
    prevTotals.revenue > 0 ? ((compRevenue - prevTotals.revenue) / prevTotals.revenue) * 100 : null;
  const revenueYoyDiff = compRevenue - prevTotals.revenue;
  const qtyYoyPct =
    prevTotals.quantity > 0 ? ((compQty - prevTotals.quantity) / prevTotals.quantity) * 100 : null;
  const qtyYoyDiff = compQty - prevTotals.quantity;
  const yoyPeriod = comparable.length
    ? `${comparable[0].month} – ${comparable[comparable.length - 1].month}`
    : null;

  const compactBRL = (v: number) =>
    Math.abs(v) >= 1_000_000
      ? `R$ ${(v / 1_000_000).toFixed(1)}M`
      : Math.abs(v) >= 1_000
        ? `R$ ${(v / 1_000).toFixed(0)}k`
        : `R$ ${Math.round(v)}`;

  const signedBRL = (v: number) => `${v >= 0 ? "+" : "−"}${compactBRL(Math.abs(v))}`;
  const signedNum = (v: number) =>
    `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v)).toLocaleString("pt-BR")}`;



  return (
    <div className="px-5 lg:px-8 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Audience · Visão geral"
          title="Audience Intelligence"
          subtitle="Vendas, metas e sentimento — calculados diretamente sobre os meses importados das planilhas."
        />
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            {cachedAt
              ? `${fromCache ? "Cache" : "Atualizado"} · ${new Date(cachedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
              : "Carregando…"}
          </span>
          <button
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>


      {/* KPIs — vendas, metas e sentimento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <Kpi
              label={`Receita${sales.length ? ` (${sales[0].month} – ${sales[sales.length - 1].month})` : ""}`}
              value={salesRevenue ? compactBRL(salesRevenue) : "—"}
              delta={revenueYoyPct ?? undefined}
              deltaLabel={
                revenueYoyPct != null
                  ? `${signedBRL(revenueYoyDiff)} · ${yoyPeriod ?? ""} vs. mesmos meses do ano anterior`
                  : undefined
              }
              icon={<DollarSign className="size-4 text-primary" />}
            />

            <Kpi
              label={`Meta distribuidores${goalPeriod ? ` (${goalPeriod})` : ""}`}
              value={attainment != null ? `${attainment.toFixed(1)}%` : "—"}
              icon={<Target className="size-4 text-accent" />}
              accent="accent"
            />
            <Kpi
              label="Ticket médio"
              value={avgTicket ? `R$ ${avgTicket.toFixed(2)}` : "—"}
              deltaLabel={salesQty ? `${Math.round(salesQty).toLocaleString("pt-BR")} itens vendidos` : undefined}
              icon={<Ticket className="size-4 text-warning" />}
              accent="warning"
            />
            <Kpi
              label={`Sentimento positivo${sentimentPeriod ? ` (${sentimentPeriod})` : ""}`}
              value={positiveShare != null ? `${positiveShare.toFixed(0)}%` : "—"}
              deltaLabel={
                totalReviews
                  ? `${totalReviews} avaliações · ${totalNegatives} negativas`
                  : undefined
              }
              icon={<Smile className="size-4 text-success" />}
              accent="success"
            />
          </>
        )}
      </div>

      {/* Vendas x metas x sentimento */}
      <div className="mt-6">
        <Card>
          <CardTitle
            title="Vendas, metas e sentimento"
            hint="Receita realizada vs. meta (barras) e % de avaliações positivas (linha) — meses presentes nas planilhas importadas"
          />
          {loading ? (
            <ChartSkeleton height={320} />
          ) : sales.length === 0 ? (
            <EmptyState
              title="Sem dados de vendas ainda"
              description="Quando houver receita mensal e metas cadastradas, o comparativo aparece aqui."
              icon={<BarChart3 className="size-5" />}
            />
          ) : (
            <div className="h-[340px]">
              <ResponsiveContainer>
                <ComposedChart data={sales}>
                  <CartesianGrid strokeDasharray="3 6" stroke="hsl(0 0% 100% / 0.06)" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => compactBRL(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v: number, name: string) =>
                      name.includes("%")
                        ? [`${Number(v).toFixed(0)}%`, name]
                        : [
                            Number(v).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              maximumFractionDigits: 0,
                            }),
                            name,
                          ]
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    yAxisId="left"
                    name="Receita realizada"
                    dataKey="revenue"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <Bar
                    yAxisId="left"
                    name="Receita distribuidores"
                    dataKey={(p: SalesPoint) => (p.distRevenue > 0 ? p.distRevenue : null)}
                    fill="hsl(var(--chart-3))"
                    radius={[4, 4, 0, 0]}
                    barSize={14}
                  />
                  <Bar
                    yAxisId="left"
                    name="Meta distribuidores"
                    dataKey={(p: SalesPoint) => (p.goal > 0 ? p.goal : null)}
                    fill="hsl(var(--chart-4))"
                    fillOpacity={0.45}
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    name="Avaliações positivas (%)"
                    dataKey="sentiment"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Meta estimada a partir das metas de volume dos distribuidores × ticket médio do mês (comparada com a receita do próprio canal distribuidor).
            Sentimento vem das avaliações do ReclameAqui e TripAdvisor classificadas por IA.
          </p>
        </Card>
      </div>

      {/* YoY mensal */}
      {!loading && sales.some((p) => p.prevRevenue > 0) && (
        <div className="mt-6">
          <Card>
            <CardTitle
              title="Crescimento ano a ano (YoY)"
              hint="Receita de cada mês comparada com o mesmo mês do ano anterior"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Mês</th>
                    <th className="py-2 pr-3 font-medium text-right">Receita</th>
                    <th className="py-2 pr-3 font-medium text-right">Ano anterior</th>
                    <th className="py-2 pr-3 font-medium text-right">Diferença</th>
                    <th className="py-2 font-medium text-right">% YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((p) => (
                    <tr key={p.key} className="border-t border-border/60">
                      <td className="py-2 pr-3 text-foreground">{p.month}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{compactBRL(p.revenue)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                        {p.prevRevenue > 0 ? compactBRL(p.prevRevenue) : "—"}
                      </td>
                      <td
                        className={`py-2 pr-3 text-right tabular-nums ${
                          p.prevRevenue > 0
                            ? p.yoyDiff >= 0
                              ? "text-success"
                              : "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {p.prevRevenue > 0 ? signedBRL(p.yoyDiff) : "—"}
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums ${
                          p.yoyPct == null
                            ? "text-muted-foreground"
                            : p.yoyPct >= 0
                              ? "text-success"
                              : "text-destructive"
                        }`}
                      >
                        {p.yoyPct != null
                          ? `${p.yoyPct >= 0 ? "+" : "−"}${Math.abs(p.yoyPct).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border font-semibold">
                    <td className="py-2 pr-3">Total 12 meses</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{compactBRL(salesRevenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                      {prevTotals.revenue > 0 ? compactBRL(prevTotals.revenue) : "—"}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right tabular-nums ${
                        revenueYoyDiff >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {prevTotals.revenue > 0 ? signedBRL(revenueYoyDiff) : "—"}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        (revenueYoyPct ?? 0) >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {revenueYoyPct != null
                        ? `${revenueYoyPct >= 0 ? "+" : "−"}${Math.abs(revenueYoyPct).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Meses parciais (mês corrente) aparecem com queda aparente por ainda não terem o período completo.
            </p>
          </Card>
        </div>
      )}




      {/* Resumo das seções */}
      <div className="mt-6">
        <Card>
          <CardTitle
            title="Resumo das seções"
            hint="Atalhos para todas as áreas do Audience Intelligence"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SECTION_SUMMARY.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="group rounded-xl border border-border bg-muted/50 p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-primary/10 text-primary">
                    <s.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{s.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>


      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {loading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <Kpi
              label="Volume vendido (12 meses)"
              value={salesQty ? formatNumber(Math.round(salesQty)) : "—"}
              delta={qtyYoyPct ?? undefined}
              deltaLabel={
                qtyYoyPct != null ? `${signedNum(qtyYoyDiff)} vs. 12m anteriores` : undefined
              }
              icon={<Ticket className="size-4 text-accent" />}
              accent="accent"
            />

            <Kpi
              label="Receita distribuidores"
              value={salesDistRevenue ? compactBRL(salesDistRevenue) : "—"}
              icon={<Store className="size-4 text-primary" />}
            />
            <Kpi
              label="Avaliações negativas"
              value={totalReviews ? `${((totalNegatives / totalReviews) * 100).toFixed(0)}%` : "—"}
              icon={<MessageSquareWarning className="size-4 text-success" />}
              accent="success"
            />
          </>

        )}
      </div>
    </div>
  );
}
