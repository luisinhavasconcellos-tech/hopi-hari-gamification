import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AlertTriangle, BookOpen, CalendarRange, ChevronDown, Download, ExternalLink, Gauge, HelpCircle, Info, Lightbulb, TrendingDown, TrendingUp, Users, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardTitle, EmptyState, Kpi } from "@/components/dashboard/primitives";
import { CHART_COLORS, DataTable, Section, compact, tooltipStyle } from "@/components/audience/AudienceUI";
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import {
  CLUSTER_OPTIONS,
  THEME_OPTIONS,
  themeFilterLabel,
  themeFilterKey,
  type ThemeFilter,
  PERIOD_OPTIONS,
  buildPeriodSnapshot,
  useReputationCorrelation,
} from "@/hooks/useReputationCorrelation";
import { formatNumber } from "@/lib/format";
import {
  exportCorrelationCsv,
  exportCorrelationPdf,
  type CorrelationExport,
} from "@/lib/exportReputationCorrelation";
import { formatCiPct, formatCiR, proportionTest, type ProportionTest } from "@/lib/stats";
import { buildCorrelationNarrative } from "@/lib/correlationNarrative";

const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;
const n1 = (v: number) => v.toFixed(1).replace(".", ",");
const n2 = (v: number) => v.toFixed(2).replace(".", ",");
const pp = (v: number) => `${v > 0 ? "+" : ""}${n1(v)} p.p.`;
const pText = (p: number | null) =>
  p == null ? "p indisponível" : p < 0.001 ? "p < 0,001" : `p = ${p.toFixed(3).replace(".", ",")}`;

const strength = (r: number | null) => {
  if (r == null) return "amostra insuficiente";
  const a = Math.abs(r);
  if (a >= 0.7) return "forte";
  if (a >= 0.4) return "moderada";
  if (a >= 0.2) return "fraca";
  return "praticamente nula";
};

function SigBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
        ok ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
      }`}
    >
      {ok ? "estatisticamente significativa (p<0,05)" : "não conclusivo com a amostra atual"}
    </span>
  );
}

function StatTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <TooltipUI>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <HelpCircle className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-xs text-xs">
          <div className="space-y-2">
            <p className="font-semibold">{label}</p>
            {children}
          </div>
        </TooltipContent>
      </TooltipUI>
    </TooltipProvider>
  );
}



/** Taxa com IC 95% — mostra “não conclusivo” quando a amostra é pequena. */
function RateWithCi({ test, alert = 50 }: { test: ProportionTest; alert?: number }) {
  const rate = test.rate * 100;
  return (
    <div className="text-right leading-tight">
      <span className={test.lowSample ? "text-muted-foreground" : rate >= alert ? "text-destructive" : ""}>
        {pct(rate, 0)}
      </span>
      <div className="text-[10px] text-muted-foreground">
        {test.lowSample ? `n=${test.n} · não conclusivo` : `IC ${formatCiPct(test.ci)}`}
      </div>
    </div>
  );
}

/** Valor atual x período anterior, com variação. */
function Delta({
  label,
  current,
  previous,
  delta,
  digits = 1,
  suffix = "",
  invert = false,
}: {
  label: string;
  current: string;
  previous: string;
  delta: number | null;
  digits?: number;
  suffix?: string;
  invert?: boolean;
}) {
  const up = (delta ?? 0) > 0;
  const good = delta == null || delta === 0 ? null : invert ? !up : up;
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl">{current}</p>
      <div className="mt-1 flex items-center gap-1.5 text-[11px]">
        {delta == null ? (
          <span className="text-muted-foreground">sem base anterior</span>
        ) : (
          <>
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            <span className={good == null ? "text-muted-foreground" : good ? "text-success" : "text-destructive"}>
              {delta > 0 ? "+" : ""}
              {delta.toFixed(digits)}
              {suffix}
            </span>
            <span className="text-muted-foreground">vs. {previous}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReputationCorrelation({ days = 365 }: { days?: number }) {
  const [period, setPeriod] = useState<number>(days);
  const [segment, setSegment] = useState<string>("all");
  /** cluster secundário para comparação lado a lado ("none" = desligado) */
  const [segmentB, setSegmentB] = useState<string>("none");
  /** lista de clusters selecionados para comparação em tabela vs. período anterior */
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const toggleCluster = (c: string) =>
    setSelectedClusters((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  /** tipos de reclamação selecionados (fila, VIP, preço, conforto…) — vazio = todas */
  const [themes, setThemes] = useState<string[]>([]);
  /** como combinar múltiplas categorias: "any" = qualquer uma, "all" = todas juntas */
  const [themeMode, setThemeMode] = useState<"any" | "all">("any");
  /** comparação lado a lado de duas janelas independentes */
  const [cmpA, setCmpA] = useState<number>(30);
  const [cmpB, setCmpB] = useState<number>(90);
  /** período B fixo por datas específicas (ex: 01/01/2025 a 31/12/2025) */
  const [useFixedB, setUseFixedB] = useState(false);
  const [fixedFrom, setFixedFrom] = useState("2025-01-01");
  const [fixedTo, setFixedTo] = useState("2025-12-31");

  /** guia em linguagem simples para não especialistas */
  const [showGuide, setShowGuide] = useState(true);

  const theme = useMemo<ThemeFilter>(() => ({ themes, mode: themeMode }), [themes, themeMode]);
  const themeLabel = themeFilterLabel(theme);
  const toggleTheme = (t: string) =>
    setThemes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const {
    loading,
    classified,
    allClassified,
    areasRides,
    areaSignals,
    themeSignals,
    clusterSignals,
    correlationVolumeComplaints,
    volumeComplaintTest,
    volumeNegativeTest,
    baselineNegRate,
    coverage,
    comparison,
    trend,
    segmentCounts,
    themeCounts,
  } = useReputationCorrelation(period, segment, theme);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? `${period} dias`;

  const labelOf = (d: number) => PERIOD_OPTIONS.find((p) => p.value === d)?.label ?? `${d} dias`;

  const snapA = useMemo(
    () => buildPeriodSnapshot(allClassified, areasRides, cmpA, segment, theme),
    [allClassified, areasRides, cmpA, segment, theme],
  );
  /** janela B: relativa (últimos N dias) ou fixa entre duas datas */
  const fixedRange = useMemo(() => {
    const from = new Date(`${fixedFrom}T00:00:00`).getTime();
    const to = new Date(`${fixedTo}T23:59:59`).getTime();
    return Number.isFinite(from) && Number.isFinite(to) && to > from ? { from, to } : null;
  }, [fixedFrom, fixedTo]);

  const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
  const labelB = useFixedB
    ? fixedRange
      ? `${fmtDate(fixedFrom)} – ${fmtDate(fixedTo)}`
      : "datas inválidas"
    : labelOf(cmpB);

  const snapB = useMemo(() => {
    if (useFixedB) {
      const list = fixedRange
        ? allClassified.filter(
            (c) => c.at != null && c.at >= fixedRange.from && c.at <= fixedRange.to,
          )
        : [];
      return buildPeriodSnapshot(list, areasRides, 100000, segment, theme);
    }
    return buildPeriodSnapshot(allClassified, areasRides, cmpB, segment, theme);
  }, [allClassified, areasRides, cmpB, segment, theme, useFixedB, fixedRange]);


  /** variação percentual relativa entre as duas janelas (A em relação a B) */
  const relDelta = (a: number, b: number) => (b === 0 ? null : ((a - b) / Math.abs(b)) * 100);

  const cmpThemes = useMemo(() => {
    const mapA = new Map(snapA.themes.map((t) => [t.theme, t]));
    const mapB = new Map(snapB.themes.map((t) => [t.theme, t]));
    const keys = [...new Set([...mapA.keys(), ...mapB.keys()])];
    return keys
      .map((name) => {
        const a = mapA.get(name);
        const b = mapB.get(name);
        return {
          theme: name,
          shareA: a?.share ?? 0,
          shareB: b?.share ?? 0,
          negA: a?.negativeRate ?? 0,
          negB: b?.negativeRate ?? 0,
          mentionsA: a?.mentions ?? 0,
          mentionsB: b?.mentions ?? 0,
          shareDelta: relDelta(a?.share ?? 0, b?.share ?? 0),
          negDelta: (a?.negativeRate ?? 0) - (b?.negativeRate ?? 0),
        };
      })
      .sort((x, y) => y.mentionsA + y.mentionsB - (x.mentionsA + x.mentionsB));
  }, [snapA, snapB]);

  /**
   * Comparação de dois clusters na mesma janela (atual x anterior),
   * com a diferença de correlação entre eles. `segmentB === "none"` = desligado.
   */
  const clusterCompare = useMemo(() => {
    if (segmentB === "none") return null;
    const now = Date.now();
    const span = period * 864e5;
    const inRange = (at: number | null, from: number, to: number) =>
      at == null ? period >= 365 && to >= now : at >= from && at < to;
    const cur = allClassified.filter((c) => inRange(c.at, now - span, now + 1));
    const prev = allClassified.filter((c) => inRange(c.at, now - 2 * span, now - span));

    const build = (seg: string) => {
      const s = buildPeriodSnapshot(cur, areasRides, 100000, seg, theme);
      const p = buildPeriodSnapshot(prev, areasRides, 100000, seg, theme);
      return {
        segment: seg,
        label: seg === "all" ? "Todos os clusters" : seg,
        current: s,
        previous: p,
        correlationDelta:
          s.correlation != null && p.correlation != null ? s.correlation - p.correlation : null,
        negativeDelta: p.reviews ? s.negativeRate - p.negativeRate : null,
      };
    };

    const a = build(segment);
    const b = build(segmentB);
    return {
      a,
      b,
      /** diferença de correlação entre os dois clusters na janela atual */
      gapCurrent:
        a.current.correlation != null && b.current.correlation != null
          ? a.current.correlation - b.current.correlation
          : null,
      /** a mesma diferença na janela anterior — mostra se o gap aumentou ou diminuiu */
      gapPrevious:
        a.previous.correlation != null && b.previous.correlation != null
          ? a.previous.correlation - b.previous.correlation
          : null,
    };
  }, [allClassified, areasRides, period, segment, segmentB, theme]);

  /**
   * Lista de clusters selecionados: r, % negativas e IC comparados com o período anterior.
   */
  const clusterList = useMemo(() => {
    if (!selectedClusters.length) return [];
    const now = Date.now();
    const span = period * 864e5;
    const inRange = (at: number | null, from: number, to: number) =>
      at == null ? period >= 365 && to >= now : at >= from && at < to;
    const cur = allClassified.filter((c) => inRange(c.at, now - span, now + 1));
    const prev = allClassified.filter((c) => inRange(c.at, now - 2 * span, now - span));

    return selectedClusters.map((seg) => {
      const s = buildPeriodSnapshot(cur, areasRides, 100000, seg, theme);
      const p = buildPeriodSnapshot(prev, areasRides, 100000, seg, theme);
      return {
        segment: seg,
        label: seg === "all" ? "Todos os clusters" : seg,
        current: s,
        previous: p,
        rDelta:
          s.correlation != null && p.correlation != null ? s.correlation - p.correlation : null,
        negDelta: p.reviews ? s.negativeRate - p.negativeRate : null,
      };
    });
  }, [allClassified, areasRides, period, selectedClusters, theme]);


  /** Como a correlação de cada tipo de reclamação evolui: janela atual x janela anterior */

  const themeBreakdown = useMemo(() => {
    const now = Date.now();
    const span = period * 864e5;
    const inRange = (at: number | null, from: number, to: number) =>
      at == null ? period >= 365 && to >= now : at != null && at >= from && at < to;
    const bySegment = (c: (typeof allClassified)[number]) =>
      segment === "all" || c.clusters.includes(segment);

    return THEME_OPTIONS.map((name) => {
      const cur = allClassified.filter(
        (c) => bySegment(c) && c.themes.includes(name) && inRange(c.at, now - span, now + 1),
      );
      const prev = allClassified.filter(
        (c) => bySegment(c) && c.themes.includes(name) && inRange(c.at, now - 2 * span, now - span),
      );
      const s = buildPeriodSnapshot(cur, areasRides, 100000, "all", "all");
      const p = buildPeriodSnapshot(prev, areasRides, 100000, "all", "all");
      const topArea = [...s.areas].sort((a, b) => b.gap - a.gap)[0] ?? null;
      return {
        theme: name,
        reviews: s.reviews,
        prevReviews: p.reviews,
        negativeRate: s.negativeRate,
        negativeDelta: p.reviews ? s.negativeRate - p.negativeRate : null,
        correlation: s.correlation,
        correlationTest: s.correlationTest,
        correlationDelta:
          s.correlation != null && p.correlation != null ? s.correlation - p.correlation : null,
        topArea: topArea && topArea.mentions > 0 ? topArea.area : null,
        topCluster: s.clusters[0]?.cluster ?? null,
      };
    })
      .filter((t) => t.reviews > 0 || t.prevReviews > 0)
      .sort((a, b) => b.reviews - a.reviews);
  }, [allClassified, areasRides, period, segment]);

  const exportPayload = (): CorrelationExport => ({
    periodLabel,
    segment,
    coverage,
    volumeComplaintTest,
    volumeNegativeTest,
    comparison,
    areaSignals,
    themeSignals,
    clusterSignals,
  });

  const exportBar = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Download className="size-3.5" /> Exportar
      </span>
      <button
        type="button"
        disabled={coverage.total === 0}
        onClick={() => exportCorrelationCsv(exportPayload())}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        CSV
      </button>
      <button
        type="button"
        disabled={coverage.total === 0}
        onClick={() => exportCorrelationPdf(exportPayload())}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        PDF
      </button>
    </div>
  );

  const filterBar = (
    <Card className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <CalendarRange className="size-3.5" /> Período
          </span>
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Users className="size-3.5" /> Segmento
          </span>
          <button
            type="button"
            onClick={() => setSegment("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              segment === "all"
                ? "bg-accent text-accent-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({segmentCounts.total})
          </button>
          {CLUSTER_OPTIONS.map((c) => {
            const n = segmentCounts.byCluster.get(c) ?? 0;
            return (
              <button
                key={c}
                type="button"
                disabled={n === 0}
                onClick={() => setSegment(c)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                  segment === c
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c} ({n})
              </button>
            );
          })}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Gauge className="size-3.5" /> Tipos de reclamação
          </span>
          <button
            type="button"
            onClick={() => setThemes([])}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              themes.length === 0
                ? "bg-secondary text-secondary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Todas ({themeCounts.total})
          </button>
          {THEME_OPTIONS.map((t) => {
            const n = themeCounts.byTheme.get(t) ?? 0;
            const on = themes.includes(t);
            return (
              <button
                key={t}
                type="button"
                disabled={n === 0 && !on}
                onClick={() => toggleTheme(t)}
                aria-pressed={on}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                  on
                    ? "bg-secondary text-secondary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {on ? "✓ " : ""}
                {t} ({n})
              </button>
            );
          })}
          {themes.length > 1 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border p-0.5">
              {(["any", "all"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setThemeMode(m)}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    themeMode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "any" ? "Qualquer uma (OU)" : "Todas juntas (E)"}
                </button>
              ))}
            </span>
          )}
          {themes.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              Combinação ativa: {themeLabel} · {classified.length} avaliações
              <button
                type="button"
                onClick={() => setThemes([])}
                className="ml-2 underline underline-offset-2 hover:text-foreground"
              >
                limpar
              </button>
            </span>
          )}
        </div>
        {exportBar}
      </div>
    </Card>
  );


  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  /** "inherit" usa o período da página; um número abre uma janela própria no drill-down */
  const [drillPeriod, setDrillPeriod] = useState<number | "inherit">("inherit");

  const drillDays = drillPeriod === "inherit" ? period : drillPeriod;
  const drillPeriodLabel =
    PERIOD_OPTIONS.find((p) => p.value === drillDays)?.label ?? `${drillDays} dias`;

  /** recorte do drill-down: janela própria + mesmo filtro de segmento da página */
  const drillWindows = useMemo(() => {
    const now = Date.now();
    const span = drillDays * 864e5;
    const inRange = (at: number | null, from: number, to: number) =>
      at == null ? drillDays >= 365 && to >= now : at >= from && at < to;
    const bySegment = (c: (typeof allClassified)[number]) =>
      segment === "all" || c.clusters.includes(segment);
    return {
      current: allClassified.filter((c) => bySegment(c) && inRange(c.at, now - span, now + 1)),
      previous: allClassified.filter((c) => bySegment(c) && inRange(c.at, now - 2 * span, now - span)),
    };
  }, [allClassified, drillDays, segment]);

  const buildDrill = (list: typeof allClassified, area: string) => {
    const hits = list.filter((c) => c.areas.includes(area));
    const negatives = hits.filter((h) => h.negative).length;
    const base = hits.length ? negatives / hits.length : baselineNegRate;

    const themeMap = new Map<string, { mentions: number; negatives: number }>();
    for (const h of hits) {
      for (const t of h.themes) {
        const cur = themeMap.get(t) ?? { mentions: 0, negatives: 0 };
        cur.mentions += 1;
        if (h.negative) cur.negatives += 1;
        themeMap.set(t, cur);
      }
    }
    const themes = [...themeMap]
      .map(([theme, v]) => ({
        theme,
        mentions: v.mentions,
        negatives: v.negatives,
        share: hits.length ? (v.mentions / hits.length) * 100 : 0,
      }))
      .sort((a, b) => b.negatives - a.negatives || b.mentions - a.mentions);

    const clusterMap = new Map<string, { reviews: number; negatives: number; themes: Map<string, number> }>();
    for (const h of hits) {
      for (const cl of h.clusters) {
        const cur = clusterMap.get(cl) ?? { reviews: 0, negatives: 0, themes: new Map<string, number>() };
        cur.reviews += 1;
        if (h.negative) {
          cur.negatives += 1;
          for (const t of h.themes) cur.themes.set(t, (cur.themes.get(t) ?? 0) + 1);
        }
        clusterMap.set(cl, cur);
      }
    }
    const clusters = [...clusterMap]
      .map(([cluster, v]) => ({
        cluster,
        reviews: v.reviews,
        negatives: v.negatives,
        negativeRate: v.reviews ? (v.negatives / v.reviews) * 100 : 0,
        share: hits.length ? (v.reviews / hits.length) * 100 : 0,
        topTheme: [...v.themes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
        negTest: proportionTest(v.negatives, v.reviews, baselineNegRate),
      }))
      .sort((a, b) => b.negatives - a.negatives || b.reviews - a.reviews);

    return {
      area,
      hits,
      themes,
      clusters,
      negatives,
      negativeRate: hits.length ? (negatives / hits.length) * 100 : 0,
      baseRate: base,
      areaTest: proportionTest(negatives, hits.length, baselineNegRate),
    };
  };

  const drill = useMemo(
    () => (selectedArea ? buildDrill(drillWindows.current, selectedArea) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedArea, drillWindows, baselineNegRate],
  );

  const drillPrev = useMemo(
    () => (selectedArea ? buildDrill(drillWindows.previous, selectedArea) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedArea, drillWindows, baselineNegRate],
  );

  /** variações entre a janela atual e a anterior — mostra o que piorou/melhorou */
  const drillDeltas = useMemo(() => {
    if (!drill || !drillPrev) return null;
    const prevThemes = new Map(drillPrev.themes.map((t) => [t.theme, t]));
    const prevClusters = new Map(drillPrev.clusters.map((c) => [c.cluster, c]));
    return {
      comparable: drillPrev.hits.length >= 3 && drill.hits.length >= 3,
      reviewsDelta: drill.hits.length - drillPrev.hits.length,
      negRateDelta: drillPrev.hits.length ? drill.negativeRate - drillPrev.negativeRate : null,
      themes: drill.themes.map((t) => ({
        ...t,
        prevMentions: prevThemes.get(t.theme)?.mentions ?? 0,
        mentionsDelta: t.mentions - (prevThemes.get(t.theme)?.mentions ?? 0),
      })),
      clusters: drill.clusters.map((c) => {
        const prev = prevClusters.get(c.cluster);
        return {
          ...c,
          prevReviews: prev?.reviews ?? 0,
          reviewsDelta: c.reviews - (prev?.reviews ?? 0),
          rateDelta: prev && prev.reviews ? c.negativeRate - prev.negativeRate : null,
        };
      }),
    };
  }, [drill, drillPrev]);

  /**
   * Leitura rápida. Fica ANTES de qualquer return antecipado (regra dos hooks)
   * e depende de `themeKey` — string estável — em vez do objeto `theme`,
   * que muda de identidade a cada render e travava/dessincronizava o memo.
   */
  const themeKey = themeFilterKey(theme);
  const narrative = useMemo(
    () =>
      buildCorrelationNarrative({
        periodLabel,
        segment,
        theme: themeLabel,
        coverage,
        volumeComplaintTest,
        volumeNegativeTest,
        comparison,
        areaSignals,
        themeSignals,
        clusterSignals,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      periodLabel,
      segment,
      themeKey,
      themeLabel,
      coverage,
      volumeComplaintTest,
      volumeNegativeTest,
      comparison,
      areaSignals,
      themeSignals,
      clusterSignals,
    ],
  );

  /** Painel por métrica: cada indicador com amostra, IC 95%, p-valor e status. */
  const metricPanel = useMemo(() => {
    const rows: {
      id: string;
      label: string;
      value: string;
      detail: string;
      n: number;
      minN: number;
      significant: boolean | null;
      tooltip: React.ReactNode;
    }[] = [
      {
        id: "vol-mencoes",
        label: "Volume × menções",
        value: volumeComplaintTest.r == null ? "—" : n2(volumeComplaintTest.r),
        detail: `IC 95% ${formatCiR(volumeComplaintTest.ci)} · ${pText(volumeComplaintTest.p)}`,
        n: volumeComplaintTest.n,
        minN: 4,
        significant: volumeComplaintTest.r == null ? null : volumeComplaintTest.significant,
        tooltip: (
          <>
            <p>
              Mede se áreas mais movimentadas do parque também recebem mais menções. Exemplo: se <strong>r = 0,75</strong>,
              áreas com 20% de rides concentram mais que 20% das reclamações — sinal de pressão real no visitante.
            </p>
            <p>
              <strong>IC 95%</strong>: se a faixa incluir 0, não dá para afirmar que volume e menções estão ligados.
              <strong>p &lt; 0,05</strong>: chance menor que 5% de essa relação ser mero acaso.
            </p>
            <p className="text-muted-foreground">Aqui precisamos de 4+ áreas com dados pareados.</p>
          </>
        ),
      },
      {
        id: "vol-negativas",
        label: "Volume × taxa de negativas",
        value: volumeNegativeTest.r == null ? "—" : n2(volumeNegativeTest.r),
        detail: `IC 95% ${formatCiR(volumeNegativeTest.ci)} · ${pText(volumeNegativeTest.p)}`,
        n: volumeNegativeTest.n,
        minN: 4,
        significant: volumeNegativeTest.r == null ? null : volumeNegativeTest.significant,
        tooltip: (
          <>
            <p>
              Mede se áreas lotadas geram avaliações negativas proporcionalmente. Exemplo: <strong>r = -0,30</strong>
              significa que, no recorte, mais volume acompanha menos negativas — pode indicar boa operação ou fluxo
              bem distribuído.
            </p>
            <p>
              <strong>r negativo</strong> não é “bom” automaticamente: confira o IC e a amostra. Se n &lt; 4, o valor é
              instável.
            </p>
          </>
        ),
      },
      {
        id: "taxa-negativas",
        label: "Taxa de negativas no recorte",
        value: `${n1(comparison.current.negativeRate)}%`,
        detail: comparison.comparable
          ? `vs. ${n1(comparison.previous.negativeRate)}% na janela anterior (${
              comparison.negativeRateDelta == null ? "—" : pp(comparison.negativeRateDelta)
            })`
          : "sem janela anterior comparável",
        n: comparison.current.reviews,
        minN: 30,
        significant: null,
        tooltip: (
          <>
            <p>
              Proporção de avaliações classificadas como negativas no período/cluster/categorias atuais. Exemplo: se
              12% são negativas e o IC 95% é 9%-15%, o valor real provavelmente está nessa faixa.
            </p>
            <p>
              A comparação com a janela anterior só é confiável quando ambas têm 30+ avaliações; com menos que isso, a
              variação pode ser apenas sorte da amostra.
            </p>
          </>
        ),
      },
      {
        id: "cobertura-area",
        label: "Cobertura por área",
        value: `${n1(coverage.areaCoverage)}%`,
        detail: `${coverage.total} avaliações classificadas no recorte`,
        n: coverage.total,
        minN: 30,
        significant: null,
        tooltip: (
          <>
            <p>
              Percentual de áreas do parque mencionadas pelo menos uma vez no recorte. Exemplo: 60% de cobertura com
              50 avaliações é mais robusto que 60% com 8 avaliações — o número absoluto importa.
            </p>
            <p>Cobertura baixa + poucas avaliações significa que rankings de áreas podem mudar bastante com novos dados.</p>
          </>
        ),
      },
      {
        id: "cobertura-tema",
        label: "Cobertura por tema",
        value: `${n1(coverage.themeCoverage)}%`,
        detail: `${themeSignals.length} temas com menções · ${clusterSignals.length} clusters`,
        n: coverage.total,
        minN: 30,
        significant: null,
        tooltip: (
          <>
            <p>
              Percentual de categorias de reclamação (fila, preço, conforto, etc.) detectadas no recorte. Mostra se o
              painel está capturando a diversidade de problemas ou só um tema muito específico.
            </p>
            <p>
              Quando filtramos muitas categorias de uma só vez (modo <em>Todas juntas</em>), a cobertura tende a cair,
              pois exigimos que uma avaliação tenha todos os temas selecionados.
            </p>
          </>
        ),
      },
    ];
    return rows;
  }, [
    volumeComplaintTest,
    volumeNegativeTest,
    comparison,
    coverage,
    themeSignals.length,
    clusterSignals.length,
  ]);


  /** Alerta de amostra: consolida todos os motivos de baixa confiabilidade. */
  const sampleAlert = useMemo(() => {
    const reasons: string[] = [];
    if (coverage.total > 0 && coverage.total < 30)
      reasons.push(`apenas ${coverage.total} avaliações no recorte (mínimo recomendado: 30)`);
    if (coverage.lowSample) reasons.push("cobertura de classificação abaixo do recomendado");
    if (volumeComplaintTest.n < 4)
      reasons.push(`só ${volumeComplaintTest.n} áreas com dados pareados (Pearson exige 4+)`);
    const weakClusters = clusterSignals.filter((c) => c.negTest.lowSample).length;
    if (weakClusters > 0)
      reasons.push(`${weakClusters} cluster(s) com amostra insuficiente para conclusão`);
    if (!comparison.comparable) reasons.push("janela anterior sem dados suficientes para comparar");
    return reasons;
  }, [coverage, volumeComplaintTest.n, clusterSignals, comparison.comparable]);


  if (loading) {
    return (
      <>
        {filterBar}
        <Card className="mt-4">
          <CardTitle title="Correlação reputação × parque × clusters" />
          <p className="text-sm text-muted-foreground">Calculando correlações…</p>
        </Card>
      </>
    );
  }

  if (coverage.total === 0) {
    return (
      <>
        {filterBar}
        <Card className="mt-4">
          <CardTitle title="Correlação reputação × parque × clusters" />
          <EmptyState
            title="Sem avaliações neste recorte"
            description={`Nenhuma avaliação em ${periodLabel}${
              segment === "all" ? "" : ` para o segmento ${segment}`
            }. Amplie o período ou sincronize ReclameAqui e TripAdvisor.`}
          />
        </Card>
      </>
    );
  }

  const worstArea = [...areaSignals].sort((a, b) => b.gap - a.gap)[0];
  const topTheme = themeSignals[0];
  /** só destaca clusters com amostra suficiente; senão o "pior" é ruído */
  const worstCluster =
    clusterSignals.find((c) => !c.negTest.lowSample) ?? clusterSignals[0];

  const scatter = areaSignals.map((a) => ({
    x: a.ridesShare,
    y: a.mentionShare,
    z: Math.max(a.mentions, 1),
    area: a.area,
  }));



  return (
    <>
      {filterBar}

      <Card className="mt-4">
        <CardTitle
          title="Leitura rápida: o que mudou nesta seleção"
          hint="Resumo automático dos números atuais, com intervalo de confiança e significância"
        />
        <p className="mt-2 text-sm text-foreground/90">{narrative.headline}</p>
        {narrative.caveat && (
          <p className="mt-2 inline-flex items-start gap-1.5 rounded-md bg-warning/10 px-2.5 py-1.5 text-[11px] text-warning">
            <AlertTriangle className="mt-px size-3 shrink-0" />
            {narrative.caveat}
          </p>
        )}
        <ul className="mt-3 space-y-2.5">
          {narrative.lines.map((l) => (
            <li key={l.id} className="flex gap-2.5">
              <span
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                  l.tone === "bad"
                    ? "bg-destructive"
                    : l.tone === "good"
                      ? "bg-success"
                      : l.tone === "warning"
                        ? "bg-warning"
                        : "bg-muted-foreground"
                }`}
              />
              <div>
                <p className="text-sm leading-snug text-foreground/90">{l.text}</p>
                {l.stat && <p className="mt-0.5 text-[11px] text-muted-foreground">{l.stat}</p>}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground/80">Como ler os números</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <p>
              <strong className="text-foreground">r (Pearson)</strong> — varia de -1 a 1. Exemplo: r = 0,7 significa
              que, quando uma série sobe, a outra tende a subir forte; r = -0,2 é uma relação fraca e invertida. A força
              é interpretada: &lt;0,2 praticamente nula; 0,2-0,4 fraca; 0,4-0,7 moderada; ≥0,7 forte.
            </p>
            <p>
              <strong className="text-foreground">IC 95%</strong> — faixa provável do valor real. Se o IC para r
              incluir 0, a correlação pode ser só acaso. Se o IC para uma taxa incluir a média histórica, a diferença
              não é conclusiva. Quanto mais dados, mais estreito fica o IC.
            </p>
            <p>
              <strong className="text-foreground">p-valor</strong> — probabilidade de o resultado acontecer ao acaso.
              p &lt; 0,05 é o limiar usual: abaixo disso, a relação é considerada estatisticamente significativa. p
              entre 0,05 e 0,10 é uma tendência; acima de 0,10, não conclusivo.
            </p>
          </div>
          <p className="mt-2">
            Passe o mouse sobre o ícone <HelpCircle className="inline size-3" /> em cada métrica ou no alerta de amostra
            para ver exemplos práticos específicos do indicador.
          </p>
        </div>

      </Card>

      {/* --- Guia simples para não estatísticos --- */}
      <Card className="mt-4">
        <button
          type="button"
          onClick={() => setShowGuide((s) => !s)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <span className="font-display text-sm font-medium">Guia rápido: o que significa cada número</span>
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">para não especialistas</span>
          </div>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${showGuide ? "rotate-180" : ""}`}
          />
        </button>

        {showGuide && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <p className="text-sm text-foreground/80">
              A página de correlação cruza dados do parque (volume de embarques) com avaliações do ReclameAqui e
              TripAdvisor. Aqui está o que cada símbolo e cor quer dizer, sem fórmulas complicadas.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/15 text-xs font-semibold text-primary">r</span>
                  <p className="text-sm font-medium">Correlação (r)</p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Mede o quanto duas coisas andam juntas. Vai de <strong className="text-foreground">-1</strong> a{" "}
                  <strong className="text-foreground">+1</strong>.
                </p>
                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  <li>
                    <strong className="text-foreground">+0,80</strong> — áreas lotadas recebem muito mais reclamações.
                  </li>
                  <li>
                    <strong className="text-foreground">-0,30</strong> — áreas lotadas recebem menos reclamações (relação invertida).
                  </li>
                  <li>
                    <strong className="text-foreground">0,05</strong> — quase nenhuma relação; o volume não explica a reclamação.
                  </li>
                </ul>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Regra simples: quanto mais próximo de 1 ou -1, mais forte é a ligação. O sinal (+ ou -) só diz a direção.
                </p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-accent/15 text-xs font-semibold text-accent">IC</span>
                  <p className="text-sm font-medium">IC 95%</p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  É a faixa de valores prováveis. Pense como a margem de erro das pesquisas eleitorais.
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Exemplo: se aparece <strong className="text-foreground">r = 0,60 (IC 0,20 a 0,90)</strong>, o valor real
                  provavelmente está entre 0,20 e 0,90. Como a faixa não toca no 0, a relação é confiável.
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Se o IC incluir o 0, não dá para garantir que existe relação — pode ser acaso.
                </p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-secondary/20 text-xs font-semibold text-secondary-foreground">p</span>
                  <p className="text-sm font-medium">p-valor</p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Probabilidade de o resultado ser sorte da amostra. Usamos o limiar clássico de 5%.
                </p>
                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  <li>
                    <strong className="text-foreground">p &lt; 0,05</strong> — resultado confiável (menos de 5% de chance de ser acaso).
                  </li>
                  <li>
                    <strong className="text-foreground">0,05 a 0,10</strong> — tendência, mas ainda não conclusivo.
                  </li>
                  <li>
                    <strong className="text-foreground">p &gt; 0,10</strong> — não dá para tirar conclusão com segurança.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-success/15 text-xs font-semibold text-success">p.p.</span>
                  <p className="text-sm font-medium">p.p. (ponto percentual)</p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Diferença direta entre duas porcentagens. Não é o mesmo que porcento.
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Exemplo: a taxa de negativas subiu de <strong className="text-foreground">10%</strong> para{" "}
                  <strong className="text-foreground">13%</strong>. Isso é{" "}
                  <strong className="text-foreground">+3 p.p.</strong> (e não +30%).
                </p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-semibold text-foreground">n</span>
                  <p className="text-sm font-medium">n (tamanho da amostra)</p>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Quantidade de avaliações ou áreas usadas no cálculo. Quanto maior, mais confiável.
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Regra prática: <strong className="text-foreground">n &lt; 30</strong> avaliações é exploratório;{" "}
                  <strong className="text-foreground">n &lt; 4</strong> áreas pareadas não permite calcular r de forma segura.
                </p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-warning" />
                  <p className="text-sm font-medium">Cores e sinais</p>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-destructive" />
                    <span>
                      <strong className="text-foreground">Vermelho</strong> — alerta: correlação forte positiva ou piora clara.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success" />
                    <span>
                      <strong className="text-foreground">Verde</strong> — alívio: correlação negativa ou melhora clara.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-warning" />
                    <span>
                      <strong className="text-foreground">Amarelo</strong> — atenção: amostra pequena ou resultado não conclusivo.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-muted-foreground" />
                    <span>
                      <strong className="text-foreground">Cinza</strong> — neutro: sem relação ou mudança mínima.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="text-[11px] leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground/80">Como usar este painel em 3 passos</p>
                  <ol className="mt-1 list-decimal space-y-1 pl-4">
                    <li>
                      Olhe primeiro a <strong className="text-foreground">Leitura rápida</strong> e o{" "}
                      <strong className="text-foreground">Alerta de amostra</strong>. Se o alerta estiver amarelo, amplie o
                      período ou remova filtros antes de decidir.
                    </li>
                    <li>
                      Confira o <strong className="text-foreground">Painel por métrica</strong> para ver se o r tem IC que
                      não toca no 0 e p &lt; 0,05. Se sim, a relação é real.
                    </li>
                    <li>
                      Use o <strong className="text-foreground">drill-down por área</strong> para descobrir qual atração ou
                      setor puxa o resultado, e em qual cluster o problema é mais forte.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>


      {sampleAlert.length > 0 && (
        <Card className="mt-4 border-warning/30 bg-warning/5">
          <div className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-warning">Alerta de amostra nesta seleção</p>
                <StatTooltip label="Por que a amostra importa?">
                  <p>
                    Métricas baseadas em poucas observações são instáveis: adicionar uma única avaliação pode mudar o
                    ranking de áreas, o r de correlação ou a taxa de negativas.
                  </p>
                  <p>
                    <strong>Regra prática:</strong> com menos de 30 avaliações, trate qualquer comparação como
                    exploratória; com menos de 4 áreas pareadas, o r de Pearson não é confiável.
                  </p>
                  <p className="text-muted-foreground">
                    O IC 95% já reflete essa incerteza: quanto mais estreito, mais preciso é o valor mostrado.
                  </p>
                </StatTooltip>
              </div>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                {sampleAlert.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Amplie o período, remova filtros de cluster/categoria ou sincronize novas avaliações antes de tomar
                decisão com estes números.
              </p>
            </div>
          </div>
        </Card>
      )}


      <Card className="mt-4">
        <CardTitle
          title="Painel por métrica"
          hint={`Cada indicador com amostra, IC 95% e significância · ${periodLabel} · ${
            segment === "all" ? "todos os clusters" : segment
          } · ${themeLabel}`}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metricPanel.map((m) => {
            const low = m.n < m.minN;
            return (
              <div key={m.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
                  <StatTooltip label={m.label}>{m.tooltip}</StatTooltip>
                </div>
                <p className="mt-1 font-display text-2xl">{m.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{m.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                    n = {m.n}
                  </span>
                  {low ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning">
                      <AlertTriangle className="size-2.5" /> amostra baixa (mín. {m.minN})
                    </span>
                  ) : m.significant == null ? null : (
                    <SigBadge ok={m.significant} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </Card>




      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label={`Correlação volume × reclamação · IC95% ${formatCiR(volumeComplaintTest.ci)} · ${volumeComplaintTest.label}`}
          value={correlationVolumeComplaints == null ? "—" : correlationVolumeComplaints.toFixed(2)}
          icon={<Gauge className="size-4 text-primary" />}
        />
        <Kpi
          label={`Área mais citada acima do volume · gap ${worstArea ? pct(worstArea.gap) : "—"}${
            worstArea?.negTest.lowSample ? " · não conclusivo" : ""
          }`}
          value={worstArea?.area ?? "—"}
          icon={<AlertTriangle className="size-4 text-warning" />}
          accent="warning"
        />
        <Kpi
          label={`Tema com mais negativas · ${topTheme ? topTheme.negatives : 0} de ${topTheme?.mentions ?? 0} · IC95% ${formatCiPct(topTheme?.negTest.ci ?? null)}`}
          value={topTheme?.theme ?? "—"}
          icon={<AlertTriangle className="size-4 text-destructive" />}
          accent="accent"
        />
        <Kpi
          label={`Cluster que mais reclama · ${worstCluster ? pct(worstCluster.negativeRate) : "—"} (IC95% ${formatCiPct(worstCluster?.negTest.ci ?? null)})`}
          value={worstCluster?.cluster ?? "—"}
          icon={<Users className="size-4 text-success" />}
          accent="success"
        />
      </div>

      <Section cols="grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardTitle
            title={`Como a correlação muda no tempo · ${periodLabel}`}
            hint={`${periodLabel} atual vs. ${periodLabel} anterior${segment === "all" ? "" : ` · segmento ${segment}`}`}
          />
          {!comparison.comparable && (
            <p className="mb-3 text-xs text-warning">
              Comparação apenas indicativa: {comparison.current.reviews} avaliações no período atual e{" "}
              {comparison.previous.reviews} no anterior (mínimo sugerido: 5 em cada).
            </p>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Delta
              label="Correlação volume × menções"
              current={comparison.current.correlation == null ? "—" : comparison.current.correlation.toFixed(2)}
              previous={comparison.previous.correlation == null ? "—" : comparison.previous.correlation.toFixed(2)}
              delta={comparison.correlationDelta == null ? null : comparison.correlationDelta}
              digits={2}
            />
            <Delta
              label="% negativas"
              current={pct(comparison.current.negativeRate, 0)}
              previous={pct(comparison.previous.negativeRate, 0)}
              delta={comparison.negativeRateDelta}
              digits={0}
              suffix=" p.p."
              invert
            />
            <Delta
              label="Avaliações"
              current={formatNumber(comparison.current.reviews)}
              previous={formatNumber(comparison.previous.reviews)}
              delta={comparison.reviewsDelta}
              digits={0}
            />
          </div>

          {/* --- segundo cluster na comparação --- */}
          <div className="mt-4 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Users className="size-3.5" /> Comparar com 2º cluster
              </span>
              <button
                type="button"
                onClick={() => setSegmentB("none")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  segmentB === "none"
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Nenhum
              </button>
              {CLUSTER_OPTIONS.filter((c) => c !== segment).map((c) => {
                const n = segmentCounts.byCluster.get(c) ?? 0;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={n === 0}
                    onClick={() => setSegmentB(c)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                      segmentB === c
                        ? "bg-accent text-accent-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c} ({n})
                  </button>
                );
              })}
            </div>

            {clusterCompare && (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[clusterCompare.a, clusterCompare.b].map((s, i) => (
                    <div key={s.segment} className="rounded-lg border border-border/60 bg-muted/50 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {i === 0 ? "Cluster A" : "Cluster B"} · {s.label}
                      </p>
                      <p className="mt-1 font-display text-xl">
                        r = {s.current.correlation == null ? "—" : n2(s.current.correlation)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {periodLabel} anterior:{" "}
                        {s.previous.correlation == null ? "—" : n2(s.previous.correlation)}
                        {s.correlationDelta != null && (
                          <>
                            {" "}
                            ({s.correlationDelta > 0 ? "+" : ""}
                            {n2(s.correlationDelta)})
                          </>
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatNumber(s.current.reviews)} avaliações · {pct(s.current.negativeRate, 0)} negativas · IC{" "}
                        {formatCiR(s.current.correlationTest.ci)}
                      </p>
                      <SigBadge ok={!!s.current.correlationTest.significant} />
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Delta
                    label="Diferença de correlação (A − B)"
                    current={clusterCompare.gapCurrent == null ? "—" : n2(clusterCompare.gapCurrent)}
                    previous={
                      clusterCompare.gapPrevious == null ? "—" : n2(clusterCompare.gapPrevious)
                    }
                    delta={
                      clusterCompare.gapCurrent != null && clusterCompare.gapPrevious != null
                        ? clusterCompare.gapCurrent - clusterCompare.gapPrevious
                        : null
                    }
                    digits={2}
                  />
                  <Delta
                    label="Diferença de % negativas (A − B)"
                    current={pct(
                      clusterCompare.a.current.negativeRate - clusterCompare.b.current.negativeRate,
                      0,
                    )}
                    previous={pct(
                      clusterCompare.a.previous.negativeRate - clusterCompare.b.previous.negativeRate,
                      0,
                    )}
                    delta={
                      clusterCompare.a.previous.reviews || clusterCompare.b.previous.reviews
                        ? clusterCompare.a.current.negativeRate -
                          clusterCompare.b.current.negativeRate -
                          (clusterCompare.a.previous.negativeRate -
                            clusterCompare.b.previous.negativeRate)
                        : null
                    }
                    digits={0}
                    suffix=" p.p."
                    invert
                  />
                </div>

                <p className="mt-2 text-[11px] text-muted-foreground">
                  {clusterCompare.gapCurrent == null
                    ? "Sem correlação calculável em um dos clusters nesta janela — amostra insuficiente."
                    : `Na janela atual, ${clusterCompare.a.label} tem correlação ${
                        clusterCompare.gapCurrent > 0 ? "maior" : "menor"
                      } que ${clusterCompare.b.label} em ${n2(Math.abs(clusterCompare.gapCurrent))} pontos de r${
                        clusterCompare.gapPrevious != null
                          ? ` (no período anterior a diferença era de ${n2(
                              Math.abs(clusterCompare.gapPrevious),
                            )}).`
                          : "."
                      }`}
                  {(clusterCompare.a.current.reviews < 5 || clusterCompare.b.current.reviews < 5) &&
                    " Ao menos um dos clusters está com amostra baixa: trate a diferença como indicativa."}
                </p>
              </>
            )}
          </div>

          {/* --- lista de clusters selecionáveis vs. período anterior --- */}
          <div className="mt-4 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Users className="size-3.5" /> Lista de clusters (r, % negativas e IC vs. período anterior)
              </span>
              {CLUSTER_OPTIONS.map((c) => {
                const n = segmentCounts.byCluster.get(c) ?? 0;
                const on = selectedClusters.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={n === 0}
                    onClick={() => toggleCluster(c)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                      on
                        ? "bg-accent text-accent-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c} ({n})
                  </button>
                );
              })}
              {selectedClusters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedClusters([])}
                  className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>

            {clusterList.length === 0 ? (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Selecione um ou mais clusters para comparar correlação, % de avaliações negativas e
                intervalo de confiança contra o período anterior ({periodLabel}).
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[12px]">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3">Cluster</th>
                      <th className="py-2 pr-3">Avaliações</th>
                      <th className="py-2 pr-3">r atual</th>
                      <th className="py-2 pr-3">r anterior</th>
                      <th className="py-2 pr-3">Δ r</th>
                      <th className="py-2 pr-3">IC 95% (r)</th>
                      <th className="py-2 pr-3">% negativas</th>
                      <th className="py-2 pr-3">Δ p.p.</th>
                      <th className="py-2">Significância</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusterList.map((row) => (
                      <tr key={row.segment} className="border-t border-border/60">
                        <td className="py-2 pr-3 font-medium">{row.label}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {formatNumber(row.current.reviews)}{" "}
                          <span className="text-[11px]">
                            (ant. {formatNumber(row.previous.reviews)})
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          {row.current.correlation == null ? "—" : n2(row.current.correlation)}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {row.previous.correlation == null ? "—" : n2(row.previous.correlation)}
                        </td>
                        <td
                          className={`py-2 pr-3 ${
                            row.rDelta == null
                              ? "text-muted-foreground"
                              : row.rDelta > 0
                                ? "text-destructive"
                                : "text-success"
                          }`}
                        >
                          {row.rDelta == null
                            ? "—"
                            : `${row.rDelta > 0 ? "+" : ""}${n2(row.rDelta)}`}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {formatCiR(row.current.correlationTest.ci)}
                        </td>
                        <td className="py-2 pr-3">{pct(row.current.negativeRate, 0)}</td>
                        <td
                          className={`py-2 pr-3 ${
                            row.negDelta == null
                              ? "text-muted-foreground"
                              : row.negDelta > 0
                                ? "text-destructive"
                                : "text-success"
                          }`}
                        >
                          {row.negDelta == null
                            ? "—"
                            : `${row.negDelta > 0 ? "+" : ""}${row.negDelta.toFixed(0)}`}
                        </td>
                        <td className="py-2">
                          {row.current.reviews < 5 ? (
                            <span className="text-[11px] text-muted-foreground">amostra baixa</span>
                          ) : (
                            <SigBadge ok={!!row.current.correlationTest.significant} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>



          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="l" domain={[-1, 1]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) =>
                    v == null ? "—" : name === "Correlação" ? v.toFixed(2) : `${v.toFixed(0)}%`
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="l"
                  type="monotone"
                  dataKey="correlation"
                  name="Correlação"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  yAxisId="r"
                  type="monotone"
                  dataKey="negativeRate"
                  name="% negativas"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Cada ponto agrega uma sub-janela do período; sub-janelas com menos de 3 áreas citadas não geram correlação
            (linha interrompida).
          </p>
        </Card>

        <Card>
          <CardTitle
            title="Volume de avaliações por sub-janela"
            hint="Confirma se a variação da correlação vem de mudança real ou de amostra"
          />
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatNumber(v)} />
                <Bar dataKey="reviews" name="Avaliações" fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Confiabilidade estatística"
            hint="Intervalos de confiança de 95% e testes de significância aplicados antes de qualquer leitura"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/50 p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Rides × menções por área</p>
              <p className="mt-1 text-lg font-semibold">
                r = {volumeComplaintTest.r == null ? "—" : volumeComplaintTest.r.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                IC95% {formatCiR(volumeComplaintTest.ci)} · n = {volumeComplaintTest.n} · {volumeComplaintTest.label}
              </p>
              <SigBadge ok={volumeComplaintTest.significant} />
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/50 p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Rides × taxa de negativas</p>
              <p className="mt-1 text-lg font-semibold">
                r = {volumeNegativeTest.r == null ? "—" : volumeNegativeTest.r.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                IC95% {formatCiR(volumeNegativeTest.ci)} · n = {volumeNegativeTest.n} · {volumeNegativeTest.label}
              </p>
              <SigBadge ok={volumeNegativeTest.significant} />
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/50 p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Taxa base de negativas</p>
              <p className="mt-1 text-lg font-semibold">{pct(baselineNegRate * 100)}</p>
              <p className="text-xs text-muted-foreground">
                Referência usada nos testes por área, tema e cluster · {formatNumber(coverage.total)} avaliações
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Segmentos com n &lt; {coverage.minSegmentN} ou IC maior que 40 pontos aparecem como “não conclusivo”.
              </p>
            </div>
          </div>
        </Card>
      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Detalhamento por tipo de reclamação"
            hint={`Como a correlação de cada categoria muda em ${periodLabel} vs. o período anterior · clique para somar/remover a categoria da combinação`}
          />
          {themeBreakdown.length === 0 ? (
            <EmptyState title="Sem reclamações classificadas por categoria nesta janela." />
          ) : (
            <div className="mt-3">
              <DataTable
                rows={themeBreakdown}
                rowKey={(r) => r.theme}
                onRowClick={(r) => toggleTheme(r.theme)}
                isRowActive={(r) => themes.includes(r.theme)}
                columns={[
                  {
                    key: "theme",
                    header: "Categoria",
                    render: (t) => (
                      <span>
                        {t.theme}
                        {t.topArea && (
                          <span className="block text-[10px] text-muted-foreground">
                            área mais citada: {t.topArea}
                            {t.topCluster ? ` · cluster: ${t.topCluster}` : ""}
                          </span>
                        )}
                      </span>
                    ),
                  },
                  {
                    key: "reviews",
                    header: "Avaliações",
                    align: "right",
                    render: (t) => (
                      <span>
                        {formatNumber(t.reviews)}
                        <span className="block text-[10px] text-muted-foreground">
                          anterior: {formatNumber(t.prevReviews)}
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: "neg",
                    header: "Negativas",
                    align: "right",
                    render: (t) => (
                      <span>
                        {pct(t.negativeRate)}
                        <span
                          className={`block text-[10px] ${
                            t.negativeDelta == null
                              ? "text-muted-foreground"
                              : t.negativeDelta > 0
                                ? "text-destructive"
                                : "text-success"
                          }`}
                        >
                          {t.negativeDelta == null
                            ? "sem base anterior"
                            : `${t.negativeDelta > 0 ? "+" : ""}${t.negativeDelta.toFixed(1)} p.p.`}
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: "corr",
                    header: "Correlação volume × menções",
                    align: "right",
                    render: (t) => (
                      <span>
                        {t.correlation != null ? t.correlation.toFixed(2) : "—"}
                        <span className="block text-[10px] text-muted-foreground">
                          {t.correlation == null || t.reviews < 5
                            ? "não conclusivo"
                            : `IC ${formatCiR(t.correlationTest.ci)} · p=${
                                t.correlationTest.p != null ? t.correlationTest.p.toFixed(3) : "—"
                              }`}
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: "delta",
                    header: "Δ correlação",
                    align: "right",
                    render: (t) =>
                      t.correlationDelta == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={t.correlationDelta > 0 ? "text-destructive" : "text-success"}>
                          {t.correlationDelta > 0 ? "+" : ""}
                          {t.correlationDelta.toFixed(2)}
                        </span>
                      ),
                  },
                ]}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {themes.length === 0
                  ? "Nenhuma categoria filtrada — toda a página mostra as reclamações somadas. Clique em uma ou mais linhas para combinar categorias."
                  : `Filtrando por ${themeLabel}${
                      themes.length > 1
                        ? themeMode === "all"
                          ? " (avaliações que citam todas essas categorias ao mesmo tempo)"
                          : " (avaliações que citam qualquer uma dessas categorias)"
                        : ""
                    }: gráficos, áreas, clusters, tendência e comparação de períodos usam esse recorte.`}
              </p>
            </div>
          )}
        </Card>
      </Section>


      <Section cols="grid-cols-1">
        <Card>
          <CardTitle
            title="Comparar dois períodos lado a lado"
            hint="Mesma tela, duas janelas independentes — correlação, negativas e temas"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Período A</span>
              <select
                value={cmpA}
                onChange={(e) => setCmpA(Number(e.target.value))}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Período B</span>
              <select
                value={useFixedB ? "fixed" : String(cmpB)}
                onChange={(e) => {
                  if (e.target.value === "fixed") setUseFixedB(true);
                  else {
                    setUseFixedB(false);
                    setCmpB(Number(e.target.value));
                  }
                }}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
                <option value="fixed">Datas específicas…</option>
              </select>
              {useFixedB && (
                <>
                  <input
                    type="date"
                    value={fixedFrom}
                    onChange={(e) => setFixedFrom(e.target.value)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">até</span>
                  <input
                    type="date"
                    value={fixedTo}
                    onChange={(e) => setFixedTo(e.target.value)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFixedFrom("2025-01-01");
                      setFixedTo("2025-12-31");
                    }}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Ano 2025
                  </button>
                </>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              Segmento: {segment === "all" ? "todos" : segment} ·{" "}
              {useFixedB
                ? `B fixo em ${labelB}`
                : "janelas contadas a partir de hoje"}
            </span>
          </div>


          {snapA.reviews === 0 && snapB.reviews === 0 ? (
            <EmptyState title="Sem avaliações nas janelas selecionadas." />
          ) : (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  {
                    label: "Avaliações",
                    a: formatNumber(snapA.reviews),
                    b: formatNumber(snapB.reviews),
                    delta: relDelta(snapA.reviews, snapB.reviews),
                    suffix: "%",
                    invert: true,
                  },
                  {
                    label: "Taxa de negativas",
                    a: pct(snapA.negativeRate),
                    b: pct(snapB.negativeRate),
                    delta: snapA.negativeRate - snapB.negativeRate,
                    suffix: " p.p.",
                    invert: true,
                  },
                  {
                    label: "Correlação volume × menções",
                    a: snapA.correlation != null ? snapA.correlation.toFixed(2) : "—",
                    b: snapB.correlation != null ? snapB.correlation.toFixed(2) : "—",
                    delta:
                      snapA.correlation != null && snapB.correlation != null
                        ? snapA.correlation - snapB.correlation
                        : null,
                    suffix: "",
                    invert: false,
                  },
                ].map((row) => (
                  <div key={row.label} className="rounded-lg border border-border p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{row.label}</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">A · {labelOf(cmpA)}</p>
                        <p className="font-display text-xl">{row.a}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">B · {labelB}</p>
                        <p className="font-display text-xl text-muted-foreground">{row.b}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px]">
                      {row.delta == null ? (
                        <span className="text-muted-foreground">sem base para comparar</span>
                      ) : (
                        <span
                          className={
                            row.delta === 0
                              ? "text-muted-foreground"
                              : (row.delta > 0) === !row.invert
                                ? "text-success"
                                : "text-destructive"
                          }
                        >
                          {row.delta > 0 ? "+" : ""}
                          {row.delta.toFixed(row.suffix === "" ? 2 : 1)}
                          {row.suffix} de A vs. B
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-medium">A · {labelOf(cmpA)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Correlação {strength(snapA.correlation)} · IC {formatCiR(snapA.correlationTest.ci)} · p=
                    {snapA.correlationTest.p != null ? snapA.correlationTest.p.toFixed(3) : "—"}
                  </p>
                  <SigBadge ok={!!snapA.correlationTest.significant} />
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-medium">B · {labelB}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Correlação {strength(snapB.correlation)} · IC {formatCiR(snapB.correlationTest.ci)} · p=
                    {snapB.correlationTest.p != null ? snapB.correlationTest.p.toFixed(3) : "—"}
                  </p>
                  <SigBadge ok={!!snapB.correlationTest.significant} />
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium">Temas — participação e negativas nas duas janelas</p>
                <DataTable
                  rows={cmpThemes.slice(0, 12)}
                  rowKey={(r) => r.theme}
                  columns={[
                    {
                      key: "theme",
                      header: "Tema",
                      render: (t) => (
                        <span>
                          {t.theme}
                          <span className="block text-[10px] text-muted-foreground">
                            {t.mentionsA} menções em A · {t.mentionsB} em B
                          </span>
                        </span>
                      ),
                    },
                    {
                      key: "a",
                      header: `Share A (${labelOf(cmpA)})`,
                      align: "right",
                      render: (t) => pct(t.shareA),
                    },
                    {
                      key: "b",
                      header: `Share B (${labelB})`,
                      align: "right",
                      render: (t) => pct(t.shareB),
                    },
                    {
                      key: "d",
                      header: "Δ share",
                      align: "right",
                      render: (t) =>
                        t.shareDelta == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={t.shareDelta > 0 ? "text-destructive" : "text-success"}>
                            {t.shareDelta > 0 ? "+" : ""}
                            {t.shareDelta.toFixed(0)}%
                          </span>
                        ),
                    },
                    {
                      key: "neg",
                      header: "Δ negativas",
                      align: "right",
                      render: (t) => (
                        <span className={t.negDelta > 0 ? "text-destructive" : t.negDelta < 0 ? "text-success" : ""}>
                          {t.negDelta > 0 ? "+" : ""}
                          {t.negDelta.toFixed(1)} p.p.
                        </span>
                      ),
                    },
                  ]}
                />

              </div>
            </>
          )}
        </Card>
      </Section>


      <Section cols="grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardTitle
            title="Áreas do parque: volume operacional × menções"
            hint="Clique em uma área para abrir o drill-down com reclamações, temas e clusters"
          />
          <div className="h-[300px]">
            <ResponsiveContainer>
              <BarChart
                data={areaSignals}
                onClick={(s) => {
                  const label = s?.activeLabel == null ? null : String(s.activeLabel);
                  if (label) setSelectedArea((cur) => (cur === label ? null : label));
                }}
              >
                <CartesianGrid strokeDasharray="3 6" stroke="hsl(0 0% 100% / 0.06)" vertical={false} />
                <XAxis dataKey="area" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(0 0% 100% / 0.04)" }} formatter={(v: number) => pct(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ridesShare" name="% das rides" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} className="cursor-pointer">
                  {areaSignals.map((a) => (
                    <Cell key={a.area} fillOpacity={!selectedArea || selectedArea === a.area ? 1 : 0.25} />
                  ))}
                </Bar>
                <Bar dataKey="mentionShare" name="% das menções" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} className="cursor-pointer">
                  {areaSignals.map((a) => (
                    <Cell key={a.area} fillOpacity={!selectedArea || selectedArea === a.area ? 1 : 0.25} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>


        <Card>
          <CardTitle
            title="Mapa de atrito por área"
            hint="Diagonal = reclamação proporcional ao uso; acima da diagonal = reputação pior que o volume explica"
          />
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ScatterChart margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="hsl(0 0% 100% / 0.06)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="% rides"
                  unit="%"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="% menções"
                  unit="%"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <ZAxis type="number" dataKey="z" range={[60, 320]} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) => (n === "z" ? formatNumber(v) : pct(Number(v)))}
                  labelFormatter={() => ""}
                  content={({ payload }) => {
                    const p = payload?.[0]?.payload as { area: string; x: number; y: number; z: number } | undefined;
                    if (!p) return null;
                    return (
                      <div className="rounded-md border border-border bg-background/95 px-3 py-2 text-xs">
                        <div className="font-medium">{p.area}</div>
                        <div className="text-muted-foreground">{pct(p.x)} das rides</div>
                        <div className="text-muted-foreground">{pct(p.y)} das menções</div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={scatter}
                  className="cursor-pointer"
                  onClick={(p) => {
                    const area = (p as unknown as { area?: string })?.area;
                    if (area) setSelectedArea((cur) => (cur === area ? null : area));
                  }}
                >
                  {scatter.map((s, i) => (
                    <Cell
                      key={s.area}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={!selectedArea || selectedArea === s.area ? 1 : 0.25}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      {drill && (
        <Section cols="grid-cols-1">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CardTitle
                title={`Drill-down · ${drill.area}`}
                hint={`${formatNumber(drill.hits.length)} avaliações citam esta área · ${formatNumber(drill.negatives)} negativas · ${pct(
                  drill.areaTest.rate * 100,
                  0,
                )} (IC95% ${formatCiPct(drill.areaTest.ci)})${drill.areaTest.lowSample ? " · não conclusivo" : ""}`}
              />

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <CalendarRange className="size-3.5" /> Janela
                </span>
                <button
                  type="button"
                  onClick={() => setDrillPeriod("inherit")}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    drillPeriod === "inherit"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Igual à página ({periodLabel})
                </button>
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setDrillPeriod(p.value)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      drillPeriod === p.value
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedArea(null)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" /> Fechar
                </button>
              </div>
            </div>

            {drillDeltas && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    label: `Avaliações · ${drillPeriodLabel}`,
                    value: formatNumber(drill.hits.length),
                    delta: `${drillDeltas.reviewsDelta >= 0 ? "+" : ""}${formatNumber(drillDeltas.reviewsDelta)} vs. anterior (${formatNumber(
                      drillPrev?.hits.length ?? 0,
                    )})`,
                    worse: drillDeltas.reviewsDelta > 0,
                  },
                  {
                    label: "% negativas",
                    value: pct(drill.negativeRate, 0),
                    delta:
                      drillDeltas.negRateDelta == null
                        ? "sem base anterior"
                        : `${drillDeltas.negRateDelta >= 0 ? "+" : ""}${drillDeltas.negRateDelta.toFixed(1)} p.p. vs. ${pct(
                            drillPrev?.negativeRate ?? 0,
                            0,
                          )}`,
                    worse: (drillDeltas.negRateDelta ?? 0) > 0,
                  },
                  {
                    label: "Cluster mais forte agora",
                    value: drill.clusters[0]?.cluster ?? "—",
                    delta: drillPrev?.clusters[0]
                      ? `anterior: ${drillPrev.clusters[0].cluster}`
                      : "sem base anterior",
                    worse: false,
                  },
                ].map((c) => (
                  <div key={c.label} className="rounded-lg border border-border/60 bg-muted/50 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</p>
                    <p className="mt-1 text-lg font-semibold">{c.value}</p>
                    <p className={`text-[11px] ${c.worse ? "text-destructive" : "text-muted-foreground"}`}>{c.delta}</p>
                  </div>
                ))}
                {!drillDeltas.comparable && (
                  <p className="sm:col-span-3 text-[11px] text-muted-foreground">
                    Comparação com poucas avaliações na janela anterior — trate as variações como indicativas.
                  </p>
                )}
              </div>
            )}

            {drill.hits.length === 0 ? (
              <EmptyState
                title="Nenhuma avaliação cita esta área"
                description={`Nenhuma avaliação em ${drillPeriodLabel} menciona atrações desta área. Amplie a janela do drill-down.`}
              />
            ) : (
              <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Temas mais frequentes</p>
                  {drill.themes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem tema identificado nos textos.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(drillDeltas?.themes ?? drill.themes.map((t) => ({ ...t, mentionsDelta: null as number | null, prevMentions: 0 }))).map((t) => (
                        <li key={t.theme} className="rounded-lg border border-border/60 bg-muted/50 px-3 py-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{t.theme}</span>
                            <span className="text-muted-foreground">{formatNumber(t.mentions)} · {pct(t.share, 0)}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                            <div className="h-full rounded-full bg-destructive" style={{ width: `${Math.min(t.share, 100)}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatNumber(t.negatives)} negativas
                            {t.mentionsDelta != null && (
                              <span className={t.mentionsDelta > 0 ? " text-destructive" : t.mentionsDelta < 0 ? " text-success" : ""}>
                                {" · "}
                                {t.mentionsDelta >= 0 ? "+" : ""}
                                {formatNumber(t.mentionsDelta)} vs. janela anterior
                              </span>
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Clusters que puxam o resultado</p>
                  <DataTable
                    rows={drillDeltas?.clusters ?? drill.clusters.map((c) => ({ ...c, reviewsDelta: null as number | null, prevReviews: 0, rateDelta: null as number | null }))}
                    rowKey={(r) => r.cluster}
                    maxHeight="max-h-[320px]"
                    columns={[
                      { key: "cluster", header: "Cluster", width: "w-[32%]", render: (r) => <span className="font-medium">{r.cluster}</span> },
                      { key: "reviews", header: "Aval.", align: "right", render: (r) => formatNumber(r.reviews) },
                      {
                        key: "neg",
                        header: "% neg. (IC95%)",
                        align: "right",
                        render: (r) => <RateWithCi test={r.negTest} />,
                      },
                      {
                        key: "delta",
                        header: "Δ período",
                        align: "right",
                        render: (r) =>
                          r.reviewsDelta == null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={r.reviewsDelta > 0 ? "text-destructive" : r.reviewsDelta < 0 ? "text-success" : "text-muted-foreground"}>
                              {r.reviewsDelta >= 0 ? "+" : ""}
                              {formatNumber(r.reviewsDelta)}
                              {r.rateDelta != null && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  ({r.rateDelta >= 0 ? "+" : ""}
                                  {r.rateDelta.toFixed(0)} p.p.)
                                </span>
                              )}
                            </span>
                          ),
                      },
                      { key: "theme", header: "Principal dor", render: (r) => r.topTheme ?? "—" },
                    ]}
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Reclamações citadas</p>
                  <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {[...drill.hits]
                      .sort((a, b) => Number(b.negative) - Number(a.negative))
                      .map((h) => (
                        <li key={h.review.id} className="rounded-lg border border-border/60 bg-muted/50 px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium line-clamp-2">{h.review.title ?? "(sem título)"}</span>
                            {h.review.url && (
                              <a
                                href={h.review.url}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{h.review.ai_summary ?? h.review.body}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="rounded-full border border-border px-1.5 py-0.5">{h.review.source}</span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 ${
                                h.negative ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
                              }`}
                            >
                              {h.negative ? "negativa" : "não negativa"}
                            </span>
                            {h.review.rating != null && (
                              <span className="rounded-full border border-border px-1.5 py-0.5">nota {h.review.rating}</span>
                            )}
                            {h.themes.slice(0, 2).map((t) => (
                              <span key={t} className="rounded-full bg-muted/60 px-1.5 py-0.5">{t}</span>
                            ))}
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>
        </Section>
      )}


      <Section cols="grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardTitle title="Temas das reclamações" hint="Assunto citado e proporção de avaliações negativas" />
          <div className="h-[300px]">
            <ResponsiveContainer>
              <BarChart data={themeSignals} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="hsl(0 0% 100% / 0.06)" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} />
                <YAxis type="category" dataKey="theme" width={140} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="mentions" name="Menções" fill="hsl(var(--chart-3))" radius={[0, 6, 6, 0]} />
                <Bar dataKey="negatives" name="Negativas" fill="hsl(var(--destructive))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle
            title="Clusters de consumidor que mais reclamam"
            hint="Perfil inferido do texto — taxas com IC 95% (Wilson) e teste contra a taxa base da operação"
          />
          <DataTable
            rows={clusterSignals}
            rowKey={(r) => r.cluster}
            maxHeight="max-h-[300px]"
            columns={[
              { key: "cluster", header: "Cluster", width: "w-[30%]", render: (r) => <span className="font-medium">{r.cluster}</span> },
              { key: "reviews", header: "Aval.", align: "right", render: (r) => formatNumber(r.reviews) },
              {
                key: "neg",
                header: "% negativas (IC95%)",
                align: "right",
                render: (r) => <RateWithCi test={r.negTest} />,
              },
              {
                key: "sig",
                header: "vs. base",
                align: "right",
                render: (r) =>
                  r.negTest.lowSample ? (
                    <span className="text-[11px] text-muted-foreground">amostra baixa</span>
                  ) : r.negTest.significant ? (
                    <span className="text-[11px] text-destructive">
                      {r.negTest.rate > baselineNegRate ? "acima" : "abaixo"} (p&lt;0,05)
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">sem diferença</span>
                  ),
              },
              { key: "rating", header: "Nota", align: "right", render: (r) => (r.avgRating == null ? "—" : r.avgRating.toFixed(1)) },
              { key: "theme", header: "Principal dor", render: (r) => r.topTheme ?? "—" },
            ]}
          />
        </Card>


      </Section>

      <Section cols="grid-cols-1">
        <Card>
          <CardTitle title="Como ler esta análise" hint="Método e limites dos dados" />
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Áreas e temas são identificados por reconhecimento de termos no título, corpo e resumo de IA de cada
                avaliação (atrações do parque, fila/VIP, preço, reembolso, A&amp;B, manutenção, estrutura).{" "}
                <strong className="text-foreground">{pct(coverage.areaCoverage)}</strong> das avaliações citam uma área e{" "}
                <strong className="text-foreground">{pct(coverage.themeCoverage)}</strong> citam um tema.
              </span>
            </li>
            <li className="flex gap-2">
              <Gauge className="mt-0.5 size-4 shrink-0 text-accent" />
              <span>
                A correlação compara o share de rides de cada área com o share de menções e vem sempre com{" "}
                <strong className="text-foreground">IC 95% (z de Fisher)</strong> e p-valor (teste t, n−2 g.l.). Se o
                intervalo cruza zero, a relação não é distinguível de acaso — leia como “sem evidência”, não como
                ausência de efeito.
              </span>
            </li>
            <li className="flex gap-2">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Taxas de negativas por área, tema e cluster usam <strong className="text-foreground">IC 95% de Wilson</strong>{" "}
                (robusto para n pequeno) e teste z de uma proporção contra a taxa base de{" "}
                <strong className="text-foreground">{pct(baselineNegRate * 100)}</strong>. Segmentos com n &lt;{" "}
                {coverage.minSegmentN} ou intervalo maior que 40 pontos são marcados como não conclusivos.
              </span>
            </li>
            <li className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>

                {coverage.lowSample ? (
                  <>
                    Base atual de <strong className="text-foreground">{coverage.total}</strong> avaliações no período —
                    amostra pequena. Trate os números como direcionais e sincronize mais avaliações para estabilizar as
                    correlações.
                  </>
                ) : (
                  <>
                    Base de <strong className="text-foreground">{coverage.total}</strong> avaliações no período.
                  </>
                )}
              </span>
            </li>
            <li className="flex gap-2">
              <Users className="mt-0.5 size-4 shrink-0 text-success" />
              <span>
                As avaliações não têm CPF nem cadastro: o cluster é inferido do texto. Ligar reclamação a cliente real
                exigiria pesquisa pós-visita com identificação consentida.
              </span>
            </li>
          </ul>
        </Card>
      </Section>
    </>
  );
}
