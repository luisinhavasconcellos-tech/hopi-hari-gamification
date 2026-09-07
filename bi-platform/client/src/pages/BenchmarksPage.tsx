import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, Card, CardTitle, Kpi, ChartSkeleton, EmptyState } from "@/components/dashboard/primitives";
import { DataTable, Section, compact, tooltipStyle, CHART_COLORS } from "@/components/audience/AudienceUI";
import { fetchFollowerCounts } from "@/lib/followers";
import {
  BENCHMARKS, buildChannelSnapshot, type ChannelSnapshot, type Platform,
  STATUS_COLOR, STATUS_LABEL,
} from "@/lib/kpis";

const PLATFORMS: { key: Platform; table: string; label: string }[] = [
  { key: "instagram", table: "instagram_posts", label: "Instagram" },
  { key: "tiktok", table: "tiktok_posts", label: "TikTok" },
  { key: "facebook", table: "facebook_posts", label: "Facebook" },
  { key: "youtube", table: "youtube_posts", label: "YouTube" },
  { key: "linkedin", table: "linkedin_posts", label: "LinkedIn" },
];

type Competitor = {
  id: number;
  collected_at: string;
  park_name: string;
  followers: number;
  mentions_index: number;
  engagement_index: number;
  excluded: boolean;
  exclusion_note: string | null;
};

const fmt = (n: number) => n.toLocaleString("pt-BR");
const pct = (v: number | null, digits = 2) => (v == null ? "—" : `${v.toFixed(digits)}%`);

// Data-calendário de hoje em São Paulo (toISOString() usaria o dia UTC, que já é "amanhã" depois das 21h).
const todaySaoPaulo = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function BenchmarksPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"canais" | "competidores">("canais");
  const [loading, setLoading] = useState(true);
  const [snaps, setSnaps] = useState<(ChannelSnapshot & { windowDays: number; label: string })[]>([]);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [readingDate, setReadingDate] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [form, setForm] = useState({ park_name: "", followers: "", mentions_index: "", engagement_index: "" });
  const [saving, setSaving] = useState(false);

  const loadCompetitors = useCallback(async () => {
    const { data } = await supabase
      .from("competitor_snapshot")
      .select("*")
      .order("collected_at", { ascending: false })
      .order("followers", { ascending: false });
    const rows = (data ?? []) as Competitor[];
    // Mantém apenas a coleta mais recente de cada parque
    const seen = new Set<string>();
    setCompetitors(rows.filter((r) => (seen.has(r.park_name) ? false : (seen.add(r.park_name), true))));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ counts, total, readingDate: rd }, ...postSets] = await Promise.all([
      fetchFollowerCounts(),
      ...PLATFORMS.map((p) =>
        (supabase as any)
          .from(p.table)
          .select("timestamp,like_count,comments_count,share_count,view_count,media_type")
          .order("timestamp", { ascending: false, nullsFirst: false })
          .limit(500),
      ),
    ]);
    setTotalFollowers(total);
    setReadingDate(rd);
    setSnaps(
      PLATFORMS.map((p, i) => ({
        ...buildChannelSnapshot(p.key, (postSets[i]?.data ?? []) as any, counts[p.key] ?? 0),
        label: p.label,
      })),
    );
    await loadCompetitors();
    setLoading(false);
  }, [loadCompetitors]);

  useEffect(() => { void load(); }, [load]);

  const radarData = useMemo(
    () =>
      snaps.map((s) => ({
        metric: s.label,
        atual: s.erFollowers != null ? Math.min(100, (s.erFollowers / BENCHMARKS[s.platform].er.great) * 100) : 0,
        meta: 100,
        cadencia: Math.min(100, (s.cadencePerWeek / BENCHMARKS[s.platform].postsPerWeek.great) * 100),
      })),
    [snaps],
  );

  const activeCompetitors = competitors.filter((c) => !c.excluded);
  const compChart = useMemo(
    () =>
      [
        { name: "Hopi Hari", followers: totalFollowers, engagement: null as number | null, own: true },
        ...activeCompetitors.map((c) => ({
          name: c.park_name,
          followers: c.followers,
          engagement: c.engagement_index,
          own: false,
        })),
      ].sort((a, b) => b.followers - a.followers),
    [activeCompetitors, totalFollowers],
  );

  const addCompetitor = async () => {
    const name = form.park_name.trim();
    const followers = parseInt(form.followers.replace(/\D/g, ""), 10);
    if (!name || !followers) {
      toast({ title: "Preencha nome e seguidores", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("competitor_snapshot").insert({
      collected_at: todaySaoPaulo(),
      park_name: name,
      followers,
      mentions_index: Math.max(0, Math.min(100, parseInt(form.mentions_index, 10) || 0)),
      engagement_index: Math.max(0, Math.min(100, parseInt(form.engagement_index, 10) || 0)),
      excluded: false,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setForm({ park_name: "", followers: "", mentions_index: "", engagement_index: "" });
    toast({ title: "Concorrente registrado" });
    await loadCompetitors();
  };

  const toggleExcluded = async (c: Competitor) => {
    const { error } = await supabase.from("competitor_snapshot").update({ excluded: !c.excluded }).eq("id", c.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else await loadCompetitors();
  };

  return (
    <div className="px-5 lg:px-8 py-6">
      <PageHeader
        eyebrow="Social · Benchmarks"
        title="Benchmarks de Mercado"
        subtitle="Desempenho real dos canais do Hopi Hari contra as metas do setor e contra os concorrentes coletados manualmente."
        actions={
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" /> Atualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label={`Seguidores somados${readingDate ? ` (${readingDate})` : ""}`} value={fmt(totalFollowers)} />
        <Kpi label="Canais com posts coletados" value={String(snaps.filter((s) => s.postsTotal > 0).length)} />
        <Kpi label="Concorrentes ativos" value={String(activeCompetitors.length)} />
        <Kpi
          label="Canais no benchmark de engajamento"
          value={String(snaps.filter((s) => s.erStatus !== "below").length)}
        />
      </div>

      <div className="mt-6 flex gap-2">
        {(["canais", "competidores"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              tab === t
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {t === "canais" ? "Canais vs. metas do setor" : "Concorrentes"}
          </button>
        ))}
      </div>

      {tab === "canais" && (
        <>
          <Section cols="grid-cols-1">
            <Card>
              <CardTitle
                title="Canais vs. benchmark do setor"
                hint="Cada canal usa sua própria janela de análise (7 a 90 dias conforme cadência)"
              />
              {loading ? (
                <ChartSkeleton height={240} />
              ) : (
                <DataTable
                  rows={snaps}
                  rowKey={(r) => r.platform}
                  columns={[
                    { key: "canal", header: "Canal", render: (r) => r.label },
                    { key: "seg", header: "Seguidores", align: "right", render: (r) => (r.followers ? fmt(r.followers) : "—") },
                    { key: "posts", header: "Posts na janela", align: "right", render: (r) => `${r.postsLast7d} (${r.windowDays}d)` },
                    { key: "cad", header: "Posts/semana", align: "right", render: (r) => r.cadencePerWeek.toFixed(1) },
                    {
                      key: "er",
                      header: "Engajamento",
                      align: "right",
                      render: (r) => (
                        <span className={`rounded-md border px-2 py-0.5 text-[11px] ${STATUS_COLOR[r.erStatus]}`}>
                          {pct(r.erFollowers)} · {STATUS_LABEL[r.erStatus]}
                        </span>
                      ),
                    },
                    { key: "meta", header: "Meta do setor", align: "right", render: (r) => `${BENCHMARKS[r.platform].er.great}%` },
                    { key: "reach", header: "Reach rate", align: "right", render: (r) => pct(r.reachRate, 1) },
                    { key: "share", header: "Share rate", align: "right", render: (r) => pct(r.shareRate) },
                  ]}
                />
              )}
            </Card>
          </Section>

          <Section cols="grid-cols-1">
            <Card>
              <CardTitle title="Atingimento das metas (100 = meta do setor)" hint="Engajamento e cadência normalizados pelo benchmark de cada rede" />
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Radar name="Engajamento" dataKey="atual" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.22} strokeWidth={2} />
                    <Radar name="Cadência" dataKey="cadencia" stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} fillOpacity={0.12} strokeWidth={2} />
                    <Radar name="Meta" dataKey="meta" stroke={CHART_COLORS[2]} fill="none" strokeDasharray="4 4" strokeWidth={1} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Section>
        </>
      )}

      {tab === "competidores" && (
        <>
          <Section cols="grid-cols-1">
            <Card>
              <CardTitle
                title="Seguidores — Hopi Hari x concorrentes"
                hint="Hopi Hari = soma das redes monitoradas; concorrentes = coleta manual mais recente"
              />
              {loading ? (
                <ChartSkeleton height={260} />
              ) : compChart.length <= 1 ? (
                <EmptyState title="Nenhum concorrente cadastrado" description="Adicione concorrentes abaixo para comparar com dados reais." />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, compChart.length * 44)}>
                  <BarChart data={compChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="followers" radius={[0, 6, 6, 0]} fill={CHART_COLORS[0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Section>

          <Section cols="grid-cols-1">
            <Card>
              <CardTitle title="Base de concorrentes" hint="Índices de menções e engajamento em escala 0–100 (Beto Carrero = 100 na coleta base)" />
              {competitors.length === 0 ? (
                <EmptyState title="Sem concorrentes" />
              ) : (
                <DataTable
                  rows={competitors}
                  rowKey={(r) => String(r.id)}
                  columns={[
                    { key: "nome", header: "Parque", render: (r) => r.park_name },
                    { key: "seg", header: "Seguidores", align: "right", render: (r) => fmt(r.followers) },
                    { key: "men", header: "Índice menções", align: "right", render: (r) => r.mentions_index },
                    { key: "eng", header: "Índice engajamento", align: "right", render: (r) => r.engagement_index },
                    { key: "col", header: "Coleta", align: "right", render: (r) => r.collected_at },
                    {
                      key: "st",
                      header: "Status",
                      align: "right",
                      render: (r) =>
                        isAdmin ? (
                          <button
                            onClick={() => void toggleExcluded(r)}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <Trash2 className="size-3" /> {r.excluded ? "Reativar" : "Excluir"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">{r.excluded ? "Excluído" : "Ativo"}</span>
                        ),
                    },
                  ]}
                />
              )}
            </Card>
          </Section>

          {isAdmin && (
            <Section cols="grid-cols-1">
              <Card>
                <CardTitle title="Adicionar concorrente" hint="Registra uma nova coleta com a data de hoje" />
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {([
                    ["park_name", "Parque", "text"],
                    ["followers", "Seguidores", "text"],
                    ["mentions_index", "Índice menções (0-100)", "number"],
                    ["engagement_index", "Índice engajamento (0-100)", "number"],
                  ] as const).map(([key, label, type]) => (
                    <label key={key} className="text-xs text-muted-foreground">
                      {label}
                      <input
                        type={type}
                        value={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
                      />
                    </label>
                  ))}
                  <button
                    onClick={() => void addCompetitor()}
                    disabled={saving}
                    className="self-end inline-flex items-center justify-center gap-2 rounded-lg bg-primary/15 border border-primary/30 px-3 py-2 text-sm text-primary disabled:opacity-50"
                  >
                    <Plus className="size-4" /> {saving ? "Salvando…" : "Adicionar"}
                  </button>
                </div>
              </Card>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
