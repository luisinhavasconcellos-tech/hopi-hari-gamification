import type {
  AreaSignal,
  ClusterSignal,
  ThemeSignal,
  PeriodStats,
} from "@/hooks/useReputationCorrelation";
import { formatCiPct, formatCiR, type CorrelationTest } from "@/lib/stats";

export type NarrativeTone = "neutral" | "good" | "bad" | "warning";

export type NarrativeLine = {
  id: string;
  tone: NarrativeTone;
  /** frase em linguagem natural */
  text: string;
  /** leitura estatística (IC, p-valor, tamanho de amostra) */
  stat?: string;
};

export type NarrativeInput = {
  periodLabel: string;
  segment: string;
  theme: string;
  coverage: { total: number; areaCoverage: number; themeCoverage: number; lowSample: boolean };
  volumeComplaintTest: CorrelationTest;
  volumeNegativeTest: CorrelationTest;
  comparison: {
    current: PeriodStats;
    previous: PeriodStats;
    reviewsDelta: number | null;
    negativeRateDelta: number | null;
    correlationDelta: number | null;
    comparable: boolean;
  };
  areaSignals: AreaSignal[];
  themeSignals: ThemeSignal[];
  clusterSignals: ClusterSignal[];
};

const n1 = (v: number) => v.toFixed(1).replace(".", ",");
const n2 = (v: number) => v.toFixed(2).replace(".", ",");
const pp = (v: number) => `${v > 0 ? "+" : ""}${n1(v)} p.p.`;

export function correlationStrength(r: number | null): string {
  if (r == null) return "sem correlação calculável";
  const a = Math.abs(r);
  const dir = r >= 0 ? "positiva" : "negativa";
  if (a >= 0.7) return `forte e ${dir}`;
  if (a >= 0.4) return `moderada e ${dir}`;
  if (a >= 0.2) return `fraca e ${dir}`;
  return "praticamente nula";
}

const pLabel = (p: number | null) =>
  p == null ? "p indisponível" : p < 0.001 ? "p < 0,001" : `p = ${p.toFixed(3).replace(".", ",")}`;

/**
 * Monta um resumo em linguagem natural do estado atual da correlação,
 * incluindo a leitura estatística (IC 95%, p-valor e tamanho de amostra).
 * É determinístico: as mesmas entradas geram sempre o mesmo texto.
 */
export function buildCorrelationNarrative(input: NarrativeInput): {
  headline: string;
  lines: NarrativeLine[];
  caveat: string | null;
} {
  const {
    periodLabel,
    segment,
    theme,
    coverage,
    volumeComplaintTest,
    volumeNegativeTest,
    comparison,
    areaSignals,
    themeSignals,
    clusterSignals,
  } = input;

  const scope = [
    `janela de ${periodLabel.toLowerCase()}`,
    segment === "all" ? "todos os clusters" : `cluster “${segment}”`,
    theme === "all" || theme === "todas as categorias" ? "todas as categorias" : `categorias: ${theme}`,
  ].join(" · ");

  const lines: NarrativeLine[] = [];

  // 1. correlação principal
  const r = volumeComplaintTest.r;
  if (r == null || volumeComplaintTest.n < 3) {
    lines.push({
      id: "corr",
      tone: "warning",
      text: `Não há pares suficientes de área para calcular a correlação entre volume operacional e menções nesta seleção.`,
      stat: `n = ${volumeComplaintTest.n} áreas — o teste de Pearson exige ao menos 3 pares.`,
    });
  } else {
    const sig = volumeComplaintTest.significant;
    lines.push({
      id: "corr",
      tone: sig ? (r > 0 ? "bad" : "good") : "warning",
      text: sig
        ? `A relação entre volume de embarques e menções por área é ${correlationStrength(r)} (r = ${n2(r)}): ${
            r > 0
              ? "as áreas que mais rodam também concentram mais reclamações, ou seja, boa parte do ruído é explicada por exposição."
              : "as reclamações se concentram em áreas de menor volume, o que aponta problema específico e não efeito de exposição."
          }`
        : `A relação entre volume e menções aparece como ${correlationStrength(r)} (r = ${n2(r)}), mas o intervalo de confiança cruza o zero — com esta amostra não dá para afirmar que existe relação real.`,
      stat: `IC 95% ${formatCiR(volumeComplaintTest.ci)} · ${pLabel(volumeComplaintTest.p)} · n = ${volumeComplaintTest.n} áreas.`,
    });
  }

  // 2. correlação com taxa de negativas
  if (volumeNegativeTest.r != null && volumeNegativeTest.n >= 3) {
    lines.push({
      id: "corr-neg",
      tone: volumeNegativeTest.significant ? (volumeNegativeTest.r > 0 ? "bad" : "good") : "neutral",
      text: volumeNegativeTest.significant
        ? `O volume também acompanha a severidade: quanto maior o share de embarques, ${
            volumeNegativeTest.r > 0 ? "maior" : "menor"
          } a taxa de avaliações negativas da área (r = ${n2(volumeNegativeTest.r)}).`
        : `Volume e taxa de negativas caminham de forma independente (r = ${n2(volumeNegativeTest.r)}, sem significância) — operar mais não significa, aqui, avaliar pior.`,
      stat: `IC 95% ${formatCiR(volumeNegativeTest.ci)} · ${pLabel(volumeNegativeTest.p)} · n = ${volumeNegativeTest.n} áreas com menção.`,
    });
  }

  // 3. o que mudou vs. período anterior
  const c = comparison;
  if (!c.comparable) {
    lines.push({
      id: "delta",
      tone: "warning",
      text: `A comparação com a janela anterior não é confiável: são ${c.current.reviews} avaliações agora contra ${c.previous.reviews} antes.`,
      stat: "Abaixo de 5 avaliações em qualquer das janelas, a variação é ruído.",
    });
  } else {
    const dNeg = c.negativeRateDelta;
    const dCorr = c.correlationDelta;
    const parts: string[] = [];
    if (c.reviewsDelta != null) {
      parts.push(
        `o volume de avaliações ${c.reviewsDelta >= 0 ? "subiu" : "caiu"} de ${c.previous.reviews} para ${c.current.reviews}`,
      );
    }
    if (dNeg != null) {
      parts.push(
        `a taxa de negativas ${Math.abs(dNeg) < 1 ? "ficou estável em" : dNeg > 0 ? "piorou para" : "melhorou para"} ${n1(c.current.negativeRate)}% (${pp(dNeg)})`,
      );
    }
    lines.push({
      id: "delta",
      tone: dNeg == null ? "neutral" : dNeg > 1 ? "bad" : dNeg < -1 ? "good" : "neutral",
      text: `Comparando com a janela anterior de mesmo tamanho, ${parts.join(" e ")}.`,
      stat: `Base: ${c.current.reviews} avaliações agora (${c.current.negatives} negativas) vs. ${c.previous.reviews} antes (${c.previous.negatives} negativas).`,
    });

    if (dCorr != null) {
      const moved = Math.abs(dCorr) >= 0.15;
      lines.push({
        id: "delta-corr",
        tone: moved ? (dCorr > 0 ? "bad" : "good") : "neutral",
        text: moved
          ? `A correlação em si se deslocou de ${n2(c.previous.correlation ?? 0)} para ${n2(c.current.correlation ?? 0)} (${dCorr > 0 ? "+" : ""}${n2(dCorr)}): ${
              dCorr > 0
                ? "a reclamação passou a acompanhar mais o volume, sinal de pressão operacional."
                : "a reclamação descolou do volume, sinal de problema localizado e não de fluxo."
            }`
          : `A correlação praticamente não se moveu entre as duas janelas (${n2(c.previous.correlation ?? 0)} → ${n2(c.current.correlation ?? 0)}), então a mudança de período não altera a leitura.`,
        stat: `Janela atual: ${c.current.correlationTest.label} · anterior: ${c.previous.correlationTest.label}.`,
      });
    }
  }

  // 4. área que mais desvia do volume
  const worst = [...areaSignals].filter((a) => a.mentions > 0).sort((a, b) => b.gap - a.gap)[0];
  if (worst) {
    lines.push({
      id: "area",
      tone: worst.negTest.lowSample ? "warning" : worst.gap > 0 ? "bad" : "neutral",
      text: `“${worst.area}” concentra ${n1(worst.mentionShare)}% das menções para ${n1(worst.ridesShare)}% dos embarques (gap de ${pp(worst.gap)}), com ${n1(worst.negativeRate)}% de negativas.`,
      stat: worst.negTest.lowSample
        ? `n = ${worst.negTest.n} avaliações — indicativo, ainda não conclusivo.`
        : `IC 95% da taxa de negativas: ${formatCiPct(worst.negTest.ci)} · ${
            worst.negTest.significant
              ? "acima da média da base de forma significativa"
              : "dentro do esperado para a média da base"
          }.`,
    });
  }

  // 5. tema dominante
  const topTheme = themeSignals[0];
  if (topTheme) {
    lines.push({
      id: "theme",
      tone: topTheme.negTest.lowSample ? "warning" : topTheme.negTest.significant ? "bad" : "neutral",
      text: `O tema que mais puxa o resultado é “${topTheme.theme}”: ${topTheme.negatives} negativas em ${topTheme.mentions} menções (${n1(topTheme.share)}% de tudo que foi classificado).`,
      stat: topTheme.negTest.lowSample
        ? `n = ${topTheme.negTest.n} — amostra pequena, trate como hipótese.`
        : `IC 95% ${formatCiPct(topTheme.negTest.ci)} · ${pLabel(topTheme.negTest.p)}.`,
    });
  }

  // 6. cluster crítico
  const topCluster = [...clusterSignals]
    .filter((x) => x.reviews >= 5)
    .sort((a, b) => b.negativeRate - a.negativeRate)[0];
  if (topCluster) {
    lines.push({
      id: "cluster",
      tone: topCluster.negTest.significant ? "bad" : "warning",
      text: `Entre os clusters, “${topCluster.cluster}” é o mais insatisfeito: ${n1(topCluster.negativeRate)}% de negativas em ${topCluster.reviews} avaliações${
        topCluster.topTheme ? `, reclamando sobretudo de ${topCluster.topTheme}` : ""
      }.`,
      stat: topCluster.negTest.lowSample
        ? `n = ${topCluster.negTest.n} — abaixo do mínimo recomendado (10) para conclusão.`
        : `IC 95% ${formatCiPct(topCluster.negTest.ci)} · ${pLabel(topCluster.negTest.p)} · ${
            topCluster.negTest.significant
              ? "diferença real frente à média da base"
              : "ainda dentro da variação esperada"
          }.`,
    });
  }

  const headline =
    coverage.total === 0
      ? `Sem avaliações classificadas nesta seleção (${scope}).`
      : `${coverage.total} avaliações analisadas · ${scope}. Correlação volume × menções: ${
          volumeComplaintTest.r == null ? "não calculável" : `${n2(volumeComplaintTest.r)} (${correlationStrength(volumeComplaintTest.r)})`
        }.`;

  const caveat =
    coverage.total === 0
      ? null
      : coverage.lowSample
        ? `Amostra pequena (${coverage.total} avaliações): intervalos de confiança largos e p-valores instáveis. Amplie o período antes de decidir.`
        : coverage.areaCoverage < 50
          ? `Só ${n1(coverage.areaCoverage)}% das avaliações citam uma área do parque — a correlação por área usa esse subconjunto.`
          : null;

  return { headline, lines, caveat };
}
