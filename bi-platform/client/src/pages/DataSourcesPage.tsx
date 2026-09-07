import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleSlash,
  Clock,
  Cloud,
  Database,
  Loader2,
  Play,
  RefreshCw,
  Workflow,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, CardTitle, Kpi, Pill, Bar } from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/* Registry: origem → ingestão → tabela → páginas que consomem          */
/* ------------------------------------------------------------------ */

type Node = {
  area: string;
  label: string;
  table: string;
  /** de onde o dado vem (API, planilha, upload manual) */
  origin: string;
  originKind: "api" | "sheet" | "manual" | "site";
  /** edge function que alimenta (quando automática) */
  fn?: string;
  dateCol: string;
  staleDays: number;
  /** páginas que consomem esta fonte */
  consumers: { label: string; to: string }[];
};

const NODES: Node[] = [
  // Social
  { area: "Social", label: "Seguidores diários", table: "follower_daily", origin: "Planilha oficial de seguidores", originKind: "sheet", fn: "sync-follower-log", dateCol: "reading_date", staleDays: 14, consumers: [{ label: "Base de seguidores", to: "/followers" }, { label: "Visão geral", to: "/" }] },
  { area: "Social", label: "Métricas diárias", table: "daily_metrics", origin: "Planilha de desempenho diário", originKind: "sheet", fn: "sync-daily-metrics", dateCol: "date", staleDays: 14, consumers: [{ label: "Visão geral", to: "/" }] },
  { area: "Social", label: "Posts Instagram", table: "instagram_posts", origin: "Apify (Instagram)", originKind: "api", fn: "scrape-instagram-apify", dateCol: "timestamp", staleDays: 14, consumers: [{ label: "Posts", to: "/posts" }] },
  { area: "Social", label: "Posts YouTube", table: "youtube_posts", origin: "YouTube Data API", originKind: "api", fn: "sync-youtube-stats", dateCol: "timestamp", staleDays: 21, consumers: [{ label: "YouTube", to: "/youtube" }] },
  { area: "Social", label: "Posts TikTok", table: "tiktok_posts", origin: "Apify (TikTok)", originKind: "api", dateCol: "timestamp", staleDays: 30, consumers: [{ label: "TikTok", to: "/tiktok" }] },
  { area: "Social", label: "Posts Facebook", table: "facebook_posts", origin: "Meta Graph API", originKind: "api", dateCol: "timestamp", staleDays: 30, consumers: [{ label: "Facebook", to: "/facebook" }] },
  { area: "Social", label: "Posts LinkedIn", table: "linkedin_posts", origin: "Coleta manual / API", originKind: "manual", dateCol: "timestamp", staleDays: 45, consumers: [{ label: "LinkedIn", to: "/linkedin" }] },

  // Reputação
  { area: "Reputação", label: "Avaliações", table: "reputation_reviews", origin: "ReclameAqui + TripAdvisor", originKind: "site", fn: "sync-reputation", dateCol: "published_at", staleDays: 30, consumers: [{ label: "Reputação", to: "/audience/reputation" }, { label: "Operação", to: "/audience/operations" }] },

  // Concorrência
  { area: "Concorrência", label: "Google Trends", table: "ci_trend_scores", origin: "SerpApi (Google Trends)", originKind: "api", fn: "collect-trends", dateCol: "date", staleDays: 14, consumers: [{ label: "Inteligência competitiva", to: "/audience/competitive" }] },
  { area: "Concorrência", label: "Social concorrentes", table: "ci_social_snapshots", origin: "Apify (IG/TikTok/YouTube)", originKind: "api", fn: "collect-social", dateCol: "captured_at", staleDays: 14, consumers: [{ label: "Inteligência competitiva", to: "/audience/competitive" }] },
  { area: "Concorrência", label: "Insights semanais", table: "ci_insights", origin: "IA (Lovable AI)", originKind: "api", fn: "generate-insights", dateCol: "created_at", staleDays: 14, consumers: [{ label: "Inteligência competitiva", to: "/audience/competitive" }] },
  { area: "Concorrência", label: "Benchmark de parques", table: "competitor_snapshot", origin: "Carga manual", originKind: "manual", dateCol: "collected_at", staleDays: 60, consumers: [{ label: "Benchmarks", to: "/benchmarks" }] },

  // Operação
  { area: "Operação", label: "Fluxo de catracas", table: "park_gate_flow_hourly", origin: "Sistema de bilheteria", originKind: "manual", dateCol: "date", staleDays: 45, consumers: [{ label: "Operação", to: "/audience/operations" }, { label: "Heatmaps", to: "/audience/heatmaps" }] },
  { area: "Operação", label: "Atrações", table: "park_attraction_monthly", origin: "Relatório de embarques", originKind: "manual", dateCol: "updated_at", staleDays: 60, consumers: [{ label: "Atrações", to: "/audience/attractions" }] },
  { area: "Operação", label: "Público mensal", table: "park_public_monthly", origin: "Relatório de público", originKind: "manual", dateCol: "updated_at", staleDays: 60, consumers: [{ label: "Visitantes", to: "/audience/visitors" }] },

  // PDV / F&B
  { area: "PDV / F&B", label: "Per capita diário", table: "park_percapita_daily", origin: "PDV do parque", originKind: "manual", dateCol: "date", staleDays: 45, consumers: [{ label: "Per capita", to: "/audience/percapita" }] },
  { area: "PDV / F&B", label: "Receita por outlet", table: "park_outlet_revenue_daily", origin: "PDV do parque", originKind: "manual", dateCol: "date", staleDays: 45, consumers: [{ label: "F&B", to: "/audience/products" }] },

  // Vendas
  { area: "Vendas", label: "Receita por canal", table: "sales_revenue_monthly", origin: "ERP / relatório de vendas", originKind: "manual", dateCol: "created_at", staleDays: 60, consumers: [{ label: "Canais de venda", to: "/audience/sales-channels" }, { label: "Produtos", to: "/audience/products" }] },
  { area: "Vendas", label: "Funil B2B", table: "sales_funnel_deals", origin: "Planilha comercial", originKind: "sheet", dateCol: "updated_at", staleDays: 90, consumers: [{ label: "Funil de vendas", to: "/audience/funnel" }] },
  { area: "Vendas", label: "Distribuidores", table: "distributor_sales_monthly", origin: "Relatório de distribuidores", originKind: "manual", dateCol: "updated_at", staleDays: 60, consumers: [{ label: "Distribuidores", to: "/audience/channels" }] },

  // CRM & Clientes
  { area: "CRM & Clientes", label: "Leads por geografia", table: "crm_leads_geo", origin: "Exportação do CRM", originKind: "manual", dateCol: "updated_at", staleDays: 120, consumers: [{ label: "Leads CRM", to: "/audience/crm" }] },
  { area: "CRM & Clientes", label: "Dimensões de leads", table: "crm_lead_dimensions", origin: "Exportação do CRM", originKind: "manual", dateCol: "updated_at", staleDays: 120, consumers: [{ label: "Leads CRM", to: "/audience/crm" }] },
  { area: "CRM & Clientes", label: "Cadastros de clientes", table: "customer_registrations_daily", origin: "Base de CPFs", originKind: "manual", dateCol: "date", staleDays: 120, consumers: [{ label: "Perfil do consumidor", to: "/audience/profile" }, { label: "Fidelidade", to: "/audience/loyalty" }] },
  { area: "CRM & Clientes", label: "Demografia", table: "customer_demographics", origin: "Base de CPFs", originKind: "manual", dateCol: "updated_at", staleDays: 120, consumers: [{ label: "Perfil do consumidor", to: "/audience/profile" }, { label: "Segmentos", to: "/audience/segments" }] },

  // Eventos & Campanhas
  { area: "Eventos & Campanhas", label: "Eventos do parque", table: "park_events", origin: "Site oficial hopihari.com.br", originKind: "site", fn: "sync-park-events", dateCol: "last_seen_at", staleDays: 14, consumers: [{ label: "Eventos", to: "/audience/events" }] },
  { area: "Eventos & Campanhas", label: "Campanhas", table: "campaigns", origin: "Drive de campanhas", originKind: "manual", dateCol: "updated_at", staleDays: 90, consumers: [{ label: "Campanhas", to: "/audience/campaigns" }] },

  // Busca
  { area: "Demanda de Busca", label: "Totais diários (Search Console)", table: "gsc_daily_totals", origin: "Google Search Console API", originKind: "api", fn: "gsc-sync", dateCol: "date", staleDays: 7, consumers: [{ label: "Demanda de Busca", to: "/audience/search-demand" }] },
  { area: "Demanda de Busca", label: "Termos de busca", table: "gsc_daily_queries", origin: "Google Search Console API", originKind: "api", fn: "gsc-sync", dateCol: "date", staleDays: 7, consumers: [{ label: "Demanda de Busca", to: "/audience/search-demand" }] },

  // Identidade
  { area: "Identidade & LGPD", label: "Consentimentos", table: "identity_consents", origin: "Opt-in pseudonimizado", originKind: "api", dateCol: "updated_at", staleDays: 30, consumers: [{ label: "Identidade", to: "/audience/identity" }, { label: "Transparência", to: "/audience/transparency" }] },
  { area: "Identidade & LGPD", label: "Eventos de navegação", table: "behavior_events", origin: "Tracking do site", originKind: "api", dateCol: "occurred_at", staleDays: 30, consumers: [{ label: "Segmentos", to: "/audience/segments" }] },
];

type Status = "available" | "progress" | "empty";

type Row = Node & {
  rows: number | null;
  lastAt: string | null;
  ageDays: number | null;
  status: Status;
  reason: string;
};

const STATUS_META: Record<Status, { label: string; tone: "success" | "warning" | "muted"; icon: typeof CheckCircle2 }> = {
  available: { label: "Disponível", tone: "success", icon: CheckCircle2 },
  progress: { label: "Em progresso", tone: "warning", icon: Clock },
  empty: { label: "Não carrega", tone: "muted", icon: CircleSlash },
};

const ORIGIN_LABEL: Record<Node["originKind"], string> = {
  api: "API",
  sheet: "Planilha",
  manual: "Carga manual",
  site: "Site",
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

/* ------------------------------------------------------------------ */

export default function DataSourcesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(
      NODES.map(async (s): Promise<Row> => {
        const client = supabase as any;
        const [countRes, lastRes] = await Promise.all([
          client.from(s.table).select("*", { count: "exact", head: true }),
          client.from(s.table).select(s.dateCol).order(s.dateCol, { ascending: false, nullsFirst: false }).limit(1),
        ]);
        if (countRes.error) {
          return { ...s, rows: null, lastAt: null, ageDays: null, status: "empty", reason: "Sem acesso ou tabela indisponível" };
        }
        const count = countRes.count ?? 0;
        const lastAt = (lastRes.data?.[0]?.[s.dateCol] as string | undefined) ?? null;
        const ageDays = daysSince(lastAt);
        if (count === 0) return { ...s, rows: 0, lastAt: null, ageDays: null, status: "empty", reason: "Nenhum registro carregado" };
        if (ageDays == null) return { ...s, rows: count, lastAt: null, ageDays: null, status: "progress", reason: "Registros sem data de referência" };
        if (ageDays > s.staleDays) return { ...s, rows: count, lastAt, ageDays, status: "progress", reason: `Última carga há ${ageDays} dias (limite ${s.staleDays})` };
        return { ...s, rows: count, lastAt, ageDays, status: "available", reason: `Atualizada há ${ageDays} dia(s)` };
      }),
    );
    setRows(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runCollector = useCallback(
    async (fn: string, label: string) => {
      setRunning(fn);
      try {
        const { data, error } = await supabase.functions.invoke(fn, { body: {} });
        if (error) throw error;
        const payload = (data ?? {}) as Record<string, unknown>;
        const ok = payload.ok !== false && !payload.error && payload.success !== false;
        const message = ok
          ? Object.entries(payload)
              .filter(([k, v]) => k !== "ok" && (typeof v === "number" || typeof v === "string"))
              .slice(0, 4)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ") || "Concluído"
          : String(payload.error ?? "Falha na coleta");
        toast({ title: ok ? `${label}: coleta concluída` : `${label}: falhou`, description: message, variant: ok ? undefined : "destructive" });
        if (ok) void load();
      } catch (e) {
        toast({ title: `${label}: falhou`, description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      } finally {
        setRunning(null);
      }
    },
    [load],
  );

  const counts = useMemo(
    () => ({
      available: rows.filter((r) => r.status === "available").length,
      progress: rows.filter((r) => r.status === "progress").length,
      empty: rows.filter((r) => r.status === "empty").length,
    }),
    [rows],
  );

  const totalRecords = rows.reduce((s, r) => s + (r.rows ?? 0), 0);
  const automated = NODES.filter((n) => n.fn).length;

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const byArea = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of visible) map.set(r.area, [...(map.get(r.area) ?? []), r]);
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [visible]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Fontes de Dados"
        subtitle="Fluxo completo do dado: da origem até as páginas que consomem. Acompanhe o que já carrega, o que está desatualizado e dispare coletas manuais."
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label={`Fontes mapeadas · ${automated} automáticas`} value={fmt(NODES.length)} />
        <Kpi label="Disponíveis (no prazo)" value={fmt(counts.available)} accent="success" />
        <Kpi label="Em progresso (desatualizadas)" value={fmt(counts.progress)} accent="warning" />
        <Kpi label="Registros totais" value={fmt(totalRecords)} />
      </div>

      {/* Workflow overview */}
      <Card className="mb-6">
        <CardTitle title="Fluxo do dado" hint="Cada etapa alimenta a seguinte" />
        <div className="grid gap-3 md:grid-cols-7 items-stretch">
          {[
            { icon: Cloud, title: "1. Origem", desc: "APIs, planilhas, site oficial e cargas manuais" },
            { icon: Workflow, title: "2. Ingestão", desc: `${automated} rotinas automáticas + cargas pontuais` },
            { icon: Database, title: "3. Base de dados", desc: `${NODES.length} tabelas monitoradas por área` },
            { icon: CheckCircle2, title: "4. Consumo", desc: "Páginas de análise e relatórios" },
          ].map((s, i, arr) => (
            <Fragment key={s.title}>
              <div className="md:col-span-1 rounded-xl border border-border/60 bg-muted/50 p-4">
                <s.icon className="h-5 w-5 text-primary mb-2" />
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
              </div>
              {i < arr.length - 1 && (
                <div className="hidden md:flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </Fragment>
          ))}

        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Cobertura das fontes</span>
            <span>
              {counts.available}/{NODES.length} atualizadas
            </span>
          </div>
          <Bar value={counts.available} max={NODES.length} tone="success" />
        </div>
      </Card>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "available", "progress", "empty"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? `Todas (${NODES.length})` : `${STATUS_META[f].label} (${counts[f]})`}
          </Button>
        ))}
      </div>

      {/* Áreas */}
      {loading && rows.length === 0 ? (
        <Card>
          <div className="text-sm text-muted-foreground py-6 text-center">Carregando fluxo de dados…</div>
        </Card>
      ) : (
        <div className="space-y-5">
          {byArea.map(([area, list]) => (
            <Card key={area}>
              <CardTitle
                title={area}
                hint={`${list.length} fonte(s) · ${fmt(list.reduce((s, r) => s + (r.rows ?? 0), 0))} registros`}
                right={
                  <Pill tone={list.every((r) => r.status === "available") ? "success" : list.some((r) => r.status === "empty") ? "muted" : "warning"}>
                    {list.filter((r) => r.status === "available").length}/{list.length} ok
                  </Pill>
                }
              />
              <div className="space-y-3">
                {list.map((r) => {
                  const meta = STATUS_META[r.status];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={r.table}
                      className="grid gap-3 lg:grid-cols-[1.1fr_auto_1fr_auto_1fr] items-center rounded-xl border border-border/60 bg-muted/50 p-3"
                    >
                      {/* origem */}
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Origem</div>
                        <div className="text-sm truncate">{r.origin}</div>
                        <Pill tone="muted">{ORIGIN_LABEL[r.originKind]}</Pill>
                      </div>

                      <ArrowRight className="hidden lg:block h-4 w-4 text-muted-foreground" />

                      {/* tabela / status */}
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Base</div>
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              meta.tone === "success" ? "text-success" : meta.tone === "warning" ? "text-warning" : "text-muted-foreground"
                            }`}
                          />
                          <span className="text-sm font-medium truncate">{r.label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {r.rows == null ? "—" : `${fmt(r.rows)} registros`} · {r.reason}
                        </div>
                      </div>

                      <ArrowRight className="hidden lg:block h-4 w-4 text-muted-foreground" />

                      {/* consumo + ação */}
                      <div className="min-w-0 flex flex-col gap-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Consumido em</div>
                        <div className="flex flex-wrap gap-1.5">
                          {r.consumers.map((c) => (
                            <Link
                              key={c.to}
                              to={c.to}
                              className="text-[11px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              {c.label}
                            </Link>
                          ))}
                        </div>
                        {r.fn && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-fit"
                            disabled={running === r.fn}
                            onClick={() => runCollector(r.fn!, r.label)}
                          >
                            {running === r.fn ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Recolher agora
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mt-6 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        Fontes marcadas como "carga manual" dependem de envio de planilhas/relatórios; as demais têm rotina automática agendada.
      </p>
    </div>
  );
}
