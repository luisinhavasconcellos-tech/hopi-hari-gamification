import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { RefreshCw, Sparkles, Swords } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardTitle,
  EmptyState,
  Kpi,
  PageHeader,
  Pill,
  chartTooltipStyle,
} from "@/components/dashboard/primitives";
import { DataTable, Section } from "@/components/audience/AudienceUI";
import { useAuth } from "@/hooks/useAuth";

type InputRow = {
  week: string;
  slug: string;
  name: string;
  instagram: number | null;
  tiktok: number | null;
  facebook: number | null;
  youtube: number | null;
  linkedin: number | null;
  total_followers: number | null;
  mentions: number | null;
  engagement: number | null;
  sentiment: number | null;
  notes: string | null;
};

type ScoredRow = {
  slug: string;
  name: string;
  is_self: boolean;
  followers: number;
  prevFollowers: number | null;
  delta: number | null;
  deltaPct: number | null;
  mentions: number;
  engagement: number;
  sentiment: number;
  mentionsNorm: number;
  engagementNorm: number;
  sentimentNorm: number;
  score: number;
};

const WEIGHTS = { mentions: 0.4, engagement: 0.3, sentiment: 0.3 };

const LINE_COLORS: Record<string, string> = {
  "hopi-hari": "hsl(var(--primary))",
  "beto-carrero": "hsl(var(--accent))",
  "beach-park": "hsl(var(--chart-3))",
  "hot-park": "hsl(var(--chart-4))",
  "thermas-laranjais": "hsl(var(--chart-5))",
  "wet-n-wild": "hsl(var(--chart-2))",
  "cacau-park": "hsl(var(--warning))",
};

const fmt = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        notation: Math.abs(n) >= 1e6 ? "compact" : "standard",
        maximumFractionDigits: 1,
      }).format(n);

const weekBucket = (isoDate: string) => {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
};

const fmtWeek = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR");

export default function CompetitiveIntelligencePage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<InputRow[]>([]);
  const [insight, setInsight] = useState<{ headline: string; body_ptbr: string; week_ending: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [activeWeek, setActiveWeek] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const client = supabase as any;
    const [{ data }, { data: ins }] = await Promise.all([
      client.from("ci_weekly_input").select("*").order("week"),
      client.from("ci_insights").select("*").order("week_ending", { ascending: false }).limit(1),
    ]);
    setRows((data as InputRow[]) ?? []);
    setInsight((ins?.[0] as any) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Agrupa por semana (segunda-feira) mantendo o registro mais recente de cada parque
  const byWeek = useMemo(() => {
    const map = new Map<string, Map<string, InputRow>>();
    for (const r of rows) {
      const wk = weekBucket(r.week);
      if (!map.has(wk)) map.set(wk, new Map());
      map.get(wk)!.set(r.slug, r);
    }
    return map;
  }, [rows]);

  const weeks = useMemo(() => [...byWeek.keys()].sort(), [byWeek]);

  useEffect(() => {
    if (!activeWeek && weeks.length) setActiveWeek(weeks[weeks.length - 1]);
  }, [weeks, activeWeek]);

  const scored = useMemo<ScoredRow[]>(() => {
    if (!activeWeek) return [];
    const current = byWeek.get(activeWeek);
    if (!current) return [];
    const idx = weeks.indexOf(activeWeek);
    const prev = idx > 0 ? byWeek.get(weeks[idx - 1]) : undefined;

    const list = [...current.values()];
    const maxMentions = Math.max(...list.map((r) => r.mentions ?? 0), 0);
    const maxEngagement = Math.max(...list.map((r) => r.engagement ?? 0), 0);

    return list
      .map((r) => {
        const mentions = r.mentions ?? 0;
        const engagement = r.engagement ?? 0;
        const sentiment = r.sentiment ?? 0;
        const mentionsNorm = maxMentions > 0 ? (mentions / maxMentions) * 100 : 0;
        const engagementNorm = maxEngagement > 0 ? (engagement / maxEngagement) * 100 : 0;
        const sentimentNorm = (sentiment + 100) / 2;
        const followers = r.total_followers ?? 0;
        const prevFollowers = prev?.get(r.slug)?.total_followers ?? null;
        return {
          slug: r.slug,
          name: r.name,
          is_self: r.slug === "hopi-hari",
          followers,
          prevFollowers,
          delta: prevFollowers != null ? followers - prevFollowers : null,
          deltaPct:
            prevFollowers != null && prevFollowers > 0
              ? ((followers - prevFollowers) / prevFollowers) * 100
              : null,
          mentions,
          engagement,
          sentiment,
          mentionsNorm,
          engagementNorm,
          sentimentNorm,
          score:
            mentionsNorm * WEIGHTS.mentions +
            engagementNorm * WEIGHTS.engagement +
            sentimentNorm * WEIGHTS.sentiment,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [activeWeek, byWeek, weeks]);

  const hopi = scored.find((r) => r.is_self);
  const hopiPos = hopi ? scored.indexOf(hopi) + 1 : null;
  const leader = scored[0];
  const above = hopiPos && hopiPos > 1 ? scored[hopiPos - 2] : null;
  const totalMentions = scored.reduce((a, r) => a + r.mentions, 0);
  const shareOfVoice = hopi && totalMentions > 0 ? (hopi.mentions / totalMentions) * 100 : null;
  const competitorsSentiment = scored.filter((r) => !r.is_self);
  const avgCompetitorSentiment = competitorsSentiment.length
    ? competitorsSentiment.reduce((a, r) => a + r.sentiment, 0) / competitorsSentiment.length
    : null;

  const followerSeries = useMemo(() => {
    return weeks.map((wk) => {
      const point: Record<string, number | string> = { week: fmtWeek(wk) };
      for (const [slug, r] of byWeek.get(wk)!) {
        if (r.total_followers != null) point[slug] = r.total_followers;
      }
      return point;
    });
  }, [weeks, byWeek]);

  const slugs = useMemo(() => [...new Set(rows.map((r) => r.slug))], [rows]);
  const nameBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.slug, r.name);
    return m;
  }, [rows]);

  const run = async (fn: "sync-ci-sheet" | "generate-insights", label: string) => {
    setRunning(fn);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: {} });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error ?? "Falha");
      const imported = (data as any)?.imported;
      toast.success(imported != null ? `${label}: ${imported} linhas importadas` : `${label} concluída`);
      await load();
    } catch (e) {
      toast.error(`${label} falhou: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Audience · Inteligência Competitiva"
        title="Ranking Ponderado de Parques"
        subtitle="Dados da planilha «Tracker Semanal de Concorrentes». Score = 40% menções + 30% engajamento médio/post + 30% saldo de sentimento, normalizados 0–100 na semana."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {weeks.length > 0 && (
              <select
                value={activeWeek ?? ""}
                onChange={(e) => setActiveWeek(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
              >
                {[...weeks].reverse().map((w) => (
                  <option key={w} value={w}>
                    Semana de {fmtWeek(w)}
                  </option>
                ))}
              </select>
            )}
            {isAdmin && (
              <>
                {[
                  ["sync-ci-sheet", "Importar planilha"],
                  ["generate-insights", "Gerar insight"],
                ].map(([fn, label]) => (
                  <button
                    key={fn}
                    disabled={running !== null}
                    onClick={() => void run(fn as any, label)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw className={`size-3.5 ${running === fn ? "animate-spin" : ""}`} /> {label}
                  </button>
                ))}
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Posição da Hopi Hari"
          value={loading ? "…" : hopiPos ? `${hopiPos}º de ${scored.length}` : "—"}
          accent="primary"
        />
        <Kpi
          label="Score ponderado"
          value={loading ? "…" : hopi ? hopi.score.toFixed(1) : "—"}
          accent="accent"
        />
        <Kpi
          label="Gap para o líder"
          value={loading ? "…" : hopi && leader ? (leader.score - hopi.score).toFixed(1) : "—"}
          accent="warning"
        />
        <Kpi
          label="Share of voice (menções)"
          value={loading ? "…" : shareOfVoice != null ? `${shareOfVoice.toFixed(1)}%` : "—"}
          accent="success"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Seguidores Hopi Hari"
          value={loading ? "…" : hopi ? fmt(hopi.followers) : "—"}
          delta={hopi?.deltaPct ?? undefined}
          accent="primary"
        />
        <Kpi
          label="Δ seguidores na semana"
          value={loading ? "…" : hopi?.delta != null ? `${hopi.delta >= 0 ? "+" : ""}${fmt(hopi.delta)}` : "—"}
          accent="success"
        />
        <Kpi
          label="Gap para a posição acima"
          value={loading ? "…" : hopi && above ? (above.score - hopi.score).toFixed(1) : "—"}
          accent="warning"
        />
        <Kpi
          label="Sentimento vs. concorrentes"
          value={
            loading
              ? "…"
              : hopi && avgCompetitorSentiment != null
                ? `${hopi.sentiment - avgCompetitorSentiment >= 0 ? "+" : ""}${(hopi.sentiment - avgCompetitorSentiment).toFixed(0)}`
                : "—"
          }
          accent="accent"
        />
      </div>

      {insight && (
        <Section cols="grid-cols-1">
          <Card>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Sparkles className="size-4" />
              <span className="text-[11px] uppercase tracking-wider">
                Insight da semana · {fmtWeek(insight.week_ending)}
              </span>
            </div>
            <h3 className="font-display text-lg mb-2">{insight.headline}</h3>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{insight.body_ptbr}</p>
          </Card>
        </Section>
      )}

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Ranking ponderado da semana"
            hint="Menções e engajamento normalizados pelo maior valor da semana; sentimento = (saldo + 100) ÷ 2"
          />
          {scored.length === 0 ? (
            <EmptyState
              icon={<Swords className="size-5" />}
              title="Sem dados importados"
              description="Preencha a aba «Entrada Semanal» da planilha e clique em «Importar planilha»."
            />
          ) : (
            <DataTable
              rows={scored}
              rowKey={(r) => r.slug}
              columns={[
                { key: "pos", header: "#", render: (r: ScoredRow) => String(scored.indexOf(r) + 1) },
                {
                  key: "name",
                  header: "Parque",
                  render: (r) => (
                    <span className={r.is_self ? "font-semibold text-primary" : ""}>
                      {r.name} {r.is_self && <Pill tone="primary">nós</Pill>}
                    </span>
                  ),
                },
                { key: "followers", header: "Seguidores", align: "right", render: (r) => fmt(r.followers) },
                {
                  key: "delta",
                  header: "Δ semana",
                  align: "right",
                  render: (r) =>
                    r.delta == null ? (
                      "—"
                    ) : (
                      <span className={r.delta >= 0 ? "text-success" : "text-destructive"}>
                        {r.delta >= 0 ? "+" : ""}
                        {fmt(r.delta)}
                      </span>
                    ),
                },
                { key: "mentions", header: "Menções", align: "right", render: (r) => r.mentionsNorm.toFixed(1) },
                { key: "eng", header: "Engaj.", align: "right", render: (r) => r.engagementNorm.toFixed(1) },
                { key: "sent", header: "Sentim.", align: "right", render: (r) => r.sentimentNorm.toFixed(1) },
                {
                  key: "score",
                  header: "Score",
                  align: "right",
                  render: (r) => <span className="font-semibold">{r.score.toFixed(1)}</span>,
                },
              ]}
            />
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Seguidores totais por semana" hint="Soma de Instagram, TikTok, Facebook, YouTube e LinkedIn" />
          {followerSeries.length === 0 ? (
            <EmptyState
              icon={<Swords className="size-5" />}
              title="Sem histórico"
              description="Cada semana preenchida na planilha vira um ponto nesta série."
            />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={followerSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => fmt(Number(v))}
                />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => fmt(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => nameBySlug.get(String(v)) ?? String(v)} />
                {slugs.map((slug) => (
                  <Line
                    key={slug}
                    type="monotone"
                    dataKey={slug}
                    name={slug}
                    stroke={LINE_COLORS[slug] ?? "hsl(var(--muted-foreground))"}
                    strokeWidth={slug === "hopi-hari" ? 2.5 : 1.25}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Seguidores por plataforma — semana ativa" hint="Valores brutos importados da planilha" />
          {activeWeek && byWeek.get(activeWeek) ? (
            <DataTable
              rows={[...byWeek.get(activeWeek)!.values()]}
              rowKey={(r) => r.slug}
              columns={[
                { key: "name", header: "Parque", render: (r: InputRow) => r.name },
                { key: "ig", header: "Instagram", align: "right", render: (r) => fmt(r.instagram) },
                { key: "tt", header: "TikTok", align: "right", render: (r) => fmt(r.tiktok) },
                { key: "fb", header: "Facebook", align: "right", render: (r) => fmt(r.facebook) },
                { key: "yt", header: "YouTube", align: "right", render: (r) => fmt(r.youtube) },
                { key: "li", header: "LinkedIn", align: "right", render: (r) => fmt(r.linkedin) },
                {
                  key: "total",
                  header: "Total",
                  align: "right",
                  render: (r) => <span className="font-semibold">{fmt(r.total_followers)}</span>,
                },
              ]}
            />
          ) : (
            <EmptyState icon={<Swords className="size-5" />} title="Sem dados" description="Importe a planilha." />
          )}
        </Card>
      </Section>
    </div>
  );
}
