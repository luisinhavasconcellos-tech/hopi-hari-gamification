import { useState } from "react";
import { Activity, Clock3, Database, ExternalLink, Film, Image as ImageIcon, Megaphone, Sparkles, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, Kpi, Card, CardTitle, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { formatNumber } from "@/lib/format";
import { useCampaigns, driveThumb, LAGS, type EnrichedCampaign } from "@/hooks/useCampaigns";
import CampaignEventImpact from "@/components/audience/CampaignEventImpact";
import CampaignSalesCorrelationPanel from "@/components/CampaignSalesCorrelationPanel";
import CampaignArchiveImportPanel from "@/components/CampaignArchiveImportPanel";


const fmtDate = (d: string | null) =>
  d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

function CampaignCard({ c }: { c: EnrichedCampaign }) {
  const previews = c.summary?.previews ?? [];
  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col">
      <div className="grid grid-cols-4 gap-px bg-muted/60">
        {previews.slice(0, 4).map((p) => (
          <div key={p.id} className="aspect-square bg-background/60 overflow-hidden">
            <img
              src={driveThumb(p.id, 400)}
              alt={`Peça ${p.name} da campanha ${c.name}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="size-full object-cover"
            />
          </div>
        ))}
        {previews.length === 0 && (
          <div className="col-span-4 aspect-[4/1] grid place-items-center text-xs text-muted-foreground">
            Sem prévia disponível
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="font-semibold leading-tight">{c.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {fmtDate(c.period_start)} – {fmtDate(c.period_end)} · {c.brand}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-lg border border-border bg-muted/50 px-2 py-1.5">
            <div className="text-muted-foreground">Peças</div>
            <div className="font-semibold tabular-nums">{c.summary?.assets?.total ?? 0}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 px-2 py-1.5">
            <div className="text-muted-foreground">Vídeos</div>
            <div className="font-semibold tabular-nums">{c.summary?.assets?.videos ?? 0}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/50 px-2 py-1.5">
            <div className="text-muted-foreground">Interações</div>
            <div className="font-semibold tabular-nums">{formatNumber(c.interactions)}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {(c.summary?.formats ?? []).slice(0, 6).map((f) => (
            <span
              key={f}
              className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {f}
            </span>
          ))}
        </div>

        <a
          href={c.summary?.folder_url}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
        >
          Abrir pasta no Drive <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

const rLabel = (r: number | null) => {
  if (r === null) return { text: "Sem amostra", tone: "text-muted-foreground" };
  const a = Math.abs(r);
  const strength = a >= 0.7 ? "forte" : a >= 0.4 ? "moderada" : a >= 0.2 ? "fraca" : "desprezível";
  const dir = r >= 0 ? "positiva" : "negativa";
  const tone = a < 0.2 ? "text-muted-foreground" : r > 0 ? "text-success" : "text-destructive";
  return { text: `${strength} ${dir}`, tone };
};

export default function CampaignsPage() {
  const {
    loading,
    hasData,
    campaigns,
    totalCampaigns,
    totalAssets,
    totalVideos,
    totalInteractions,
    byInteractions,
    correlations,
    correlationSample,
    baselineGainPerDay,
    campaignGainPerDay,
    lagAnalysis,
    lagSample,
    bestLag,
    driveSources,
  } = useCampaigns();
  const [tab, setTab] = useState<"criativos" | "performance" | "correlacao" | "vendas" | "eventos">("criativos");
  const driveSource = driveSources[0];

  const chartData = byInteractions
    .filter((c) => c.interactions > 0)
    .slice(0, 12)
    .map((c) => ({ name: c.name, interacoes: c.interactions, visualizacoes: c.views }));

  const scatterData = correlationSample.map((c) => ({
    name: c.name,
    x: c.interactions,
    y: Math.round(c.followerGainPerDay ?? 0),
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Audience · Mídia"
        title="Campanhas"
        subtitle="Catálogo de criativos por campanha e desempenho orgânico no período de veiculação."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-primary/10 p-2 text-primary"><Database className="size-4" /></span>
          <div>
            <p className="text-sm font-semibold text-foreground">Google Drive sincronizado</p>
            <p className="text-xs text-muted-foreground">
              {driveSource?.lastSyncedAt
                ? `Última atualização: ${new Date(driveSource.lastSyncedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                : "Aguardando a primeira sincronização disponível para esta sessão"}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
          <Clock3 className="size-3.5" /> ciclo automático de 6 horas
        </span>
      </div>

      <CampaignArchiveImportPanel />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Kpi label="Campanhas" value={String(totalCampaigns)} icon={<Megaphone className="size-4 text-primary" />} />
        <Kpi label="Peças criativas" value={formatNumber(totalAssets)} icon={<ImageIcon className="size-4 text-accent" />} accent="accent" />
        <Kpi label="Vídeos" value={formatNumber(totalVideos)} icon={<Film className="size-4 text-success" />} accent="success" />
        <Kpi
          label="Interações no período"
          value={formatNumber(totalInteractions)}
          icon={<Sparkles className="size-4 text-muted-foreground" />}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["criativos", "performance", "correlacao", "vendas", "eventos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              tab === t
                ? "border-primary/40 bg-primary/15 text-foreground"
                : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "criativos"
              ? "Criativos"
              : t === "performance"
                ? "Performance"
                : t === "correlacao"
                  ? "Seguidores"
                  : t === "vendas"
                    ? "Campanhas × Vendas"
                    : "Eventos & Vendas"}
          </button>
        ))}

      </div>


      {tab === "vendas" ? (
        <CampaignSalesCorrelationPanel />
      ) : tab === "eventos" ? (
        <CampaignEventImpact campaigns={campaigns} />
      ) : tab === "criativos" ? (

        <Section cols="grid-cols-1">
          <Card>
            <CardTitle title="Catálogo de criativos" hint="Prévias e formatos por campanha · fonte Google Drive" />
            {loading ? (
              <ChartSkeleton />
            ) : !hasData ? (
              <EmptyState title="Nenhuma campanha cadastrada" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {campaigns.map((c) => (
                  <CampaignCard key={c.id} c={c} />
                ))}
              </div>
            )}
          </Card>
        </Section>
      ) : tab === "performance" ? (

        <>
          <Section cols="grid-cols-1">
            <Card>
              <CardTitle
                title="Interações por campanha"
                hint="Posts orgânicos publicados entre o início das peças e 21 dias após a última peça"
              />
              {loading ? (
                <ChartSkeleton />
              ) : chartData.length === 0 ? (
                <EmptyState title="Sem posts no período das campanhas" />
              ) : (
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={180}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip {...tooltipStyle} separator=": " formatter={(v: number) => formatNumber(Number(v))} />
                    <Bar name="Interações" dataKey="interacoes" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Section>

          <Section cols="grid-cols-1">
            <Card>
              <CardTitle title="Desempenho por campanha" hint="Cruzamento entre período das peças e posts das redes" />
              <DataTable
                rows={campaigns}
                rowKey={(r) => r.id}
                columns={[
                  {
                    key: "name",
                    header: "Campanha",
                    render: (r) => (
                      <div className="min-w-[180px]">
                        <div className="truncate text-foreground">{r.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                        </div>
                      </div>
                    ),
                  },
                  { key: "assets", header: "Peças", align: "right", render: (r) => formatNumber(r.summary?.assets?.total ?? 0) },
                  { key: "posts", header: "Posts", align: "right", render: (r) => formatNumber(r.posts) },
                  { key: "int", header: "Interações", align: "right", render: (r) => formatNumber(r.interactions) },
                  { key: "views", header: "Visualizações", align: "right", render: (r) => formatNumber(r.views) },
                  {
                    key: "epp",
                    header: "Interações/post",
                    align: "right",
                    render: (r) => formatNumber(Math.round(r.engagementPerPost)),
                  },
                  {
                    key: "vr",
                    header: "Engaj./views",
                    align: "right",
                    render: (r) => (r.viewRate === null ? "—" : `${r.viewRate.toFixed(2)}%`),
                  },
                  {
                    key: "plat",
                    header: "Redes",
                    render: (r) => (
                      <span className="text-[11px] text-muted-foreground">
                        {r.byPlatform.slice(0, 3).map((p) => p.platform).join(" · ") || "—"}
                      </span>
                    ),
                  },
                ]}
              />
            </Card>
          </Section>
        </>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Kpi
              label="Ganho médio/dia em campanha"
              value={campaignGainPerDay === null ? "—" : formatNumber(Math.round(campaignGainPerDay))}
              icon={<TrendingUp className="size-4 text-success" />}
              accent="success"
            />
            <Kpi
              label="Ganho médio/dia sem campanha"
              value={baselineGainPerDay === null ? "—" : formatNumber(Math.round(baselineGainPerDay))}
              icon={<Activity className="size-4 text-muted-foreground" />}
            />
            <Kpi
              label="Campanhas na amostra"
              value={String(correlationSample.length)}
              icon={<Megaphone className="size-4 text-primary" />}
            />
          </div>

          <Section cols="grid-cols-1">
            <Card>
              <CardTitle
                title="Correlações (Pearson)"
                hint="r entre -1 e 1 · correlação não implica causalidade"
              />
              {loading ? (
                <ChartSkeleton />
              ) : correlationSample.length < 3 ? (
                <EmptyState title="Amostra insuficiente para calcular correlação" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {correlations.map((c) => {
                    const l = rLabel(c.r);
                    return (
                      <div key={c.key} className="rounded-xl border border-border bg-muted/50 p-3">
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xl font-semibold tabular-nums">
                            {c.r === null ? "—" : c.r.toFixed(2)}
                          </span>
                          <span className={`text-[11px] ${l.tone}`}>{l.text}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(c.r ?? 0) >= 0 ? "bg-success" : "bg-destructive"}`}
                            style={{ width: `${Math.min(100, Math.abs(c.r ?? 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </Section>

          <Section cols="grid-cols-1">
            <Card>
              <CardTitle
                title="Defasagem (lag) pós-veiculação"
                hint="Ganho de seguidores/dia em D+1, D+3 e D+7 após o fim da campanha"
              />
              {loading ? (
                <ChartSkeleton />
              ) : lagAnalysis.every((l) => l.n === 0) ? (
                <EmptyState title="Sem série de seguidores após o fim das campanhas" />
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {lagAnalysis.map((l) => {
                      const lab = rLabel(l.rInteractions);
                      return (
                        <div key={l.lag} className="rounded-xl border border-border bg-muted/50 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{l.label}</span>
                            <span className="text-[11px] text-muted-foreground">n={l.n}</span>
                          </div>
                          <div className="mt-1 text-xl font-semibold tabular-nums">
                            {l.avgGainPerDay === null ? "—" : formatNumber(Math.round(l.avgGainPerDay))}
                          </div>
                          <div className="text-[11px] text-muted-foreground">seguidores/dia (média)</div>
                          <div className="mt-2 text-[11px]">
                            vs. baseline:{" "}
                            <span className={(l.vsBaseline ?? 0) >= 0 ? "text-success" : "text-destructive"}>
                              {l.vsBaseline === null
                                ? "—"
                                : `${l.vsBaseline >= 0 ? "+" : ""}${formatNumber(Math.round(l.vsBaseline))}`}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            r interações:{" "}
                            <span className={lab.tone}>
                              {l.rInteractions === null ? "—" : l.rInteractions.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {bestLag && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      Maior correlação com interações em <strong>{bestLag.label}</strong> (r ={" "}
                      {bestLag.rInteractions?.toFixed(2)}) — indica que o efeito das campanhas sobre
                      seguidores tende a aparecer {bestLag.lag} dia(s) após o fim da veiculação.
                    </p>
                  )}
                </>
              )}
            </Card>
          </Section>

          <Section cols="grid-cols-1">
            <Card>
              <CardTitle title="Ganho por campanha e defasagem" hint="Seguidores/dia após o fim da veiculação" />
              <DataTable
                rows={lagSample}
                rowKey={(r) => r.id}
                columns={[
                  { key: "name", header: "Campanha", render: (r) => <span className="truncate">{r.name}</span> },
                  { key: "int", header: "Interações", align: "right", render: (r) => formatNumber(r.interactions) },
                  ...LAGS.map((lag) => ({
                    key: `d${lag}`,
                    header: `D+${lag}`,
                    align: "right" as const,
                    render: (r: EnrichedCampaign) =>
                      r.lagGainPerDay[lag] === null
                        ? "—"
                        : formatNumber(Math.round(r.lagGainPerDay[lag] as number)),
                  })),
                ]}
              />
            </Card>
          </Section>


          <Section cols="grid-cols-1">
            <Card>
              <CardTitle
                title="Interações × ganho de seguidores por dia"
                hint="Cada ponto é uma campanha no seu período de veiculação"
              />
              {loading ? (
                <ChartSkeleton />
              ) : scatterData.length === 0 ? (
                <EmptyState title="Sem dados de seguidores no período das campanhas" />
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <ScatterChart margin={{ top: 8, right: 24, bottom: 16, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Interações"
                      tickFormatter={compact}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Seguidores/dia"
                      tickFormatter={compact}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      {...tooltipStyle}
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(v: number, n: string) => [formatNumber(Number(v)), n]}
                      labelFormatter={() => ""}
                      content={undefined}
                    />
                    <Scatter data={scatterData} fill="hsl(var(--chart-1))" />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Section>

          <Section cols="grid-cols-1">
            <Card>
              <CardTitle title="Seguidores por campanha" hint="Variação no período de veiculação" />
              <DataTable
                rows={correlationSample}
                rowKey={(r) => r.id}
                columns={[
                  { key: "name", header: "Campanha", render: (r) => <span className="truncate">{r.name}</span> },
                  { key: "int", header: "Interações", align: "right", render: (r) => formatNumber(r.interactions) },
                  { key: "views", header: "Visualizações", align: "right", render: (r) => formatNumber(r.views) },
                  {
                    key: "gain",
                    header: "Ganho de seguidores",
                    align: "right",
                    render: (r) => (r.followerGain === null ? "—" : formatNumber(r.followerGain)),
                  },
                  {
                    key: "gpd",
                    header: "Seguidores/dia",
                    align: "right",
                    render: (r) =>
                      r.followerGainPerDay === null ? "—" : formatNumber(Math.round(r.followerGainPerDay)),
                  },
                  {
                    key: "vs",
                    header: "vs. baseline",
                    align: "right",
                    render: (r) =>
                      r.followerGainPerDay === null || baselineGainPerDay === null
                        ? "—"
                        : `${r.followerGainPerDay >= baselineGainPerDay ? "+" : ""}${formatNumber(
                            Math.round(r.followerGainPerDay - baselineGainPerDay),
                          )}`,
                  },
                ]}
              />
            </Card>
          </Section>
        </>
      )}

    </div>
  );
}
