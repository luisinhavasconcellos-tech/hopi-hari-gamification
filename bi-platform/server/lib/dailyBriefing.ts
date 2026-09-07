import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { getDailyBriefingByDate, upsertDailyBriefing } from "../db";
import { collectBiSnapshot, type BiSnapshot } from "./biSnapshot";
import { getCampaignSalesCorrelation } from "./campaignSalesCorrelation";
import { getHoraDoHorrorCorrelation } from "./horaDoHorrorCorrelation";

export const BRIEFING_MODEL = "gpt-5-mini";

const metricSchema = z.object({
  label: z.string().max(40),
  value: z.string().max(40),
  context: z.string().max(80),
});

const sectionSchema = z.object({
  key: z.enum(["sales", "attendance", "audience", "social", "crm", "reputation", "campaigns"]),
  title: z.string().max(40),
  status: z.enum(["positive", "attention", "neutral", "unavailable"]),
  narrative: z.string().max(100),
  metrics: z.array(metricSchema).max(0),
});

const briefingSchema = z.object({
  title: z.string().max(80),
  executiveSummary: z.string().max(240),
  narration: z.string().max(620),
  sections: z.array(sectionSchema).min(7).max(7),
  priorities: z
    .array(
      z.object({
        title: z.string().max(50),
        reason: z.string().max(100),
        ownerArea: z.string().max(40),
        urgency: z.enum(["today", "this_week", "monitor"]),
      }),
    )
    .max(1),
});

export type GeneratedBriefing = z.infer<typeof briefingSchema>;

const structuredSchema = {
  type: "object",
  properties: {
    title: { type: "string", maxLength: 80 },
    executiveSummary: { type: "string", maxLength: 240 },
    narration: { type: "string", maxLength: 620 },
    sections: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          key: {
            type: "string",
            enum: ["sales", "attendance", "audience", "social", "crm", "reputation", "campaigns"],
          },
          title: { type: "string", maxLength: 40 },
          status: { type: "string", enum: ["positive", "attention", "neutral", "unavailable"] },
          narrative: { type: "string", maxLength: 100 },
          metrics: {
            type: "array",
            maxItems: 0,
            items: {
              type: "object",
              properties: {
                label: { type: "string", maxLength: 40 },
                value: { type: "string", maxLength: 40 },
                context: { type: "string", maxLength: 80 },
              },
              required: ["label", "value", "context"],
              additionalProperties: false,
            },
          },
        },
        required: ["key", "title", "status", "narrative", "metrics"],
        additionalProperties: false,
      },
    },
    priorities: {
      type: "array",
      maxItems: 1,
      items: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 50 },
          reason: { type: "string", maxLength: 100 },
          ownerArea: { type: "string", maxLength: 40 },
          urgency: { type: "string", enum: ["today", "this_week", "monitor"] },
        },
        required: ["title", "reason", "ownerArea", "urgency"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "executiveSummary", "narration", "sections", "priorities"],
  additionalProperties: false,
} as const;

export type CorrelationDigest = {
  horaDoHorror: {
    officialCampaigns: Array<{ edition: string; periodStart: string; periodEnd: string; status: string; creativeCount: number }>;
    correlations: Array<{
      platform: string;
      socialMetric: string;
      status: string;
      observedDays: number;
      minimumDays: number;
      coefficient: number | null;
      direction: string | null;
      latestSocialDate: string | null;
    }>;
  } | null;
  campaignSales: {
    salesCoverage: { observedDays: number; firstDate: string | null; lastDate: string | null };
    summary: { totalCampaigns: number; campaignsWithDates: number; readyCampaigns: number; assetRevenueCorrelation: number | null };
    readyCampaigns: Array<{
      name: string;
      periodStart: string | null;
      periodEnd: string | null;
      deltas: Record<string, number | null> | null;
    }>;
  } | null;
} | null;

export type BriefingSnapshot = BiSnapshot & { correlations?: CorrelationDigest };

export async function collectCorrelationDigest(): Promise<CorrelationDigest> {
  const [horror, campaigns] = await Promise.all([
    getHoraDoHorrorCorrelation().catch(() => null),
    getCampaignSalesCorrelation().catch(() => null),
  ]);
  if (!horror && !campaigns) return null;
  return {
    horaDoHorror: horror
      ? {
          officialCampaigns: horror.officialCampaigns.map(campaign => ({
            edition: campaign.edition,
            periodStart: campaign.periodStart,
            periodEnd: campaign.periodEnd,
            status: campaign.status,
            creativeCount: campaign.creativeCount,
          })),
          correlations: horror.correlations.map(item => ({
            platform: item.platform,
            socialMetric: item.socialMetric,
            status: item.status,
            observedDays: item.observedDays,
            minimumDays: item.minimumDays,
            coefficient: item.coefficient,
            direction: item.direction,
            latestSocialDate: item.latestSocialDate,
          })),
        }
      : null,
    campaignSales: campaigns
      ? {
          salesCoverage: campaigns.salesCoverage,
          summary: campaigns.summary,
          readyCampaigns: campaigns.campaigns
            .filter(campaign => campaign.status === "ready")
            .map(campaign => ({
              name: campaign.name,
              periodStart: campaign.periodStart,
              periodEnd: campaign.periodEnd,
              deltas: campaign.deltas,
            })),
        }
      : null,
  };
}

export function reportDateInSaoPaulo(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function parseGeneratedBriefing(content: string) {
  return briefingSchema.parse(JSON.parse(content));
}

const NUMBER_PATTERN = /(?<!\d)-?\d+(?:[.,]\d+)*/g;

function numericCandidates(token: string) {
  const compact = token.replace(/\s/g, "");
  const values = new Set<number>();
  const add = (value: string) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) values.add(parsed);
  };
  add(compact);
  if (compact.includes(",") && compact.includes(".")) {
    add(compact.replace(/\./g, "").replace(",", "."));
    add(compact.replace(/,/g, ""));
  } else if (compact.includes(",")) {
    add(compact.replace(",", "."));
    add(compact.replace(/,/g, ""));
  } else if (/^-?\d+\.\d{3}$/.test(compact)) {
    add(compact.replace(".", ""));
  }
  return [...values];
}

function collectSnapshotNumbers(value: unknown, target: number[]) {
  if (typeof value === "number" && Number.isFinite(value)) {
    target.push(value);
    return;
  }
  if (typeof value === "string") {
    for (const token of value.match(NUMBER_PATTERN) ?? []) target.push(...numericCandidates(token));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectSnapshotNumbers(item, target));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach(item => collectSnapshotNumbers(item, target));
  }
}

function generatedText(briefing: GeneratedBriefing) {
  return [
    briefing.title,
    briefing.executiveSummary,
    briefing.narration,
    ...briefing.sections.flatMap(section => [
      section.title,
      section.narrative,
      ...section.metrics.flatMap(metric => [metric.label, metric.value, metric.context]),
    ]),
    ...briefing.priorities.flatMap(priority => [priority.title, priority.reason, priority.ownerArea]),
  ].join("\n");
}

function allowedSnapshotNumbers(snapshot: BriefingSnapshot) {
  const allowed: number[] = [];
  collectSnapshotNumbers(snapshot, allowed);
  return allowed;
}

function unsupportedNumber(token: string, allowed: number[]) {
  return numericCandidates(token).every(
    candidate => !allowed.some(value => Math.abs(value - candidate) < 0.000001),
  );
}

export function sanitizeBriefingGrounding(briefing: GeneratedBriefing, snapshot: BriefingSnapshot) {
  const allowed = allowedSnapshotNumbers(snapshot);
  const clean = (value: string) =>
    value
      .replace(NUMBER_PATTERN, token => (unsupportedNumber(token, allowed) ? "" : token))
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([.,;:])/g, "$1")
      .trim();
  const unavailable = new Set(
    snapshot.coverage.warnings.map(warning => warning.split(":", 1)[0]),
  );

  return briefingSchema.parse({
    ...briefing,
    title: clean(briefing.title),
    executiveSummary: clean(briefing.executiveSummary),
    narration: clean(briefing.narration),
    sections: briefing.sections.map(section => {
      const sourcesByDomain: Record<typeof section.key, string[]> = {
        sales: ["sales", "websiteSales"],
        attendance: ["attendance"],
        audience: ["followers"],
        social: ["instagram", "facebook", "tiktok"],
        crm: ["crm"],
        reputation: ["reputation"],
        campaigns: ["campaigns", "driveCampaigns"],
      };
      const forceUnavailable = sourcesByDomain[section.key].some(source => unavailable.has(source));
      return {
        ...section,
        title: clean(section.title),
        narrative: clean(section.narrative),
        status: forceUnavailable ? "unavailable" : section.status,
        metrics: section.metrics.map(metric => ({
          label: clean(metric.label),
          value: clean(metric.value),
          context: clean(metric.context),
        })),
      };
    }),
    priorities: briefing.priorities.map(priority => ({
      ...priority,
      title: clean(priority.title),
      reason: clean(priority.reason),
      ownerArea: clean(priority.ownerArea),
    })),
  });
}

export function validateBriefingGrounding(briefing: GeneratedBriefing, snapshot: BriefingSnapshot) {
  const allowed = allowedSnapshotNumbers(snapshot);
  const claims = generatedText(briefing).match(NUMBER_PATTERN) ?? [];
  const unsupportedNumbers = claims.filter(token => unsupportedNumber(token, allowed));

  const sourceToDomain: Record<string, GeneratedBriefing["sections"][number]["key"]> = {
    sales: "sales",
    attendance: "attendance",
    followers: "audience",
    instagram: "social",
    facebook: "social",
    tiktok: "social",
    crm: "crm",
    reputation: "reputation",
    campaigns: "campaigns",
    driveCampaigns: "campaigns",
    websiteSales: "sales",
  };
  const requiredUnavailable = new Set(
    snapshot.coverage.warnings
      .map(warning => sourceToDomain[warning.split(":", 1)[0]])
      .filter((value): value is GeneratedBriefing["sections"][number]["key"] => Boolean(value)),
  );
  const invalidAvailability = [...requiredUnavailable].filter(
    key => briefing.sections.find(section => section.key === key)?.status !== "unavailable",
  );

  if (unsupportedNumbers.length || invalidAvailability.length) {
    throw new Error(
      `Briefing grounding validation failed: unsupported_numbers=${[...new Set(unsupportedNumbers)].join(",") || "none"}; invalid_unavailable_sections=${invalidAvailability.join(",") || "none"}`,
    );
  }
}

export async function generateDailyBriefing(options: { force?: boolean } = {}) {
  const reportDate = reportDateInSaoPaulo();
  if (!options.force) {
    const existing = await getDailyBriefingByDate(reportDate);
    if (existing?.status === "ready") return existing;
  }

  const snapshot: BriefingSnapshot = {
    ...(await collectBiSnapshot()),
    correlations: await collectCorrelationDigest(),
  };
  let generated: GeneratedBriefing | null = null;
  let responseModel = BRIEFING_MODEL;
  let correction = "";
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await invokeLLM({
      model: BRIEFING_MODEL,
      reasoning: { effort: "minimal" },
      max_tokens: 5000,
      messages: [
        {
          role: "system",
          content:
            "Você é o redator do briefing executivo interno do Hopi Hari. Produza texto compacto em português do Brasil, direto e operacional, usando exclusivamente valores presentes no snapshot. Nunca invente números, metas, causas, tendências ou conclusões. Use algarismos somente para valores que aparecem literalmente no snapshot; prefira palavras para contagens editoriais. Quando uma fonte estiver ausente, marque a seção como unavailable e nunca cite valores dela como se existissem. Diferencie fato medido de recomendação. Respeite rigorosamente os limites do schema. Mantenha metrics vazio em todas as seções; os indicadores serão exibidos de forma determinística pela interface. A narração é um roteiro de áudio de cerca de quarenta segundos e segue regras próprias: voz editorial elegante, calma e confiante, com frases fluidas e transições naturais, sem markdown e sem listas. Na narração, não recite sequências de números: evite algarismos e cifras, descreva grandezas com palavras e apenas quando o valor existir no snapshot, e jamais mencione um valor que você não conhece. Construa a narração em três movimentos: uma abertura breve que situa o dia do parque; um desenvolvimento que conecta as campanhas recentes — especialmente as edições oficiais da Hora do Horror presentes em correlations — ao comportamento do faturamento e do público, relatando as associações observadas, sua direção e o que ainda aguarda amostra mínima, sempre como associação e nunca como causalidade; e um fechamento com a prioridade do dia. Se correlations indicar amostra insuficiente, diga com naturalidade que a janela de evidência ainda está se formando, sem inventar resultados.",
        },
        {
          role: "user",
          content: `Gere o briefing diário de ${reportDate}. Preserve exatamente sete seções, uma para cada domínio. Priorize mudanças relevantes, alertas verificáveis e ações proporcionais às evidências. Na narração, privilegie a leitura das correlações entre campanhas recentes e desempenho diário descritas no bloco correlations, em vez de repetir números soltos.${correction}\nSnapshot JSON:\n${JSON.stringify(snapshot)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "hopi_hari_daily_briefing", strict: true, schema: structuredSchema },
      },
    });

    responseModel = response.model || BRIEFING_MODEL;
    try {
      const content = response.choices[0]?.message.content;
      if (typeof content !== "string") throw new Error("The briefing model returned no structured content");
      const candidate = sanitizeBriefingGrounding(parseGeneratedBriefing(content), snapshot);
      validateBriefingGrounding(candidate, snapshot);
      generated = candidate;
      break;
    } catch (error) {
      lastError = error;
      correction = `\nA tentativa anterior foi rejeitada pelo validador determinístico: ${error instanceof Error ? error.message : "resultado inválido"}. Reescreva do zero e elimine toda alegação numérica que não esteja literalmente no snapshot.`;
    }
  }

  if (!generated) throw lastError instanceof Error ? lastError : new Error("Unable to generate a grounded briefing");

  return upsertDailyBriefing({
    reportDate,
    title: generated.title,
    executiveSummary: generated.executiveSummary,
    narration: generated.narration,
    sectionsJson: JSON.stringify({ sections: generated.sections, priorities: generated.priorities }),
    sourceSnapshotJson: JSON.stringify(snapshot),
    model: responseModel,
    xStatus: snapshot.social.x.available ? "ready" : snapshot.social.x.reason || "unavailable",
    status: "ready",
    generatedAt: new Date(),
  });
}
