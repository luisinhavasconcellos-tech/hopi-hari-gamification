import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReputation, type ReputationReview } from "@/hooks/useReputation";
import {
  correlationTest,
  proportionTest,
  type CorrelationTest,
  type ProportionTest,
} from "@/lib/stats";

/**
 * Correlação entre reputação (ReclameAqui + TripAdvisor), áreas do parque
 * e clusters de consumidor.
 *
 * As avaliações não trazem CPF nem cadastro — não há como ligar review a cliente.
 * Por isso o cluster é INFERIDO do próprio texto (com quem foi, o que reclama)
 * e da localidade declarada, e é sempre exibido como proxy, nunca como identidade.
 */

export type AreaSignal = {
  area: string;
  rides: number;
  ridesShare: number;
  mentions: number;
  negatives: number;
  negativeRate: number;
  mentionShare: number;
  /** mentionShare - ridesShare: acima de 0 = reclama mais do que o volume justifica */
  gap: number;
  /** IC 95% (Wilson) e teste da taxa de negativas contra a média da base */
  negTest: ProportionTest;
};

export type ThemeSignal = {
  theme: string;
  mentions: number;
  negatives: number;
  negativeRate: number;
  share: number;
  negTest: ProportionTest;
};

export type ClusterSignal = {
  cluster: string;
  reviews: number;
  negatives: number;
  negativeRate: number;
  avgRating: number | null;
  topTheme: string | null;
  negTest: ProportionTest;
};


export type GeoSignal = {
  uf: string;
  reviews: number;
  negatives: number;
  leads: number;
  leadShare: number;
  reviewShare: number;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Léxico PT + EN — o TripAdvisor devolve muitos reviews traduzidos. */
const AREA_KEYWORDS: Record<string, string[]> = {
  Mistieri: [
    "montezum",
    "katakumb",
    "ekatomb",
    "simulakron",
    "vulaviking",
    "vurang",
    "montanha russa",
    "russian mountain",
    "roller coaster",
  ],
  "Wild West": [
    "bravo bull",
    "evolution",
    "ghost hotel",
    "mina del joe",
    "rio bravo",
    "splashi",
    "tirolesa",
    "vamvolari",
    "faroeste",
    "wild west",
  ],
  Aribabiba: [
    "aribabobbi",
    "cinemotion",
    "hadikali",
    "jambalaia",
    "katapul",
    "parangole",
    "speed",
    "vambate",
  ],
  Infantasia: [
    "astronavi",
    "bugabalum",
    "dispenkito",
    "pokoto",
    "kastel",
    "komboio",
    "lokolore",
    "toka do uga",
    "infantil",
    "kids",
    "children",
    "criancinha",
  ],
  Kaminda: ["aero venture", "gir. mundi", "girmundi", "papai noel", "kaminda", "roda gigante"],
};

const THEME_KEYWORDS: Record<string, string[]> = {
  "Filas & VIP": [
    "fila",
    "filas",
    "queue",
    "queues",
    "vip",
    "fura",
    "espera",
    "waiting",
    "horas de espera",
    "3 horas",
  ],
  "Preço & ingresso": [
    "preco",
    "preços",
    "caro",
    "expensive",
    "valor",
    "price",
    "199",
    "ingresso",
    "ticket",
    "passaporte",
    "passport",
  ],
  "Reembolso & atendimento": [
    "reembolso",
    "refund",
    "cancelamento",
    "cashback",
    "estorno",
    "sac",
    "atendimento",
    "resposta",
    "e-mail",
    "email",
    "protocolo",
  ],
  "Alimentação (A&B)": [
    "comida",
    "food",
    "lanche",
    "snack",
    "ketchup",
    "alimenta",
    "restaurante",
    "bebida",
    "drink",
    "salgad",
  ],
  "Manutenção & segurança": [
    "quebrad",
    "parado",
    "manuten",
    "problema",
    "broken",
    "lesao",
    "lesão",
    "machuc",
    "seguranca",
    "acidente",
    "injur",
  ],
  "Estrutura & limpeza": [
    "banheiro",
    "bathroom",
    "limpeza",
    "clean",
    "estrutura",
    "structure",
    "sombra",
    "ventilador",
    "calor",
    "heat",
  ],
  "Experiência & diversão": [
    "diver",
    "fun",
    "experiencia",
    "experience",
    "brinquedo",
    "toys",
    "sensacional",
    "excelente",
    "voltar",
  ],
};

const CLUSTER_KEYWORDS: Record<string, string[]> = {
  "Família com crianças": [
    "filha",
    "filho",
    "crianc",
    "children",
    "kids",
    "family",
    "familia",
    "esposa",
    "marido",
    "daughter",
    "son",
  ],
  "Excursão / grupo escolar": ["excursao", "excursão", "escola", "school", "grupo", "onibus", "ônibus", "turma"],
  "Amigos / jovens": ["amigos", "friends", "galera", "namorad", "casal", "couple"],
  Individual: [],
};

const matchAll = (text: string, dict: Record<string, string[]>) =>
  Object.entries(dict)
    .filter(([, words]) => words.some((w) => text.includes(norm(w))))
    .map(([k]) => k);

const UF_FROM_CITY: Record<string, string> = {};

export type PeriodStats = {
  reviews: number;
  negatives: number;
  negativeRate: number;
  correlation: number | null;
  correlationTest: CorrelationTest;
};

export type ClassifiedReview = {
  review: ReputationReview;
  areas: string[];
  themes: string[];
  clusters: string[];
  negative: boolean;
  city: string | null;
  at: number | null;
};

function classify(reviews: ReputationReview[]): ClassifiedReview[] {
  return reviews.map((r) => {
    const text = norm(`${r.title ?? ""} ${r.body ?? ""} ${r.ai_summary ?? ""}`);
    const areas = matchAll(text, AREA_KEYWORDS);
    const themes = matchAll(text, THEME_KEYWORDS);
    let clusters = matchAll(text, CLUSTER_KEYWORDS);
    if (clusters.length === 0) clusters = ["Individual"];
    const negative = r.sentiment === "negativo" || (r.rating != null && r.rating <= 3);
    const city = (r.location ?? "").split(",")[0]?.trim() || null;
    const at = r.published_at ? new Date(r.published_at).getTime() : null;
    return { review: r, areas, themes, clusters, negative, city, at };
  });
}

/** Sinais por área para um recorte qualquer de avaliações. */
function buildAreaSignals(
  list: ClassifiedReview[],
  areasRides: { area: string; rides: number }[],
  baseline: number,
): AreaSignal[] {
  const totalRides = areasRides.reduce((s, a) => s + a.rides, 0) || 1;
  const totalMentions = list.reduce((s, c) => s + c.areas.length, 0) || 1;
  return areasRides
    .map((a) => {
      const hits = list.filter((c) => c.areas.includes(a.area));
      const negatives = hits.filter((c) => c.negative).length;
      const ridesShare = (a.rides / totalRides) * 100;
      const mentionShare = (hits.length / totalMentions) * 100;
      return {
        area: a.area,
        rides: a.rides,
        ridesShare,
        mentions: hits.length,
        negatives,
        negativeRate: hits.length ? (negatives / hits.length) * 100 : 0,
        mentionShare,
        gap: mentionShare - ridesShare,
        negTest: proportionTest(negatives, hits.length, baseline),
      };
    })
    .sort((x, y) => y.rides - x.rides);
}

function periodStats(
  list: ClassifiedReview[],
  areasRides: { area: string; rides: number }[],
): PeriodStats {
  const negatives = list.filter((c) => c.negative).length;
  const baseline = list.length ? negatives / list.length : 0;
  const signals = buildAreaSignals(list, areasRides, baseline);
  const test = correlationTest(
    signals.map((a) => a.ridesShare),
    signals.map((a) => a.mentionShare),
  );
  return {
    reviews: list.length,
    negatives,
    negativeRate: list.length ? (negatives / list.length) * 100 : 0,
    correlation: test.r,
    correlationTest: test,
  };
}

export type PeriodSnapshot = {
  days: number;
  reviews: number;
  negatives: number;
  negativeRate: number;
  correlation: number | null;
  correlationTest: CorrelationTest;
  areas: AreaSignal[];
  themes: ThemeSignal[];
  clusters: ClusterSignal[];
};

/**
 * Filtro por tipo de reclamação. Aceita:
 * - "all" (ou lista vazia) = todas as categorias
 * - uma categoria única (string)
 * - várias categorias combinadas, com modo "any" (qualquer uma) ou "all" (todas juntas)
 */
export type ThemeFilter = { themes: string[]; mode: "any" | "all" };
export type ThemeFilterInput = string | string[] | ThemeFilter;

export const EMPTY_THEME_FILTER: ThemeFilter = { themes: [], mode: "any" };

export function normalizeThemeFilter(input: ThemeFilterInput): ThemeFilter {
  if (typeof input === "string") {
    return input === "all" || input === "" ? EMPTY_THEME_FILTER : { themes: [input], mode: "any" };
  }
  if (Array.isArray(input)) return { themes: input.filter((t) => t && t !== "all"), mode: "any" };
  return { themes: input.themes.filter((t) => t && t !== "all"), mode: input.mode };
}

/** chave estável para dependências de memo/effect */
export const themeFilterKey = (input: ThemeFilterInput) => {
  const f = normalizeThemeFilter(input);
  return `${f.mode}:${[...f.themes].sort().join("|")}`;
};

/** rótulo legível do filtro combinado */
export const themeFilterLabel = (input: ThemeFilterInput) => {
  const f = normalizeThemeFilter(input);
  if (f.themes.length === 0) return "todas as categorias";
  if (f.themes.length === 1) return f.themes[0];
  return f.themes.join(f.mode === "all" ? " + " : " ou ");
};

function themeMatcher(input: ThemeFilterInput) {
  const f = normalizeThemeFilter(input);
  if (f.themes.length === 0) return () => true;
  return (c: ClassifiedReview) =>
    f.mode === "all"
      ? f.themes.every((t) => c.themes.includes(t))
      : f.themes.some((t) => c.themes.includes(t));
}

/**
 * Recorte completo (correlação + temas + clusters) de uma janela arbitrária.
 * Usado na comparação lado a lado de dois períodos.
 */
export function buildPeriodSnapshot(
  all: ClassifiedReview[],
  areasRides: { area: string; rides: number }[],
  days: number,
  segment: string = "all",
  themeFilter: ThemeFilterInput = "all",
): PeriodSnapshot {
  const now = Date.now();
  const from = now - days * 864e5;
  const matchTheme = themeMatcher(themeFilter);
  const list = all.filter(
    (c) =>
      (segment === "all" || c.clusters.includes(segment)) &&
      matchTheme(c) &&
      (c.at == null ? days >= 365 : c.at >= from),
  );

  const stats = periodStats(list, areasRides);
  const baseline = list.length ? stats.negatives / list.length : 0;
  const areas = buildAreaSignals(list, areasRides, baseline);

  const totalThemeHits = list.reduce((s, c) => s + c.themes.length, 0) || 1;
  const themes: ThemeSignal[] = Object.keys(THEME_KEYWORDS)
    .map((theme) => {
      const hits = list.filter((c) => c.themes.includes(theme));
      const negatives = hits.filter((c) => c.negative).length;
      return {
        theme,
        mentions: hits.length,
        negatives,
        negativeRate: hits.length ? (negatives / hits.length) * 100 : 0,
        share: (hits.length / totalThemeHits) * 100,
        negTest: proportionTest(negatives, hits.length, baseline),
      };
    })
    .filter((t) => t.mentions > 0)
    .sort((a, b) => b.negatives - a.negatives || b.mentions - a.mentions);

  const clusters: ClusterSignal[] = Object.keys(CLUSTER_KEYWORDS)
    .map((cluster) => {
      const hits = list.filter((c) => c.clusters.includes(cluster));
      const negatives = hits.filter((c) => c.negative).length;
      const ratings = hits.map((h) => h.review.rating).filter((v): v is number => v != null);
      const themeCount = new Map<string, number>();
      for (const h of hits.filter((x) => x.negative)) {
        for (const t of h.themes) themeCount.set(t, (themeCount.get(t) ?? 0) + 1);
      }
      return {
        cluster,
        reviews: hits.length,
        negatives,
        negativeRate: hits.length ? (negatives / hits.length) * 100 : 0,
        avgRating: ratings.length ? ratings.reduce((s, v) => s + v, 0) / ratings.length : null,
        topTheme: [...themeCount].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
        negTest: proportionTest(negatives, hits.length, baseline),
      };
    })
    .filter((c) => c.reviews > 0)
    .sort((a, b) => b.negatives - a.negatives || b.reviews - a.reviews);

  return {
    days,
    reviews: stats.reviews,
    negatives: stats.negatives,
    negativeRate: stats.negativeRate,
    correlation: stats.correlation,
    correlationTest: stats.correlationTest,
    areas,
    themes,
    clusters,
  };
}

export const PERIOD_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: 365, label: "12 meses" },
] as const;

export const CLUSTER_OPTIONS = Object.keys(CLUSTER_KEYWORDS);

/** Tipos de reclamação (fila, VIP, preço, conforto…) usados no filtro por categoria */
export const THEME_OPTIONS = Object.keys(THEME_KEYWORDS);

export function useReputationCorrelation(
  days = 365,
  segment: string = "all",
  theme: ThemeFilterInput = "all",
) {
  const themeKey = themeFilterKey(theme);
  /** carrega sempre 12 meses para permitir comparar janelas sem refetch */
  const rep = useReputation(365);
  const [areasRides, setAreasRides] = useState<{ area: string; rides: number }[]>([]);
  const [leadUfs, setLeadUfs] = useState<{ uf: string; leads: number }[]>([]);
  const [loadingCtx, setLoadingCtx] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [attr, leads] = await Promise.all([
        supabase.from("park_attraction_monthly").select("area, rides"),
        supabase.from("crm_lead_dimensions").select("bucket_key, leads").eq("dimension", "uf"),
      ]);
      if (!alive) return;
      const acc = new Map<string, number>();
      for (const r of (attr.data ?? []) as { area: string; rides: number }[]) {
        acc.set(r.area, (acc.get(r.area) ?? 0) + (r.rides ?? 0));
      }
      setAreasRides([...acc].map(([area, rides]) => ({ area, rides })));
      setLeadUfs(
        ((leads.data ?? []) as { bucket_key: string; leads: number }[]).map((l) => ({
          uf: l.bucket_key,
          leads: l.leads,
        })),
      );
      setLoadingCtx(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const allClassified = useMemo(() => classify(rep.reviews), [rep.reviews]);

  const now = Date.now();
  const windowMs = days * 864e5;

  /** avaliações sem data entram apenas na janela de 12 meses */
  const inWindow = (c: ClassifiedReview, from: number, to: number) =>
    c.at == null ? days >= 365 && to >= now : c.at >= from && c.at < to;

  /** filtro combinado: cluster de consumidor + uma ou mais categorias de reclamação */
  const segmentFilter = useMemo(() => {
    const matchTheme = themeMatcher(theme);
    return (c: ClassifiedReview) =>
      (segment === "all" || c.clusters.includes(segment)) && matchTheme(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, themeKey]);

  const classified = useMemo(
    () => allClassified.filter((c) => inWindow(c, now - windowMs, now + 1) && segmentFilter(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allClassified, days, segmentFilter],
  );

  const previousClassified = useMemo(
    () => allClassified.filter((c) => inWindow(c, now - 2 * windowMs, now - windowMs) && segmentFilter(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allClassified, days, segmentFilter],
  );

  /** contagem por cluster na janela atual (sem o filtro de segmento) — alimenta o seletor */
  const segmentCounts = useMemo(() => {
    const inPeriod = allClassified.filter((c) => inWindow(c, now - windowMs, now + 1));
    const map = new Map<string, number>();
    for (const c of inPeriod) for (const cl of c.clusters) map.set(cl, (map.get(cl) ?? 0) + 1);
    return { total: inPeriod.length, byCluster: map };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClassified, days]);

  /** contagem por tipo de reclamação na janela atual (respeita só o cluster) — alimenta o seletor */
  const themeCounts = useMemo(() => {
    const inPeriod = allClassified.filter(
      (c) => inWindow(c, now - windowMs, now + 1) && (segment === "all" || c.clusters.includes(segment)),
    );
    const map = new Map<string, number>();
    for (const c of inPeriod) for (const t of c.themes) map.set(t, (map.get(t) ?? 0) + 1);
    return { total: inPeriod.length, byTheme: map };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClassified, days, segment]);

  const totalReviews = classified.length;

  const baselineNegRate = useMemo(
    () => (totalReviews ? classified.filter((c) => c.negative).length / totalReviews : 0),
    [classified, totalReviews],
  );

  const areaSignals: AreaSignal[] = useMemo(
    () => buildAreaSignals(classified, areasRides, baselineNegRate),
    [areasRides, classified, baselineNegRate],
  );

  const themeSignals: ThemeSignal[] = useMemo(() => {
    const total = classified.reduce((s, c) => s + c.themes.length, 0) || 1;
    return Object.keys(THEME_KEYWORDS)
      .map((theme) => {
        const hits = classified.filter((c) => c.themes.includes(theme));
        const negatives = hits.filter((c) => c.negative).length;
        return {
          theme,
          mentions: hits.length,
          negatives,
          negativeRate: hits.length ? (negatives / hits.length) * 100 : 0,
          share: (hits.length / total) * 100,
          negTest: proportionTest(negatives, hits.length, baselineNegRate),
        };
      })
      .filter((t) => t.mentions > 0)
      .sort((a, b) => b.negatives - a.negatives || b.mentions - a.mentions);
  }, [classified, baselineNegRate]);

  const clusterSignals: ClusterSignal[] = useMemo(() => {
    return Object.keys(CLUSTER_KEYWORDS)
      .map((cluster) => {
        const hits = classified.filter((c) => c.clusters.includes(cluster));
        const negatives = hits.filter((c) => c.negative).length;

        const ratings = hits.map((h) => h.review.rating).filter((v): v is number => v != null);
        const themeCount = new Map<string, number>();
        for (const h of hits.filter((x) => x.negative)) {
          for (const t of h.themes) themeCount.set(t, (themeCount.get(t) ?? 0) + 1);
        }
        const topTheme = [...themeCount].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        return {
          cluster,
          reviews: hits.length,
          negatives,
          negativeRate: hits.length ? (negatives / hits.length) * 100 : 0,
          avgRating: ratings.length ? ratings.reduce((s, v) => s + v, 0) / ratings.length : null,
          topTheme,
          negTest: proportionTest(negatives, hits.length, baselineNegRate),
        };
      })
      .filter((c) => c.reviews > 0)
      .sort((a, b) => b.negativeRate - a.negativeRate || b.negatives - a.negatives);
  }, [classified, baselineNegRate]);

  const geoSignals: GeoSignal[] = useMemo(() => {
    const byCity = new Map<string, { reviews: number; negatives: number }>();
    for (const c of classified) {
      if (!c.city) continue;
      const cur = byCity.get(c.city) ?? { reviews: 0, negatives: 0 };
      cur.reviews += 1;
      if (c.negative) cur.negatives += 1;
      byCity.set(c.city, cur);
    }
    const totalGeo = [...byCity.values()].reduce((s, v) => s + v.reviews, 0) || 1;
    return [...byCity]
      .map(([city, v]) => ({
        uf: UF_FROM_CITY[city] ?? city,
        reviews: v.reviews,
        negatives: v.negatives,
        leads: 0,
        leadShare: 0,
        reviewShare: (v.reviews / totalGeo) * 100,
      }))
      .sort((a, b) => b.reviews - a.reviews);
  }, [classified, leadUfs]);

  /** Correlação volume operacional × reclamação por área, com IC 95% e p-valor. */
  const volumeComplaintTest: CorrelationTest = useMemo(
    () =>
      correlationTest(
        areaSignals.map((a) => a.ridesShare),
        areaSignals.map((a) => a.mentionShare),
      ),
    [areaSignals],
  );

  /** Correlação share de rides × taxa de negativas por área. */
  const volumeNegativeTest: CorrelationTest = useMemo(
    () =>
      correlationTest(
        areaSignals.filter((a) => a.mentions > 0).map((a) => a.ridesShare),
        areaSignals.filter((a) => a.mentions > 0).map((a) => a.negativeRate),
      ),
    [areaSignals],
  );

  const correlationVolumeComplaints = volumeComplaintTest.r;

  /** Janela anterior de mesmo tamanho — permite ver a correlação mudando no tempo. */
  const previous: PeriodStats = useMemo(
    () => periodStats(previousClassified, areasRides),
    [previousClassified, areasRides],
  );

  const current: PeriodStats = useMemo(
    () => periodStats(classified, areasRides),
    [classified, areasRides],
  );

  const comparison = useMemo(
    () => ({
      current,
      previous,
      reviewsDelta: previous.reviews ? current.reviews - previous.reviews : null,
      negativeRateDelta: previous.reviews ? current.negativeRate - previous.negativeRate : null,
      correlationDelta:
        current.correlation != null && previous.correlation != null
          ? current.correlation - previous.correlation
          : null,
      comparable: previous.reviews >= 5 && current.reviews >= 5,
    }),
    [current, previous],
  );

  /** Série da correlação e da taxa de negativas por sub-janela (para ver a evolução). */
  const trend = useMemo(() => {
    const buckets = days <= 7 ? 7 : days <= 30 ? 6 : days <= 90 ? 6 : 12;
    const size = windowMs / buckets;
    const out: { label: string; correlation: number | null; negativeRate: number; reviews: number }[] = [];
    for (let i = buckets - 1; i >= 0; i--) {
      const to = now - i * size;
      const from = to - size;
      const list = allClassified.filter(
        (c) => c.at != null && c.at >= from && c.at < to && segmentFilter(c),
      );
      const st = periodStats(list, areasRides);
      out.push({
        label: new Date(to).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        correlation: st.correlation,
        negativeRate: st.negativeRate,
        reviews: st.reviews,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClassified, areasRides, days, segmentFilter]);

  const coverage = useMemo(() => {
    const withArea = classified.filter((c) => c.areas.length > 0).length;
    const withTheme = classified.filter((c) => c.themes.length > 0).length;
    return {
      total: totalReviews,
      withArea,
      withTheme,
      areaCoverage: totalReviews ? (withArea / totalReviews) * 100 : 0,
      themeCoverage: totalReviews ? (withTheme / totalReviews) * 100 : 0,
      lowSample: totalReviews < 30,
      baselineNegRate,
      /** nenhum sinal por segmento é conclusivo abaixo deste n */
      minSegmentN: 10,
      significantSegments: 0,
    };
  }, [classified, totalReviews, baselineNegRate]);

  return {
    loading: rep.loading || loadingCtx,
    syncing: rep.syncing,
    sync: rep.sync,
    reviews: rep.reviews,
    classified,
    /** 12 meses completos, sem filtro de período/segmento — usado por drill-downs com janela própria */
    allClassified,
    areasRides,
    areaSignals,
    themeSignals,
    clusterSignals,
    geoSignals,
    correlationVolumeComplaints,
    volumeComplaintTest,
    volumeNegativeTest,
    baselineNegRate,
    coverage,
    comparison,
    trend,
    segmentCounts,
    themeCounts,
  };
}
