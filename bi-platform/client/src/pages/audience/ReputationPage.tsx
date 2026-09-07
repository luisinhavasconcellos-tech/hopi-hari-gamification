import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

import { AlertTriangle, Clock, MessageSquareWarning, RefreshCw, Smile, Star } from "lucide-react";
import { Card, CardTitle, EmptyState, Kpi, PageHeader, Pill, chartTooltipStyle } from "@/components/dashboard/primitives";
import { DataTable, type Column } from "@/components/audience/AudienceUI";
import { useReputation, SOURCE_LABEL, type ReputationReview, type ReputationSource } from "@/hooks/useReputation";
import ReputationCorrelation from "@/components/audience/ReputationCorrelation";
import { toast } from "sonner";

const SENTIMENT_COLORS: Record<string, string> = {
  positivo: "hsl(var(--success))",
  neutro: "hsl(var(--chart-3))",
  negativo: "hsl(var(--destructive))",
};

const fmtHours = (h: number | null | undefined) => {
  if (h == null) return "—";
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

export default function ReputationPage() {
  const [days, setDays] = useState(90);
  const [filter, setFilter] = useState<"todos" | ReputationSource>("todos");
  const { reviews, summary, totals, loading, syncing, sync } = useReputation(days);

  const filtered = useMemo(
    () => (filter === "todos" ? reviews : reviews.filter((r) => r.source === filter)),
    [reviews, filter],
  );

  const sentimentData = useMemo(
    () =>
      [
        { name: "Positivo", key: "positivo", value: totals.positives },
        { name: "Neutro", key: "neutro", value: totals.neutrals },
        { name: "Negativo", key: "negativo", value: totals.negatives },
      ].filter((d) => d.value > 0),
    [totals],
  );

  const responseData = useMemo(
    () =>
      summary.map((s) => ({
        name: SOURCE_LABEL[s.source],
        horas: s.avg_response_hours ?? 0,
        resposta: s.answer_rate_pct ?? 0,
      })),
    [summary],
  );

  const handleSync = async () => {
    const { error } = await sync();
    if (error) toast.error("Falha ao sincronizar", { description: error });
    else toast.success("Reputação sincronizada");
  };

  const columns: Column<ReputationReview>[] = [
    {
      key: "source",
      header: "Origem",
      width: "w-[110px]",
      render: (r) => (
        <Pill tone={r.source === "reclame_aqui" ? "warning" : "accent"}>{SOURCE_LABEL[r.source]}</Pill>
      ),
    },
    {
      key: "title",
      header: "Reclamação / avaliação",
      width: "w-[36%]",
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{r.title ?? "Sem título"}</div>
          {r.ai_summary && <div className="text-xs text-muted-foreground line-clamp-2">{r.ai_summary}</div>}
        </div>
      ),
    },
    {
      key: "sentiment",
      header: "Sentimento",
      width: "w-[110px]",
      render: (r) => (
        <Pill
          tone={r.sentiment === "positivo" ? "success" : r.sentiment === "negativo" ? "danger" : "muted"}
        >
          {r.sentiment ?? "—"}
        </Pill>
      ),
    },
    { key: "rating", header: "Nota", align: "right", width: "w-[70px]", render: (r) => (r.rating != null ? r.rating.toFixed(1) : "—") },
    { key: "published", header: "Publicado", align: "right", width: "w-[120px]", render: (r) => fmtDate(r.published_at) },
    {
      key: "response",
      header: "Tempo resposta",
      align: "right",
      width: "w-[130px]",
      render: (r) => (r.responded_at ? fmtHours(r.response_time_hours) : "sem resposta"),
    },
    {
      key: "resolved",
      header: "Resolvido",
      align: "right",
      width: "w-[100px]",
      render: (r) => <Pill tone={r.resolved ? "success" : "muted"}>{r.resolved ? "sim" : "não"}</Pill>,
    },
  ];


  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Reputação"
        title="ReclameAqui & TripAdvisor"
        subtitle="Monitoramento de reclamações, tempo de resposta e sentimento geral do público."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-muted/50 border border-border rounded-lg text-sm px-3 py-2"
            >
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
              <option value={365}>12 meses</option>
            </select>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Kpi
          label="Reclamações e avaliações"
          value={totals.reviews.toLocaleString("pt-BR")}
          icon={<MessageSquareWarning className="size-4" />}
        />
        <Kpi
          label="Tempo médio de resposta"
          value={fmtHours(totals.avgResponseHours)}
          accent="warning"
          icon={<Clock className="size-4" />}
        />
        <Kpi
          label="Taxa de resposta"
          value={totals.answerRate != null ? `${totals.answerRate.toFixed(1)}%` : "—"}
          accent="accent"
          icon={<Smile className="size-4" />}
        />
        <Kpi
          label="Menções negativas"
          value={totals.negativeRate != null ? `${totals.negativeRate.toFixed(1)}%` : "—"}
          accent="warning"
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardTitle title="Sentimento geral" hint="Distribuição das menções no período" />
          {sentimentData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                  {sentimentData.map((d) => (
                    <Cell key={d.key} fill={SENTIMENT_COLORS[d.key]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={chartTooltipStyle} />

              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">
              Sem dados no período
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle title="Tempo de resposta por canal" hint="Horas médias até a primeira resposta" />
          {responseData.some((d) => d.horas > 0 || d.resposta > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={responseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="horas" name="Horas médias" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resposta" name="Taxa resposta %" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              className="h-[260px]"
              title="Sem tempo de resposta registrado"
              description="As fontes coletadas não expõem as respostas da empresa neste período."
            />
          )}

        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {summary.map((s) => (
          <Card key={s.source}>
            <CardTitle
              title={SOURCE_LABEL[s.source]}
              hint={`${s.reviews} registros no período`}
              right={
                <div className="flex items-center gap-1 text-sm">
                  <Star className="size-4 text-warning" />
                  {s.avg_rating != null ? s.avg_rating.toFixed(1) : "—"}
                </div>
              }
            />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Tempo médio resposta</div>
                <div className="font-display text-xl">
                  {s.answered > 0 ? fmtHours(s.avg_response_hours) : <span className="text-base text-muted-foreground">Sem resposta registrada</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Taxa de resposta</div>
                <div className="font-display text-xl">
                  {s.answered > 0 && s.answer_rate_pct != null ? `${s.answer_rate_pct}%` : <span className="text-base text-muted-foreground">Não medido</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Negativas</div>
                <div className="font-display text-xl text-destructive">{s.negatives}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Resolvidas</div>
                <div className="font-display text-xl">
                  {s.resolved_rate_pct != null ? `${s.resolved_rate_pct}%` : <span className="text-base text-muted-foreground">Não medido</span>}
                </div>
              </div>
            </div>
            {s.answered === 0 && (
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                A fonte não expõe as respostas da empresa nas avaliações coletadas — o valor reflete ausência de dado,
                não desempenho zero.
              </p>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle
          title="Reclamações e avaliações"
          hint="Ordenadas da mais recente"
          right={
            <div className="flex gap-1">
              {(["todos", "reclame_aqui", "tripadvisor"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    filter === f
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "todos" ? "Todos" : SOURCE_LABEL[f]}
                </button>
              ))}
            </div>
          }
        />
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length ? (
          <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} />
        ) : (
          <EmptyState
            title="Nenhuma reclamação sincronizada"
            description="Clique em Sincronizar para buscar as reclamações do ReclameAqui e as avaliações do TripAdvisor."
          />
        )}
      </Card>

      <ReputationCorrelation days={days} />
    </div>

  );
}
