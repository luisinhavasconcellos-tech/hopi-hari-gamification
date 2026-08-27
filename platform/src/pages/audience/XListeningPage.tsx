import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Heart, MessageCircle, RefreshCw, Repeat2, Smile, Eye } from "lucide-react";
import { toast } from "sonner";
import { Card, CardTitle, EmptyState, Kpi, PageHeader, Pill, chartTooltipStyle } from "@/components/dashboard/primitives";
import { DataTable, type Column } from "@/components/audience/AudienceUI";
import { useXListening, BRAND_LABEL, type XMention } from "@/hooks/useXListening";
import { useXPosts, type XPost } from "@/hooks/useXPosts";

const nf = new Intl.NumberFormat("pt-BR");

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function XListeningPage() {
  const [days, setDays] = useState(30);
  const [brand, setBrand] = useState<string>("hopi_hari");
  const { mentions, totals, timeline, shareOfVoice, topics, loading, syncing, sync } = useXListening(days);
  const { posts: ownPosts, totals: postTotals, loading: postsLoading, scraping, scrape } = useXPosts();

  const filtered = useMemo(
    () => (brand === "todos" ? mentions : mentions.filter((m) => m.brand === brand)),
    [mentions, brand],
  );

  const topPosts = useMemo(
    () =>
      [...filtered]
        .sort(
          (a, b) =>
            b.likes + b.retweets + b.replies + b.quotes - (a.likes + a.retweets + a.replies + a.quotes),
        )
        .slice(0, 50),
    [filtered],
  );

  const handleSync = async () => {
    const { error } = await sync();
    if (error) toast.error("Falha ao sincronizar", { description: error });
    else toast.success("Menções do X sincronizadas");
  };

  const handleScrape = async () => {
    const { error } = await scrape();
    if (error) toast.error("Falha ao coletar métricas", { description: error });
    else toast.success("Métricas dos posts do X atualizadas");
  };

  const postColumns: Column<XPost>[] = [
    {
      key: "post",
      header: "Post",
      width: "w-[45%]",
      render: (p) => (
        <a href={p.post_url} target="_blank" rel="noreferrer" className="line-clamp-2 hover:text-primary">
          {p.caption?.trim() || p.post_url}
        </a>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[110px]",
      render: (p) => (
        <Pill tone={p.scrape_status === "scraped" ? "success" : "muted"}>
          {p.scrape_status === "scraped" ? "coletado" : "pendente"}
        </Pill>
      ),
    },
    { key: "likes", header: "Curtidas", align: "right", width: "w-[90px]", render: (p) => nf.format(p.like_count ?? 0) },
    { key: "rts", header: "RTs", align: "right", width: "w-[80px]", render: (p) => nf.format(p.share_count ?? 0) },
    { key: "replies", header: "Respostas", align: "right", width: "w-[95px]", render: (p) => nf.format(p.comments_count ?? 0) },
    { key: "date", header: "Publicado", align: "right", width: "w-[130px]", render: (p) => fmtDate(p.timestamp) },
  ];

  const columns: Column<XMention>[] = [
    {
      key: "author",
      header: "Autor",
      width: "w-[160px]",
      render: (m) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{m.author_name ?? "—"}</div>
          <div className="truncate text-xs text-muted-foreground">
            @{m.author_handle ?? "?"} · {nf.format(m.author_followers ?? 0)} seg.
          </div>
        </div>
      ),
    },
    {
      key: "text",
      header: "Post",
      width: "w-[38%]",
      render: (m) => (
        <div className="min-w-0">
          {m.url ? (
            <a href={m.url} target="_blank" rel="noreferrer" className="line-clamp-2 hover:text-primary">
              {m.text ?? "—"}
            </a>
          ) : (
            <div className="line-clamp-2">{m.text ?? "—"}</div>
          )}
          {m.ai_summary && <div className="text-xs text-muted-foreground line-clamp-1">{m.ai_summary}</div>}
        </div>
      ),
    },
    {
      key: "sentiment",
      header: "Sentimento",
      width: "w-[110px]",
      render: (m) => (
        <Pill tone={m.sentiment === "positivo" ? "success" : m.sentiment === "negativo" ? "danger" : "muted"}>
          {m.sentiment ?? "—"}
        </Pill>
      ),
    },
    { key: "topic", header: "Tópico", width: "w-[120px]", render: (m) => m.topic ?? "—" },
    { key: "likes", header: "Curtidas", align: "right", width: "w-[90px]", render: (m) => nf.format(m.likes) },
    { key: "rt", header: "RTs", align: "right", width: "w-[80px]", render: (m) => nf.format(m.retweets) },
    { key: "views", header: "Views", align: "right", width: "w-[90px]", render: (m) => nf.format(m.views) },
    { key: "date", header: "Publicado", align: "right", width: "w-[130px]", render: (m) => fmtDate(m.published_at) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Listening — X"
        subtitle="Menções ao Hopi Hari e concorrentes no X (Twitter), com sentimento e share of voice"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm"
            >
              {[7, 14, 30, 90].map((d) => (
                <option key={d} value={d}>
                  Últimos {d} dias
                </option>
              ))}
            </select>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm hover:bg-muted/70 disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Menções (Hopi Hari)" value={nf.format(totals.mentions)} icon={<MessageCircle className="size-4" />} />
        <Kpi
          label="Sentimento líquido"
          value={totals.sentimentScore == null ? "—" : `${totals.sentimentScore.toFixed(0)}%`}
          icon={<Smile className="size-4" />}
          deltaLabel={`${totals.positives} pos · ${totals.negatives} neg`}
        />
        <Kpi label="Engajamento total" value={nf.format(totals.engagement)} icon={<Heart className="size-4" />} />
        <Kpi label="Impressões" value={nf.format(totals.reach)} icon={<Eye className="size-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle title="Volume diário por sentimento" />
          {timeline.length === 0 ? (
            <EmptyState description={loading ? "Carregando…" : "Sem menções no período. Clique em Sincronizar."} />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="positivo" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.4)" />
                  <Area type="monotone" dataKey="neutro" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3) / 0.35)" />
                  <Area type="monotone" dataKey="negativo" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.35)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle title="Share of voice" />
          {shareOfVoice.length === 0 ? (
            <EmptyState description="Sem dados" />
          ) : (
            <div className="space-y-3 pt-2">
              {shareOfVoice.map((s) => (
                <div key={s.brand}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={s.brand === "hopi_hari" ? "font-semibold text-foreground" : "text-muted-foreground"}>
                      {s.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.pct.toFixed(1)}% · {nf.format(s.count)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted/50">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.max(s.pct, 2)}%`,
                        background: s.brand === "hopi_hari" ? "hsl(var(--primary))" : "hsl(var(--chart-3))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle title="Tópicos mais comentados (Hopi Hari)" />
        {topics.length === 0 ? (
          <EmptyState description="Sem tópicos classificados ainda" />
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topics} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <YAxis dataKey="topic" type="category" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total" name="Menções" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="negativos" name="Negativas" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <CardTitle title="Menções em destaque" />
          <div className="flex flex-wrap gap-2">
            {["hopi_hari", ...Object.keys(BRAND_LABEL).filter((b) => b !== "hopi_hari"), "todos"].map((b) => (
              <button
                key={b}
                onClick={() => setBrand(b)}
                className={`rounded-lg border px-3 py-1 text-xs transition-colors ${
                  brand === b
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {b === "todos" ? "Todos" : BRAND_LABEL[b] ?? b}
              </button>
            ))}
          </div>
        </div>
        {topPosts.length === 0 ? (
          <EmptyState description={loading ? "Carregando…" : "Nenhuma menção encontrada."} />
        ) : (
          <DataTable rows={topPosts} columns={columns} rowKey={(m) => m.tweet_id} maxHeight="max-h-[520px]" />
        )}
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <CardTitle
            title="Posts do Hopi Hari no X"
            hint={`${postTotals.scraped} de ${postTotals.total} posts com métricas coletadas`}
          />
          <button
            onClick={handleScrape}
            disabled={scraping || postTotals.pending === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm hover:bg-muted/70 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${scraping ? "animate-spin" : ""}`} />
            {scraping ? "Coletando…" : `Coletar métricas (${postTotals.pending} pendentes)`}
          </button>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Curtidas nos posts" value={nf.format(postTotals.likes)} icon={<Heart className="size-4" />} />
          <Kpi label="Retweets" value={nf.format(postTotals.rts)} icon={<Repeat2 className="size-4" />} />
          <Kpi label="Respostas" value={nf.format(postTotals.replies)} icon={<MessageCircle className="size-4" />} />
          <Kpi
            label="Engajamento médio / post"
            value={postTotals.avgEngagement.toFixed(1)}
            icon={<Smile className="size-4" />}
          />
        </div>

        {ownPosts.length === 0 ? (
          <EmptyState description={postsLoading ? "Carregando…" : "Nenhum post importado da planilha."} />
        ) : (
          <DataTable rows={ownPosts} columns={postColumns} rowKey={(p) => p.id} maxHeight="max-h-[520px]" />
        )}
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Repeat2 className="size-3.5" /> Dados coletados via busca pública no X (últimos {days} dias) e classificados por IA.
      </p>
    </div>
  );
}
