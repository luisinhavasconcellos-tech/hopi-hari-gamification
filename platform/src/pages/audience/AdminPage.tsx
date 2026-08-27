import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleSlash, Clock, Download, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, CardTitle, Kpi, Pill, Bar } from "@/components/dashboard/primitives";
import { DataTable, Section } from "@/components/audience/AudienceUI";
import { toast } from "@/hooks/use-toast";

type Collector = {
  fn: string;
  label: string;
  description: string;
  /** tabelas alimentadas por esta coleta */
  tables: string[];
};

const COLLECTORS: Collector[] = [
  { fn: "sync-follower-log", label: "Seguidores das redes", description: "Planilha oficial de seguidores diários", tables: ["follower_daily"] },
  { fn: "sync-daily-metrics", label: "Métricas diárias", description: "Planilha de desempenho diário por rede", tables: ["daily_metrics"] },
  { fn: "scrape-instagram-apify", label: "Posts do Instagram", description: "Coleta de posts e métricas via Apify", tables: ["instagram_posts"] },
  { fn: "sync-youtube-stats", label: "YouTube", description: "Estatísticas de vídeos e canal", tables: ["youtube_posts"] },
  { fn: "sync-reputation", label: "Reputação", description: "ReclameAqui e TripAdvisor", tables: ["reputation_reviews"] },
  { fn: "sync-park-events", label: "Eventos do parque", description: "Site oficial do Hopi Hari", tables: ["park_events"] },
  { fn: "collect-trends", label: "Google Trends", description: "Busca comparada dos concorrentes (SerpApi)", tables: [] },
  { fn: "collect-social", label: "Social dos concorrentes", description: "Perfis e posts via Apify", tables: [] },
  { fn: "generate-insights", label: "Insights competitivos", description: "Resumo semanal por IA", tables: [] },
];

const COLLECTOR_BY_TABLE = new Map<string, Collector>();
for (const c of COLLECTORS) for (const t of c.tables) COLLECTOR_BY_TABLE.set(t, c);


type SourceDef = {
  area: string;
  label: string;
  table: string;
  note: string;
  /** coluna usada para medir a atualidade da fonte */
  dateCol: string;
  /** a partir de quantos dias sem atualização a fonte é considerada "em progresso" */
  staleDays: number;
};

const SOURCES: SourceDef[] = [
  { area: "PDV / F&B", label: "Per capita diário", table: "park_percapita_daily", note: "Receita e penetração por categoria", dateCol: "date", staleDays: 45 },
  { area: "PDV / F&B", label: "Receita por ponto de venda", table: "park_outlet_revenue_daily", note: "Faturamento diário por outlet", dateCol: "date", staleDays: 45 },
  { area: "Operação", label: "Fluxo de catracas", table: "park_gate_flow_hourly", note: "Entradas e saídas por hora", dateCol: "date", staleDays: 45 },
  { area: "Operação", label: "Atrações", table: "park_attraction_monthly", note: "Embarques e penetração mensal", dateCol: "updated_at", staleDays: 60 },
  { area: "Operação", label: "Público mensal", table: "park_public_monthly", note: "Visitantes por mês", dateCol: "updated_at", staleDays: 60 },
  { area: "CRM", label: "Leads por geografia", table: "crm_leads_geo", note: "Cobertura por UF e município", dateCol: "updated_at", staleDays: 120 },
  { area: "CRM", label: "Dimensões de leads", table: "crm_lead_dimensions", note: "Canal, origem e perfil", dateCol: "updated_at", staleDays: 120 },
  { area: "CRM", label: "Cadastros de clientes", table: "customer_registrations_daily", note: "Base histórica de cadastros", dateCol: "date", staleDays: 120 },
  { area: "Vendas", label: "Receita por canal", table: "sales_revenue_monthly", note: "Faturamento mensal por canal", dateCol: "created_at", staleDays: 60 },
  { area: "Vendas", label: "Funil B2B", table: "sales_funnel_deals", note: "Negociações e etapas", dateCol: "updated_at", staleDays: 90 },
  { area: "Vendas", label: "Distribuidores", table: "distributor_sales_monthly", note: "Vendas por distribuidor", dateCol: "updated_at", staleDays: 60 },
  { area: "Social", label: "Seguidores diários", table: "follower_daily", note: "Log oficial das redes", dateCol: "reading_date", staleDays: 14 },
  { area: "Social", label: "Posts Instagram", table: "instagram_posts", note: "Coleta via Apify", dateCol: "timestamp", staleDays: 14 },
  { area: "Reputação", label: "Avaliações", table: "reputation_reviews", note: "ReclameAqui e TripAdvisor", dateCol: "published_at", staleDays: 30 },
  { area: "Eventos", label: "Eventos do parque", table: "park_events", note: "Site oficial + cadastro manual", dateCol: "last_seen_at", staleDays: 14 },
  { area: "Campanhas", label: "Campanhas", table: "campaigns", note: "Peças e períodos de mídia", dateCol: "updated_at", staleDays: 90 },
  { area: "Identidade", label: "Consentimentos", table: "identity_consents", note: "Opt-in pseudonimizado (LGPD)", dateCol: "updated_at", staleDays: 30 },
  { area: "Identidade", label: "Eventos de navegação", table: "behavior_events", note: "Coleta comportamental", dateCol: "occurred_at", staleDays: 30 },
];

type Status = "available" | "progress" | "empty";

type Row = SourceDef & {
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

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
}

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [running, setRunning] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Record<string, { ok: boolean; at: string; message: string }>>({});



  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(
      SOURCES.map(async (s): Promise<Row> => {
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

        if (count === 0) {
          return { ...s, rows: 0, lastAt: null, ageDays: null, status: "empty", reason: "Nenhum registro carregado até agora" };
        }
        if (ageDays == null) {
          return { ...s, rows: count, lastAt: null, ageDays: null, status: "progress", reason: "Registros sem data de referência" };
        }
        if (ageDays > s.staleDays) {
          return { ...s, rows: count, lastAt, ageDays, status: "progress", reason: `Última carga há ${ageDays} dias (limite ${s.staleDays})` };
        }
        return { ...s, rows: count, lastAt, ageDays, status: "available", reason: `Atualizada há ${ageDays} dia(s)` };
      }),
    );
    setRows(results);
    setLoading(false);
  }, []);

  const runCollector = useCallback(
    async (c: Collector) => {
      setRunning(c.fn);
      try {
        const { data, error } = await supabase.functions.invoke(c.fn, { body: {} });
        if (error) throw error;
        const payload = (data ?? {}) as Record<string, unknown>;
        const ok = payload.ok !== false && !payload.error;
        const message = ok
          ? Object.entries(payload)
              .filter(([k, v]) => k !== "ok" && (typeof v === "number" || typeof v === "string"))
              .slice(0, 4)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ") || "Concluído"
          : String(payload.error ?? "Falha na coleta");
        setLastRun((p) => ({ ...p, [c.fn]: { ok, at: new Date().toISOString(), message } }));
        toast({
          title: ok ? `${c.label}: coleta concluída` : `${c.label}: falhou`,
          description: message,
          variant: ok ? undefined : "destructive",
        });
        if (ok) void load();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setLastRun((p) => ({ ...p, [c.fn]: { ok: false, at: new Date().toISOString(), message } }));
        toast({ title: `${c.label}: falhou`, description: message, variant: "destructive" });
      } finally {
        setRunning(null);
      }
    },
    [load],
  );


  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      available: rows.filter((r) => r.status === "available").length,
      progress: rows.filter((r) => r.status === "progress").length,
      empty: rows.filter((r) => r.status === "empty").length,
    }),
    [rows],
  );

  const totalRows = rows.reduce((s, r) => s + (r.rows ?? 0), 0);
  const total = SOURCES.length;
  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const byArea = useMemo(() => {
    const map = new Map<string, { area: string; total: number; available: number; progress: number; empty: number }>();
    for (const r of rows) {
      const e = map.get(r.area) ?? { area: r.area, total: 0, available: 0, progress: 0, empty: 0 };
      e.total += 1;
      e[r.status] += 1;
      map.set(r.area, e);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Sistema"
        title="Painel de fontes de dados"
        subtitle="Quantas fontes estão disponíveis, quantas estão em progresso (com dados, mas desatualizadas) e quantas ainda não carregam."
        actions={
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Disponíveis"
          value={loading ? "…" : `${counts.available}/${total}`}
          accent="success"
        />
        <Kpi
          label="Em progresso"
          value={loading ? "…" : String(counts.progress)}
          accent="warning"
        />
        <Kpi
          label="Não carregam"
          value={loading ? "…" : String(counts.empty)}
        />
        <Kpi
          label="Registros totais"
          value={loading ? "…" : totalRows.toLocaleString("pt-BR")}
          accent="primary"
        />
      </div>

      <Section cols="grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardTitle title="Cobertura por área" hint="Quantas fontes de cada área já entregam dados atualizados" />
          <div className="space-y-4">
            {byArea.map((a) => {
              const pct = a.total ? (a.available / a.total) * 100 : 0;
              return (
                <div key={a.area}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium">{a.area}</span>
                    <span className="text-muted-foreground">
                      {a.available}/{a.total} disponíveis
                    </span>
                  </div>
                  <Bar value={pct} tone={pct === 100 ? "success" : pct > 0 ? "warning" : "primary"} />
                  <div className="mt-1.5 flex gap-2">
                    {a.progress > 0 && <Pill tone="warning">{a.progress} em progresso</Pill>}
                    {a.empty > 0 && <Pill tone="muted">{a.empty} sem dados</Pill>}
                  </div>
                </div>
              );
            })}
            {!loading && byArea.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma fonte monitorada.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle title="Como classificamos" hint="Critérios objetivos, sem estimativas" />
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-success mt-0.5" />
              <span>
                <span className="text-foreground font-medium">Disponível</span> — a tabela tem registros e a data mais
                recente está dentro do prazo esperado para aquela fonte.
              </span>
            </li>
            <li className="flex gap-2">
              <Clock className="size-4 shrink-0 text-warning mt-0.5" />
              <span>
                <span className="text-foreground font-medium">Em progresso</span> — há dados carregados, mas a última
                atualização passou do prazo (ou os registros não têm data de referência).
              </span>
            </li>
            <li className="flex gap-2">
              <CircleSlash className="size-4 shrink-0 mt-0.5" />
              <span>
                <span className="text-foreground font-medium">Não carrega</span> — nenhuma linha no banco, ou a tabela
                não está acessível para o seu perfil.
              </span>
            </li>
            <li className="flex gap-2">
              <AlertTriangle className="size-4 shrink-0 text-warning mt-0.5" />
              <span>Os prazos variam por fonte: seguidores e posts são diários; vendas e CRM têm cargas mensais.</span>
            </li>
          </ul>
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Coleta manual"
            hint="Dispara agora as rotinas que normalmente rodam automáticas"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {COLLECTORS.map((c) => {
              const busy = running === c.fn;
              const last = lastRun[c.fn];
              return (
                <div key={c.fn} className="rounded-xl border border-border p-3 flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-[11px] text-muted-foreground">{c.description}</p>
                  </div>
                  <button
                    onClick={() => void runCollector(c)}
                    disabled={running !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                    {busy ? "Coletando…" : "Recolher agora"}
                  </button>
                  {last && (
                    <p className={`text-[11px] ${last.ok ? "text-success" : "text-destructive"}`}>
                      {new Date(last.at).toLocaleTimeString("pt-BR")} — {last.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Coletas pesadas (Apify, SerpApi) podem levar alguns minutos e consomem cota das APIs.
          </p>
        </Card>
      </Section>



      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Detalhe por fonte" hint="Clique nos filtros para isolar cada status" />
          <div className="mb-4 flex flex-wrap gap-2">
            {([
              ["all", `Todas (${rows.length})`],
              ["available", `Disponíveis (${counts.available})`],
              ["progress", `Em progresso (${counts.progress})`],
              ["empty", `Não carregam (${counts.empty})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                  filter === key
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <DataTable
            rows={visible}
            rowKey={(r) => r.table}
            columns={[
              { key: "area", header: "Área", render: (r) => r.area },
              { key: "fonte", header: "Fonte", render: (r) => r.label },
              { key: "note", header: "Conteúdo", render: (r) => <span className="text-muted-foreground">{r.note}</span> },
              {
                key: "rows",
                header: "Registros",
                align: "right",
                render: (r) => (r.rows == null ? "—" : r.rows.toLocaleString("pt-BR")),
              },
              {
                key: "last",
                header: "Última carga",
                align: "right",
                render: (r) =>
                  r.lastAt ? new Date(r.lastAt.length <= 10 ? `${r.lastAt}T12:00:00Z` : r.lastAt).toLocaleDateString("pt-BR") : "—",
              },
              {
                key: "status",
                header: "Status",
                align: "right",
                render: (r) => {
                  const meta = STATUS_META[r.status];
                  const Icon = meta.icon;
                  return (
                    <span title={r.reason}>
                      <Pill tone={meta.tone}>
                        <Icon className="size-3" /> {meta.label}
                      </Pill>
                    </span>
                  );
                },
              },
              {
                key: "action",
                header: "Coleta",
                align: "right",
                render: (r) => {
                  const c = COLLECTOR_BY_TABLE.get(r.table);
                  if (!c) return <span className="text-muted-foreground">manual</span>;
                  const busy = running === c.fn;
                  return (
                    <button
                      onClick={() => void runCollector(c)}
                      disabled={running !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                      Recolher
                    </button>
                  );
                },
              },
            ]}

          />
          {!loading && visible.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma fonte nesse status.</p>
          )}
        </Card>
      </Section>
    </div>
  );
}
